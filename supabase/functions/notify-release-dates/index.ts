import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const today = new Date().toISOString().split('T')[0]

    const { data: games, error } = await supabase
      .from('games')
      .select('id, user_id, title, release_date, platform:platforms!platform(name)')
      .not('release_date', 'is', null)
      .lte('release_date', today)
      .is('release_notified_at', null)

    if (error) throw error

    if (!games || games.length === 0) {
      return new Response(JSON.stringify({ notified: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const userIds = [...new Set(games.map((g: any) => g.user_id))]
    const { data: settings } = await supabase
      .from('user_settings')
      .select('user_id, release_webhook_url')
      .in('user_id', userIds)

    const webhookByUser = new Map<string, string>()
    for (const s of settings || []) {
      if (s.release_webhook_url) webhookByUser.set(s.user_id, s.release_webhook_url)
    }

    let notified = 0
    for (const game of games as any[]) {
      const webhookUrl = webhookByUser.get(game.user_id)
      if (!webhookUrl) continue

      try {
        const res = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'game.released',
            userId: game.user_id,
            game: {
              id: game.id,
              title: game.title,
              releaseDate: game.release_date,
              platform: game.platform?.name ?? null,
            },
          }),
        })

        if (!res.ok) {
          console.error('Webhook failed', game.id, res.status)
          continue
        }

        await supabase
          .from('games')
          .update({ release_notified_at: new Date().toISOString() })
          .eq('id', game.id)
        notified++
      } catch (e) {
        console.error('Webhook error for game', game.id, e)
      }
    }

    return new Response(JSON.stringify({ notified, checked: games.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error('notify-release-dates error:', e)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
