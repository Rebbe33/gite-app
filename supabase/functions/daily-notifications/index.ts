// supabase/functions/daily-notifications/index.ts
// Déployer avec : supabase functions deploy daily-notifications
// Planifier avec : supabase functions schedule daily-notifications --cron "0 8 * * *"

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

const VAPID_PUBLIC  = Deno.env.get('VAPID_PUBLIC_KEY')!
const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY')!
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') || 'mailto:admin@gite.fr'

// Encode base64url
function base64url(buf: Uint8Array): string {
  return btoa(String.fromCharCode(...buf))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

async function sendPushNotification(sub: any, payload: object) {
  // Import de web-push via esm.sh
  const webpush = await import('https://esm.sh/web-push@3.6.7')
  webpush.default.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE)
  try {
    await webpush.default.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify(payload)
    )
  } catch (e) {
    // Subscription expirée — on la supprime
    if (e.statusCode === 410) {
      await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
    }
  }
}

Deno.serve(async () => {
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]
  const in2days = new Date(today)
  in2days.setDate(in2days.getDate() + 2)
  const in2daysStr = in2days.toISOString().split('T')[0]

  // Réservations avec départ aujourd'hui
  const { data: departures } = await supabase
    .from('reservations')
    .select('*, gites(nom)')
    .eq('date_depart', todayStr)
    .eq('statut', 'confirme')

  // Réservations avec arrivée dans 2 jours
  const { data: arrivals } = await supabase
    .from('reservations')
    .select('*, gites(nom)')
    .eq('date_arrivee', in2daysStr)
    .eq('statut', 'confirme')

  const { data: subs } = await supabase.from('push_subscriptions').select('*')
  if (!subs || subs.length === 0) return new Response('No subscribers', { status: 200 })

  const notifications: object[] = []

  for (const r of (departures || [])) {
    notifications.push({
      title: `🧹 Ménage à faire — ${r.gites?.nom}`,
      body: `Départ de ${r.nom_locataire} aujourd'hui. Pensez au ménage !`,
      tag: `depart-${r.id}`,
      url: '/?tab=menage',
    })
  }

  for (const r of (arrivals || [])) {
    notifications.push({
      title: `📋 Arrivée dans 2 jours — ${r.gites?.nom}`,
      body: `${r.nom_locataire} arrive le ${new Date(r.date_arrivee).toLocaleDateString('fr-FR')}. Vérifiez que tout est prêt.`,
      tag: `arrivee-${r.id}`,
      url: '/?tab=planning',
    })
  }

  for (const notif of notifications) {
    for (const sub of subs) {
      await sendPushNotification(sub, notif)
    }
  }

  return new Response(
    JSON.stringify({ sent: notifications.length, subscribers: subs.length }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
