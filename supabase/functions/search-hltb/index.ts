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

    // Try the main search API endpoint
    const searchResponse = await fetch('https://howlongtobeat.com/api/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://howlongtobeat.com/',
        'Origin': 'https://howlongtobeat.com',
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.9'
      },
      body: JSON.stringify({
        searchType: "games",
        searchTerms: gameTitle.trim().split(/\s+/),
        searchPage: 1,
        size: 20,
        searchOptions: {
          games: {
            userId: 0,
            platform: "",
            sortCategory: "popular",
            rangeCategory: "main",
            rangeTime: {
              min: null,
              max: null
            },
            gameplay: {
              perspective: "",
              flow: "",
              genre: ""
            },
            rangeYear: {
              min: "",
              max: ""
            },
            modifier: ""
          }
        }
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

    if (searchData && searchData.data && Array.isArray(searchData.data) && searchData.data.length > 0) {
      const games = searchData.data.slice(0, 10).map((game: any) => ({
        id: game.id,
        title: game.game_name || game.name || 'Unknown Title',
        url: `https://howlongtobeat.com/game/${game.id}`,
        imageUrl: game.game_image ? `https://howlongtobeat.com/games/${game.game_image}` : null,
        mainStory: Math.round(game.comp_main / 3600) || 0, // Convert seconds to hours
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
    
    // Create a simple search that returns a basic result
    const games = [{
      id: Math.floor(Math.random() * 100000),
      title: gameTitle,
      url: `https://howlongtobeat.com/?q=${encodeURIComponent(gameTitle)}`,
      imageUrl: null,
      mainStory: 0,
      platforms: ''
    }]

    console.log('Fallback result:', games)

    return new Response(
      JSON.stringify({
        success: true,
        games: games,
        note: 'Search functionality is currently limited. Please visit HowLongToBeat.com directly for detailed information.'
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