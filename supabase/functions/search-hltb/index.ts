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

    // Find all game entries using multiple approaches
    const gameMatches = []
    
    // Method 1: Look for specific game card structures
    const gameCardPattern = /<li[^>]*class="[^"]*back_primary[^"]*"[^>]*>.*?href="\/game\/(\d+)".*?<p[^>]*>([^<]+)<\/p>/gs
    let match
    
    while ((match = gameCardPattern.exec(html)) !== null) {
      const gameId = parseInt(match[1])
      let gameTitle = match[2].trim()
      
      if (gameTitle && gameTitle.length > 2 && !gameMatches.some(g => g.id === gameId)) {
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
    
    // Method 2: Alternative pattern for game links with titles
    if (gameMatches.length === 0) {
      const altPattern = /href="\/game\/(\d+)"[^>]*>.*?<p[^>]*title="([^"]*)"[^>]*>([^<]+)<\/p>/gs
      while ((match = altPattern.exec(html)) !== null) {
        const gameId = parseInt(match[1])
        let gameTitle = match[3] || match[2]
        gameTitle = gameTitle.trim()
        
        if (gameTitle && gameTitle.length > 2 && !gameMatches.some(g => g.id === gameId)) {
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
    
    // Method 3: Fallback - look for any game links and extract context
    if (gameMatches.length === 0) {
      const basicPattern = /href="\/game\/(\d+)"/g
      while ((match = basicPattern.exec(html)) !== null) {
        const gameId = parseInt(match[1])
        const contextStart = Math.max(0, match.index - 300)
        const contextEnd = Math.min(html.length, match.index + 300)
        const context = html.substring(contextStart, contextEnd)
        
        // Look for titles in various formats
        const titlePatterns = [
          /<p[^>]*>([^<]{3,60})<\/p>/g,
          /<h\d[^>]*>([^<]{3,60})<\/h\d>/g,
          /title="([^"]{3,60})"/g,
          /<div[^>]*>([A-Za-z0-9][^<]{2,50})<\/div>/g
        ]
        
        let gameTitle = null
        for (const pattern of titlePatterns) {
          let titleMatch
          while ((titleMatch = pattern.exec(context)) !== null) {
            const candidate = titleMatch[1].trim()
            // Filter out obvious non-game-title text
            if (candidate.length > 2 && 
                !candidate.match(/^\d+$/) && 
                !candidate.includes('http') &&
                !candidate.includes('Hours') &&
                !candidate.includes('Main') &&
                candidate.match(/[A-Za-z]/)) {
              gameTitle = candidate
              break
            }
          }
          if (gameTitle) break
        }
        
        if (gameTitle && !gameMatches.some(g => g.id === gameId)) {
          gameMatches.push({
            id: gameId,
            title: gameTitle,
            url: `https://howlongtobeat.com/game/${gameId}`,
            imageUrl: null,
            mainStory: 0,
            platforms: ''
          })
        }
        
        if (gameMatches.length >= 10) break // Limit results
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
