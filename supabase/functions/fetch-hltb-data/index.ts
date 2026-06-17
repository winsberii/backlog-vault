import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

async function downloadAndSaveImage(imageUrl: string, userId: string, gameTitle: string): Promise<string | null> {
  try {
    console.log('Downloading image from:', imageUrl)
    
    // Fetch the image
    const imageResponse = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    })

    if (!imageResponse.ok) {
      console.error('Failed to download image:', imageResponse.status)
      return null
    }

    // Get the image data
    const imageBlob = await imageResponse.blob()
    const imageBuffer = await imageBlob.arrayBuffer()
    
    // Generate a filename
    const timestamp = Date.now()
    const fileExtension = imageUrl.split('.').pop()?.split('?')[0] || 'jpg'
    const fileName = `${timestamp}_${gameTitle.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50)}.${fileExtension}`
    const filePath = `${userId}/${fileName}`

    console.log('Uploading image to storage:', filePath)

    // Upload to Supabase storage
    const { data, error } = await supabase.storage
      .from('cover-images')
      .upload(filePath, imageBuffer, {
        contentType: imageBlob.type || 'image/jpeg',
        cacheControl: '3600'
      })

    if (error) {
      console.error('Error uploading to storage:', error)
      return null
    }

    // Get the public URL
    const { data: { publicUrl } } = supabase.storage
      .from('cover-images')
      .getPublicUrl(filePath)

    // Fix URL by replacing kong:8000 with proper Supabase URL
    const fixedUrl = publicUrl.replace(/kong:8000/g, supabaseUrl.replace('https://', '').replace('http://', ''))
    
    console.log('Image saved to storage:', fixedUrl)
    return fixedUrl

  } catch (error) {
    console.error('Error downloading and saving image:', error)
    return null
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { url, userId, gameTitle } = await req.json()
    
    if (!url || !url.includes('howlongtobeat.com')) {
      throw new Error('Invalid HowLongToBeat URL')
    }

    if (!userId) {
      throw new Error('User ID is required')
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
    let coverImageUrl = ''
    const coverImageMatch = html.match(/<img[^>]+class="[^"]*GameHeader_game_image[^"]*"[^>]+src="([^"]+)"/i) ||
                           html.match(/<img[^>]+src="([^"]+)"[^>]*class="[^"]*GameHeader_game_image[^"]*"/i) ||
                           html.match(/<div[^>]+class="[^"]*game_image[^"]*"[^>]*>\s*<img[^>]+src="([^"]+)"/i)
    
    if (coverImageMatch) {
      coverImageUrl = coverImageMatch[1]
      // Convert relative URLs to absolute
      if (coverImageUrl.startsWith('/')) {
        coverImageUrl = 'https://howlongtobeat.com' + coverImageUrl
      } else if (coverImageUrl.startsWith('//')) {
        coverImageUrl = 'https:' + coverImageUrl
      }
    }

    // Extract main story duration
    let mainStoryHours = 0
    
    // Helper to parse HLTB time strings like "5½ Hours", "5.5 Hours", "45 Mins"
    const parseHltbTime = (raw: string): number => {
      if (!raw) return 0
      // Replace unicode fractions
      const normalized = raw
        .replace(/½/g, '.5')
        .replace(/¼/g, '.25')
        .replace(/¾/g, '.75')
      const hoursMatch = normalized.match(/(\d+(?:\.\d+)?)\s*Hours?/i)
      if (hoursMatch) return parseFloat(hoursMatch[1])
      const minsMatch = normalized.match(/(\d+(?:\.\d+)?)\s*(?:Mins?|Minutes?)/i)
      if (minsMatch) return parseFloat(minsMatch[1]) / 60
      return 0
    }

    // Primary: modern HLTB structure uses <h4>Main Story</h4><h5>5½ Hours</h5>
    const labeledPatterns: Array<{ label: string; regex: RegExp }> = [
      { label: 'Main Story', regex: /<h4>\s*Main\s*Story\s*<\/h4>\s*<h5>([^<]+)<\/h5>/i },
      { label: 'Single-Player', regex: /<h4>\s*Single[- ]Player\s*<\/h4>\s*<h5>([^<]+)<\/h5>/i },
      { label: 'Solo', regex: /<h4>\s*Solo\s*<\/h4>\s*<h5>([^<]+)<\/h5>/i },
      { label: 'Main + Sides', regex: /<h4>\s*Main\s*\+\s*Sides?\s*<\/h4>\s*<h5>([^<]+)<\/h5>/i },
      { label: 'Completionist', regex: /<h4>\s*Completionist\s*<\/h4>\s*<h5>([^<]+)<\/h5>/i },
      { label: 'HowLongToBeat', regex: /<h4>\s*HowLongToBeat\s*<\/h4>\s*<h5>([^<]+)<\/h5>/i },
    ]

    for (const { label, regex } of labeledPatterns) {
      const match = html.match(regex)
      if (match) {
        const hours = parseHltbTime(match[1])
        if (hours > 0) {
          mainStoryHours = hours
          console.log(`Matched "${label}" => "${match[1]}" => ${hours}h`)
          break
        }
      }
    }

    // Fallback: legacy patterns
    if (mainStoryHours === 0) {
      const legacyPatterns = [
        /Main\s*Story[\s\S]{0,80}?(\d+(?:[.½¼¾]\d*)?)\s*(?:Hours?|Hrs?|h)/i,
        /Single[- ]Player[\s\S]{0,80}?(\d+(?:[.½¼¾]\d*)?)\s*(?:Hours?|Hrs?|h)/i,
        /Completionist[\s\S]{0,80}?(\d+(?:[.½¼¾]\d*)?)\s*(?:Hours?|Hrs?|h)/i,
      ]
      for (const pattern of legacyPatterns) {
        const match = html.match(pattern)
        if (match) {
          mainStoryHours = parseHltbTime(match[0])
          if (mainStoryHours > 0) break
        }
      }
    }


    // Download and save cover image to Supabase storage
    let savedCoverImage = null
    if (coverImageUrl) {
      savedCoverImage = await downloadAndSaveImage(coverImageUrl, userId, gameTitle || 'game')
    }

    console.log('Extracted data:', { originalCoverImage: coverImageUrl, savedCoverImage, mainStoryHours })

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          coverImage: savedCoverImage || coverImageUrl, // Return saved image URL or fallback to original
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