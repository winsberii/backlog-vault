import { createClient } from '@supabase/supabase-js'
import { corsHeaders } from '../_shared/cors.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

interface AddGameRequest {
  title: string
  platform?: string
  playthrough_platform?: string
  cover_image?: string
  estimated_duration?: number
  price?: number
  comment?: string
  retro_achievement_url?: string
  how_long_to_beat_url?: string
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }

  try {
    // Extract API key from URL parameters
    const url = new URL(req.url)
    const apiKey = url.searchParams.get('api_key')

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'API key is required' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Validate API key and get user
    const { data: apiKeyData, error: keyError } = await supabase
      .from('user_api_keys')
      .select('user_id, is_active')
      .eq('api_key', apiKey)
      .eq('is_active', true)
      .single()

    if (keyError || !apiKeyData) {
      console.error('Invalid API key:', keyError)
      return new Response(
        JSON.stringify({ error: 'Invalid or inactive API key' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Parse request body
    const body: AddGameRequest = await req.json()

    if (!body.title || typeof body.title !== 'string' || body.title.trim() === '') {
      return new Response(
        JSON.stringify({ error: 'Title is required and must be a non-empty string' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Create the game with tosort=true
    const gameData = {
      user_id: apiKeyData.user_id,
      title: body.title.trim(),
      tosort: true,
      is_currently_playing: false,
      is_completed: false,
      needs_purchase: false,
      platform: body.platform || null,
      playthrough_platform: body.playthrough_platform || null,
      cover_image: body.cover_image || null,
      estimated_duration: body.estimated_duration || null,
      price: body.price || null,
      comment: body.comment || null,
      retro_achievement_url: body.retro_achievement_url || null,
      how_long_to_beat_url: body.how_long_to_beat_url || null,
    }

    const { data: newGame, error: insertError } = await supabase
      .from('games')
      .insert(gameData)
      .select()
      .single()

    if (insertError) {
      console.error('Error creating game:', insertError)
      return new Response(
        JSON.stringify({ error: 'Failed to create game' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('Game created successfully:', newGame.id)

    return new Response(
      JSON.stringify({ 
        success: true, 
        game: newGame,
        message: 'Game added to sort list successfully'
      }),
      { 
        status: 201, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})