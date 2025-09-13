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

    // Try direct search page approach first (most reliable)
    try {
      const searchUrl = `https://howlongtobeat.com/?q=${encodeURIComponent(gameTitle.trim())}`
      console.log('Searching URL:', searchUrl)
      
      const response = await fetch(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        }
      })

      if (response.ok) {
        const html = await response.text()
        console.log('HTML response received, length:', html.length)
        
        const games = parseSearchResults(html, gameTitle)
        
        if (games && games.length > 0) {
          console.log('Found games via direct search:', games)
          return new Response(
            JSON.stringify({
              success: true,
              games: games
            }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 200,
            }
          )
        }
      } else {
        console.log('Direct search failed with status:', response.status)
      }
    } catch (searchError) {
      console.error('Direct search method failed:', searchError)
    }

    // If direct search fails, try alternative search URLs
    const alternativeUrls = [
      `https://howlongtobeat.com/search?q=${encodeURIComponent(gameTitle)}`,
      `https://howlongtobeat.com/games?q=${encodeURIComponent(gameTitle)}`,
    ]

    for (const url of alternativeUrls) {
      try {
        console.log('Trying alternative URL:', url)
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Cache-Control': 'no-cache'
          }
        })

        if (response.ok) {
          const html = await response.text()
          const games = parseSearchResults(html, gameTitle)
          
          if (games && games.length > 0) {
            console.log('Found games via alternative URL:', games)
            return new Response(
              JSON.stringify({
                success: true,
                games: games
              }),
              {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
              }
            )
          }
        }
      } catch (altError) {
        console.error('Alternative URL failed:', altError)
        continue
      }
    }

    // If all parsing fails, return a manual search option
    console.log('All search methods failed, returning manual search link')
    const fallbackGame = {
      id: Date.now(),
      title: `Search "${gameTitle}" manually`,
      url: `https://howlongtobeat.com/?q=${encodeURIComponent(gameTitle)}`,
      imageUrl: null,
      mainStory: 0,
      platforms: '',
      note: 'Click to search manually on HowLongToBeat.com'
    }

    return new Response(
      JSON.stringify({
        success: true,
        games: [fallbackGame],
        note: 'Automated search failed. Manual search link provided.'
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

// Simplified and more reliable search approach
function parseSearchResults(html: string, searchTerm: string): any[] {
  console.log('Parsing HTML for search results, length:', html.length)
  console.log('Search term:', searchTerm)
  
  const games: any[] = []
  const searchTermLower = searchTerm.toLowerCase().trim()
  
  // Look for game links and extract titles from the surrounding context
  // This pattern looks for URLs and then tries to find the game title nearby
  const gameLinks = []
  const urlPattern = /href="\/game\/(\d+)"/g
  let match
  
  while ((match = urlPattern.exec(html)) !== null) {
    const gameId = parseInt(match[1])
    const linkPosition = match.index
    
    // Extract context around the link (500 characters before and after)
    const contextStart = Math.max(0, linkPosition - 500)
    const contextEnd = Math.min(html.length, linkPosition + 500)
    const context = html.substring(contextStart, contextEnd)
    
    // Look for game titles in various formats within this context
    const titlePatterns = [
      /<h3[^>]*>([^<]+)<\/h3>/g,
      /title="([^"]+)"/g,
      /<div[^>]*class="[^"]*game[^"]*"[^>]*>([^<]+)<\/div>/g,
      /<span[^>]*class="[^"]*title[^"]*"[^>]*>([^<]+)<\/span>/g,
      /alt="([^"]+)"/g
    ]
    
    let gameTitle = null
    for (const titlePattern of titlePatterns) {
      titlePattern.lastIndex = 0
      const titleMatch = titlePattern.exec(context)
      if (titleMatch && titleMatch[1] && titleMatch[1].trim().length > 2) {
        gameTitle = titleMatch[1].trim()
        break
      }
    }
    
    // If no title found in patterns, try to extract from nearby text
    if (!gameTitle) {
      // Look for text nodes that might contain the game title
      const textPattern = />([^<]{3,50})</g
      textPattern.lastIndex = 0
      let textMatch
      const potentialTitles = []
      
      while ((textMatch = textPattern.exec(context)) !== null) {
        const text = textMatch[1].trim()
        if (text.length > 2 && text.length < 50 && !/^\d+$/.test(text) && !text.includes('href')) {
          potentialTitles.push(text)
        }
      }
      
      // Pick the most likely title (longest reasonable string)
      gameTitle = potentialTitles.reduce((best, current) => 
        (!best || (current.length > best.length && current.length < 50)) ? current : best, null
      )
    }
    
    if (gameTitle && gameTitle.length > 2) {
      // Clean up the title
      gameTitle = gameTitle.replace(/\s+/g, ' ').trim()
      gameTitle = gameTitle.replace(/^[^\w\s]+|[^\w\s]+$/g, '') // Remove leading/trailing special chars
      
      // Check if this title is relevant to the search term
      const titleLower = gameTitle.toLowerCase()
      const isRelevant = titleLower.includes(searchTermLower) ||
                        searchTermLower.includes(titleLower) ||
                        searchTermLower.split(' ').some(term => 
                          term.length > 2 && titleLower.includes(term)
                        )
      
      if (isRelevant && !gameLinks.some(g => g.id === gameId)) {
        gameLinks.push({
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
  
  // Sort by relevance (exact matches first, then partial matches)
  gameLinks.sort((a, b) => {
    const aLower = a.title.toLowerCase()
    const bLower = b.title.toLowerCase()
    
    const aExact = aLower === searchTermLower
    const bExact = bLower === searchTermLower
    
    if (aExact && !bExact) return -1
    if (!aExact && bExact) return 1
    
    const aContains = aLower.includes(searchTermLower)
    const bContains = bLower.includes(searchTermLower)
    
    if (aContains && !bContains) return -1
    if (!aContains && bContains) return 1
    
    return a.title.localeCompare(b.title)
  })
  
  const finalResults = gameLinks.slice(0, 10)
  console.log(`Found ${finalResults.length} relevant games:`, finalResults.map(g => `${g.title} (${g.id})`))
  
  return finalResults
}