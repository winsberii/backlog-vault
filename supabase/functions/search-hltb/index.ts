import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { gameTitle } = await req.json()
    
    if (!gameTitle) {
      throw new Error('Game title is required')
    }

    console.log('Searching HowLongToBeat for:', gameTitle)

    // Try the main search URL
    const searchUrl = `https://howlongtobeat.com/?q=${encodeURIComponent(gameTitle.trim())}`
    console.log('Fetching URL:', searchUrl)
    
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Referer': 'https://howlongtobeat.com/',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      }
    })

    if (!response.ok) {
      console.log('Search request failed with status:', response.status)
      throw new Error(`HTTP ${response.status}`)
    }

    const html = await response.text()
    console.log('HTML received, length:', html.length)

    // Simple pattern to find game links - look for the most common pattern
    const gameMatches = []
    const gamePattern = /href="\/game\/(\d+)"[^>]*(?:title="([^"]*)")?/g
    let match

    while ((match = gamePattern.exec(html)) !== null) {
      const gameId = parseInt(match[1])
      let gameTitle = match[2] || null
      
      // If no title in the href, look for nearby title in the HTML context
      if (!gameTitle) {
        const contextStart = Math.max(0, match.index - 200)
        const contextEnd = Math.min(html.length, match.index + 200)
        const context = html.substring(contextStart, contextEnd)
        
        // Look for title patterns in the context
        const titlePatterns = [
          /<h3[^>]*>([^<]+)<\/h3>/,
          /title="([^"]+)"/,
          /<div[^>]*class="[^"]*title[^"]*"[^>]*>([^<]+)<\/div>/,
          />([^<]{5,50})</
        ]
        
        for (const titlePattern of titlePatterns) {
          const titleMatch = context.match(titlePattern)
          if (titleMatch && titleMatch[1] && titleMatch[1].trim().length > 3) {
            gameTitle = titleMatch[1].trim()
            break
          }
        }
      }
      
      if (gameTitle && gameTitle.length > 2) {
        // Clean up the title
        gameTitle = gameTitle.replace(/\s+/g, ' ').trim()
        gameTitle = gameTitle.replace(/^[^\w\s]+|[^\w\s]+$/g, '') // Remove leading/trailing special chars
        
        // Check if already added
        if (!gameMatches.some(g => g.id === gameId) && gameTitle.length > 2) {
          gameMatches.push({
            id: gameId,
            title: gameTitle,
            url: `https://howlongtobeat.com/game/${gameId}`,
            imageUrl: null,
            mainStory: 0,
            platforms: ''
          })
        }
      }
    }

    console.log(`Found ${gameMatches.length} total games`)

    if (gameMatches.length === 0) {
      console.log('No games found in HTML, returning manual search')
      return new Response(
        JSON.stringify({
          success: true,
          games: [{
            id: Date.now(),
            title: `Search "${gameTitle}" manually`,
            url: searchUrl,
            imageUrl: null,
            mainStory: 0,
            platforms: '',
            note: 'Click to search manually on HowLongToBeat.com'
          }],
          note: 'No games found automatically. Manual search link provided.'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    // Filter games by relevance to search term
    const searchTermLower = gameTitle.toLowerCase().trim()
    const relevantGames = gameMatches.filter(game => {
      const titleLower = game.title.toLowerCase()
      
      // Exact match (highest priority)
      if (titleLower === searchTermLower) return true
      
      // Contains search term
      if (titleLower.includes(searchTermLower)) return true
      
      // Search term contains game title (for shorter titles)
      if (searchTermLower.includes(titleLower)) return true
      
      // Word-by-word matching for compound searches like "Call of Duty 2"
      const searchWords = searchTermLower.split(' ').filter(word => word.length > 2)
      const titleWords = titleLower.split(' ').filter(word => word.length > 2)
      
      // Check if most search words are in the title
      const matchingWords = searchWords.filter(searchWord => 
        titleWords.some(titleWord => titleWord.includes(searchWord) || searchWord.includes(titleWord))
      )
      
      return matchingWords.length >= Math.min(2, searchWords.length)
    })

    // Sort by relevance
    relevantGames.sort((a, b) => {
      const aLower = a.title.toLowerCase()
      const bLower = b.title.toLowerCase()
      
      // Exact matches first
      if (aLower === searchTermLower && bLower !== searchTermLower) return -1
      if (bLower === searchTermLower && aLower !== searchTermLower) return 1
      
      // Then by how well they match
      const aMatches = aLower.includes(searchTermLower)
      const bMatches = bLower.includes(searchTermLower)
      
      if (aMatches && !bMatches) return -1
      if (bMatches && !aMatches) return 1
      
      return a.title.localeCompare(b.title)
    })

    const finalGames = relevantGames.length > 0 ? relevantGames.slice(0, 10) : gameMatches.slice(0, 5)
    
    console.log(`Returning ${finalGames.length} games:`, finalGames.map(g => `${g.title} (${g.id})`))

    return new Response(
      JSON.stringify({
        success: true,
        games: finalGames
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error searching HLTB:', error.message)
    console.error('Stack trace:', error.stack)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Search temporarily unavailable',
        games: []
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
