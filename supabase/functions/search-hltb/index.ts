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

    // Use the correct search endpoint format
    const searchResponse = await fetch('https://howlongtobeat.com/api/search/games', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://howlongtobeat.com/',
        'Origin': 'https://howlongtobeat.com',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        searchTerms: [gameTitle.trim()],
        searchPage: 1,
        size: 20
      })
    })

    console.log('API Response status:', searchResponse.status)

    if (!searchResponse.ok) {
      console.error('API search failed with status:', searchResponse.status)
      const errorText = await searchResponse.text()
      console.error('Error response:', errorText)
      return await fallbackSearch(gameTitle)
    }

    const searchData = await searchResponse.json()
    console.log('Search data received:', JSON.stringify(searchData, null, 2))

    if (searchData && Array.isArray(searchData) && searchData.length > 0) {
      const games = searchData.slice(0, 10).map((game: any) => ({
        id: game.game_id,
        title: game.game_name || 'Unknown Title',
        url: `https://howlongtobeat.com/game/${game.game_id}`,
        imageUrl: game.game_image ? `https://howlongtobeat.com/games/${game.game_image}` : null,
        mainStory: Math.round((game.comp_main || 0) / 3600) || 0, // Convert seconds to hours
        platforms: game.profile_platform || ''
      }))

      console.log('Processed games:', games)

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
    } else if (searchData && searchData.data && Array.isArray(searchData.data) && searchData.data.length > 0) {
      const games = searchData.data.slice(0, 10).map((game: any) => ({
        id: game.game_id || game.id,
        title: game.game_name || game.name || 'Unknown Title',
        url: `https://howlongtobeat.com/game/${game.game_id || game.id}`,
        imageUrl: game.game_image ? `https://howlongtobeat.com/games/${game.game_image}` : null,
        mainStory: Math.round((game.comp_main || 0) / 3600) || 0, // Convert seconds to hours
        platforms: game.profile_platform || game.platform || ''
      }))

      console.log('Processed games:', games)

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
    } else {
      console.log('No games found in API response, trying fallback')
      return await fallbackSearch(gameTitle)
    }

  } catch (error) {
    console.error('Error searching HLTB:', error.message)
    console.error('Stack trace:', error.stack)
    return await fallbackSearch(gameTitle)
  }
})

async function fallbackSearch(gameTitle: string) {
  try {
    console.log('Using fallback search method for:', gameTitle)
    
    // Try to fetch the search page directly and parse HTML
    const searchUrl = `https://howlongtobeat.com/search?q=${encodeURIComponent(gameTitle)}`
    console.log('Searching URL:', searchUrl)
    
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Referer': 'https://howlongtobeat.com/'
      }
    })

    if (response.ok) {
      const html = await response.text()
      console.log('HTML response length:', html.length)
      
      // Look for search result links in the HTML with more specific patterns
      const gameLinks = []
      
      // Try multiple regex patterns to catch different HTML structures
      const patterns = [
        /href="\/game\/(\d+)"[^>]*>([^<]+)/g,
        /href="\/game\/(\d+)"[^>]*title="([^"]+)"/g,
        /<a[^>]*href="\/game\/(\d+)"[^>]*>([^<]+)<\/a>/g,
        /game_name[^>]*>([^<]+)<[^>]*href="\/game\/(\d+)"/g
      ]
      
      for (const pattern of patterns) {
        pattern.lastIndex = 0 // Reset regex
        let match
        
        while ((match = pattern.exec(html)) !== null && gameLinks.length < 10) {
          const gameId = match[1]
          const gameTitle = match[2]?.trim()
          
          // Skip if we already have this game or if title is empty/invalid
          if (gameId && gameTitle && gameTitle.length > 1 && 
              !gameLinks.some(g => g.id === parseInt(gameId))) {
            gameLinks.push({
              id: parseInt(gameId),
              title: gameTitle,
              url: `https://howlongtobeat.com/game/${gameId}`,
              imageUrl: null,
              mainStory: 0,
              platforms: ''
            })
          }
        }
        
        if (gameLinks.length > 0) break // Stop if we found games
      }

      if (gameLinks.length > 0) {
        console.log('Found game links:', gameLinks)
        
        // Filter results to only include games that somewhat match the search term
        const searchTermLower = gameTitle.toLowerCase()
        const filteredGames = gameLinks.filter(game => 
          game.title.toLowerCase().includes(searchTermLower) ||
          searchTermLower.includes(game.title.toLowerCase()) ||
          // Check for partial matches (e.g., "Halo" in "Halo 3")
          searchTermLower.split(' ').some(term => 
            game.title.toLowerCase().includes(term) && term.length > 2
          )
        )
        
        const finalGames = filteredGames.length > 0 ? filteredGames : gameLinks.slice(0, 5)
        
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
      }
    }

    // If HTML parsing fails, return a search link
    console.log('No games found in HTML, returning search link')
    const games = [{
      id: Math.floor(Math.random() * 100000),
      title: gameTitle,
      url: `https://howlongtobeat.com/search?q=${encodeURIComponent(gameTitle)}`,
      imageUrl: null,
      mainStory: 0,
      platforms: ''
    }]

    return new Response(
      JSON.stringify({
        success: true,
        games: games,
        note: 'Direct search link provided. Click to search on HowLongToBeat.com'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Fallback search failed:', error)
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
}