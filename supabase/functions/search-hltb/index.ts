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

    // Search HowLongToBeat using their current API endpoint
    const searchUrl = 'https://howlongtobeat.com/api/search'
    
    const searchResponse = await fetch(searchUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://howlongtobeat.com',
        'Origin': 'https://howlongtobeat.com'
      },
      body: JSON.stringify({
        searchType: "games",
        searchTerms: gameTitle.split(' '),
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

    if (!searchResponse.ok) {
      console.error('Search failed:', searchResponse.status)
      // Fallback to scraping the search page
      return await fallbackSearch(gameTitle)
    }

    const searchData = await searchResponse.json()
    console.log('Search response:', searchData)

    if (searchData.data && searchData.data.length > 0) {
      const games = searchData.data.map((game: any) => ({
        id: game.id,
        title: game.game_name,
        url: `https://howlongtobeat.com/game/${game.id}`,
        imageUrl: game.game_image ? `https://howlongtobeat.com/games/${game.game_image}` : null,
        mainStory: game.comp_main || 0,
        platforms: game.profile_platform || ''
      }))

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
      return await fallbackSearch(gameTitle)
    }

  } catch (error) {
    console.error('Error searching HLTB:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})

async function fallbackSearch(gameTitle: string) {
  try {
    console.log('Using fallback search method')
    
    // Try scraping the search results page
    const searchUrl = `https://howlongtobeat.com/?q=${encodeURIComponent(gameTitle)}`
    
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch search page: ${response.status}`)
    }

    const html = await response.text()
    
    // Look for game links in the HTML
    const gameMatches = html.match(/\/game\/(\d+)["'][^>]*>([^<]+)</gi) || []
    
    const games = gameMatches.slice(0, 10).map(match => {
      const idMatch = match.match(/\/game\/(\d+)/)
      const titleMatch = match.match(/>([^<]+)</)
      
      if (idMatch && titleMatch) {
        const id = idMatch[1]
        const title = titleMatch[1].trim()
        
        return {
          id: parseInt(id),
          title: title,
          url: `https://howlongtobeat.com/game/${id}`,
          imageUrl: null,
          mainStory: 0,
          platforms: ''
        }
      }
      return null
    }).filter(Boolean)

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

  } catch (error) {
    console.error('Fallback search failed:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Search failed',
        games: []
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
}