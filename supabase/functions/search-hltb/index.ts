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

    // Try multiple search approaches
    const searchMethods = [
      // Method 1: Try the search page with direct HTML parsing
      async () => {
        const searchUrl = `https://howlongtobeat.com/?q=${encodeURIComponent(gameTitle)}`
        console.log('Trying search URL:', searchUrl)
        
        const response = await fetch(searchUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        })

        if (response.ok) {
          const html = await response.text()
          return parseSearchResults(html, gameTitle)
        }
        return null
      },

      // Method 2: Try the games search endpoint
      async () => {
        console.log('Trying games search endpoint')
        const searchUrl = `https://howlongtobeat.com/games?q=${encodeURIComponent(gameTitle)}`
        
        const response = await fetch(searchUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Cache-Control': 'no-cache'
          }
        })

        if (response.ok) {
          const html = await response.text()
          return parseSearchResults(html, gameTitle)
        }
        return null
      }
    ]

    // Try each search method until one works
    for (const searchMethod of searchMethods) {
      try {
        const result = await searchMethod()
        if (result && result.length > 0) {
          console.log('Found games using search method:', result)
          return new Response(
            JSON.stringify({
              success: true,
              games: result
            }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 200,
            }
          )
        }
      } catch (methodError) {
        console.error('Search method failed:', methodError)
        continue
      }
    }

    // If all methods fail, return a helpful response
    console.log('All search methods failed, returning manual search option')
    const fallbackGame = {
      id: Date.now(),
      title: `Search for "${gameTitle}" on HowLongToBeat`,
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

// Enhanced HTML parsing function
function parseSearchResults(html: string, searchTerm: string): any[] {
  console.log('Parsing HTML for search results, length:', html.length)
  
  const games: any[] = []
  const searchTermLower = searchTerm.toLowerCase()
  
  // Enhanced patterns to find game links and data
  const patterns = [
    // Pattern for game cards with data attributes
    /<div[^>]*class="[^"]*search_list_details[^"]*"[^>]*>[\s\S]*?<a[^>]*href="\/game\/(\d+)"[^>]*title="([^"]*)"[\s\S]*?<\/div>/g,
    
    // Pattern for direct game links with titles
    /<a[^>]*href="\/game\/(\d+)"[^>]*>[\s\S]*?<div[^>]*class="[^"]*search_list_details_block[^"]*"[^>]*>[\s\S]*?<h3[^>]*>([^<]+)<\/h3>/g,
    
    // Simple game link pattern
    /<a[^>]*href="\/game\/(\d+)"[^>]*title="([^"]+)"/g,
    
    // Pattern for game names and IDs in search results
    /data-game-id="(\d+)"[\s\S]*?<h3[^>]*>([^<]+)<\/h3>/g,
    
    // Alternative pattern for search list items
    /<li[^>]*class="[^"]*back_darkish[^"]*"[^>]*>[\s\S]*?href="\/game\/(\d+)"[\s\S]*?>([^<]+)</g
  ]
  
  for (const pattern of patterns) {
    pattern.lastIndex = 0
    let match
    
    while ((match = pattern.exec(html)) !== null && games.length < 15) {
      const gameId = match[1]
      let gameTitle = match[2]?.trim()
      
      // Clean up the title
      if (gameTitle) {
        gameTitle = gameTitle.replace(/\s+/g, ' ').trim()
        gameTitle = gameTitle.replace(/^[^\w]+|[^\w]+$/g, '') // Remove leading/trailing non-word chars
      }
      
      // Skip invalid entries
      if (!gameId || !gameTitle || gameTitle.length < 2) continue
      
      // Skip duplicates
      if (games.some(g => g.id === parseInt(gameId))) continue
      
      // Try to extract additional data from surrounding HTML
      const gameData = {
        id: parseInt(gameId),
        title: gameTitle,
        url: `https://howlongtobeat.com/game/${gameId}`,
        imageUrl: null,
        mainStory: 0,
        platforms: ''
      }
      
      // Try to extract image URL
      const imgMatch = html.match(new RegExp(`game\/${gameId}[\\s\\S]*?<img[^>]*src="([^"]+)"`))
      if (imgMatch && imgMatch[1]) {
        gameData.imageUrl = imgMatch[1].startsWith('http') ? imgMatch[1] : `https://howlongtobeat.com${imgMatch[1]}`
      }
      
      // Try to extract playtime
      const timeMatch = html.match(new RegExp(`game\/${gameId}[\\s\\S]*?(\\d+)(?:\\s*½)?\\s*Hour`))
      if (timeMatch && timeMatch[1]) {
        gameData.mainStory = parseInt(timeMatch[1])
      }
      
      games.push(gameData)
    }
    
    if (games.length > 0) {
      console.log(`Found ${games.length} games using pattern`)
      break
    }
  }
  
  if (games.length === 0) {
    // Last resort: look for any game links in the page
    const fallbackPattern = /href="\/game\/(\d+)"/g
    const gameIds = new Set()
    let match
    
    while ((match = fallbackPattern.exec(html)) !== null && gameIds.size < 5) {
      gameIds.add(match[1])
    }
    
    Array.from(gameIds).forEach((gameId: any) => {
      games.push({
        id: parseInt(gameId),
        title: `Game ${gameId} (Click to view)`,
        url: `https://howlongtobeat.com/game/${gameId}`,
        imageUrl: null,
        mainStory: 0,
        platforms: ''
      })
    })
  }
  
  // Filter results by relevance
  if (games.length > 0) {
    const relevantGames = games.filter(game => {
      const titleLower = game.title.toLowerCase()
      return titleLower.includes(searchTermLower) ||
             searchTermLower.includes(titleLower) ||
             searchTermLower.split(' ').some(term => 
               titleLower.includes(term) && term.length > 2
             )
    })
    
    const finalGames = relevantGames.length > 0 ? relevantGames : games.slice(0, 8)
    console.log(`Returning ${finalGames.length} filtered games:`, finalGames.map(g => g.title))
    return finalGames
  }
  
  console.log('No games found in HTML parsing')
  return []
}