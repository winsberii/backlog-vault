import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { url } = await req.json()
    
    if (!url || !url.includes('howlongtobeat.com')) {
      throw new Error('Invalid HowLongToBeat URL')
    }

    console.log('Fetching data from:', url)

    // Fetch the webpage
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch page: ${response.status}`)
    }

    const html = await response.text()
    
    // Extract cover image URL
    let coverImage = ''
    const coverImageMatch = html.match(/<img[^>]+class="[^"]*GameHeader_game_image[^"]*"[^>]+src="([^"]+)"/i) ||
                           html.match(/<img[^>]+src="([^"]+)"[^>]*class="[^"]*GameHeader_game_image[^"]*"/i) ||
                           html.match(/<div[^>]+class="[^"]*game_image[^"]*"[^>]*>\s*<img[^>]+src="([^"]+)"/i)
    
    if (coverImageMatch) {
      coverImage = coverImageMatch[1]
      // Convert relative URLs to absolute
      if (coverImage.startsWith('/')) {
        coverImage = 'https://howlongtobeat.com' + coverImage
      } else if (coverImage.startsWith('//')) {
        coverImage = 'https:' + coverImage
      }
    }

    // Extract main story duration
    let mainStoryHours = 0
    
    // Look for different patterns that might contain the main story duration
    const durationPatterns = [
      /Main\s*Story[^<]*?(\d+(?:\.\d+)?)\s*(?:Hours?|h)/i,
      /Single-Player[^<]*?(\d+(?:\.\d+)?)\s*(?:Hours?|h)/i,
      /Completionist[^<]*?(\d+(?:\.\d+)?)\s*(?:Hours?|h)/i,
      /"time_detail"[^>]*>(\d+(?:\.\d+)?)/i,
      /(\d+(?:\.\d+)?)\s*(?:Hours?|h)[^<]*?Main/i
    ]

    for (const pattern of durationPatterns) {
      const match = html.match(pattern)
      if (match) {
        mainStoryHours = parseFloat(match[1])
        break
      }
    }

    // If no main story found, try to extract any duration number
    if (mainStoryHours === 0) {
      const anyDurationMatch = html.match(/(\d+(?:\.\d+)?)\s*(?:Hours?|h)/i)
      if (anyDurationMatch) {
        mainStoryHours = parseFloat(anyDurationMatch[1])
      }
    }

    console.log('Extracted data:', { coverImage, mainStoryHours })

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          coverImage,
          estimatedDuration: Math.round(mainStoryHours)
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error fetching HLTB data:', error)
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