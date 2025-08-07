import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RetroAchievementsResponse {
  NumAchievements?: number;
  Achievements?: { [key: string]: any };
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }

  try {
    const { gameId, retroAchievementUrl } = await req.json();

    if (!gameId) {
      return new Response(
        JSON.stringify({ error: 'Game ID is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    let raGameId: string;

    // Extract RetroAchievements game ID from URL if provided
    if (retroAchievementUrl) {
      const urlMatch = retroAchievementUrl.match(/\/game\/(\d+)/);
      if (urlMatch) {
        raGameId = urlMatch[1];
      } else {
        return new Response(
          JSON.stringify({ error: 'Invalid RetroAchievements URL format' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
    } else {
      return new Response(
        JSON.stringify({ error: 'RetroAchievements URL is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`Fetching achievements for RetroAchievements game ID: ${raGameId}`);

    // Fetch game info from RetroAchievements API
    const raApiUrl = `https://retroachievements.org/API/API_GetGame.php?i=${raGameId}`;
    
    const response = await fetch(raApiUrl, {
      headers: {
        'User-Agent': 'Game Library App/1.0'
      }
    });

    if (!response.ok) {
      console.error(`RetroAchievements API error: ${response.status} ${response.statusText}`);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch data from RetroAchievements' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const data: RetroAchievementsResponse = await response.json();
    console.log('RetroAchievements API response:', data);

    // Extract number of achievements
    let achievementCount = 0;
    
    if (data.NumAchievements) {
      achievementCount = data.NumAchievements;
    } else if (data.Achievements) {
      achievementCount = Object.keys(data.Achievements).length;
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Update the game record with the achievement count
    const { error: updateError } = await supabase
      .from('games')
      .update({ achievements: achievementCount })
      .eq('id', gameId);

    if (updateError) {
      console.error('Database update error:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update game record' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`Successfully updated game ${gameId} with ${achievementCount} achievements`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        achievementCount,
        message: `Found ${achievementCount} achievements`
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});