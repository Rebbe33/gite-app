// supabase/functions/daily-notifications/index.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

const VAPID_PUBLIC  = Deno.env.get('VAPID_PUBLIC_KEY')!
const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY')!
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') || 'mailto:admin@gite.fr'

Deno.serve(async () => {
  try {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE)

    const today = new Date()
    const todayStr   = today.toISOString().split('T')[0]
    const in2days    = new Date(today)
    in2days.setDate(in2days.getDate() + 2)
    const in2daysStr = in2days.toISOString().split('T')[0]

    const [{ data: departures }, { data: arrivals }, { data: subs, error: subError }] = await Promise.all([
      supabase.from('gite_reservations').select('*, gite_gites(nom)').eq('date_depart', todayStr).eq('statut', 'confirme'),
      supabase.from('gite_reservations').select('*, gite_gites(nom)').eq('date_arrivee', in2daysStr).eq('statut', 'confirme'),
      supabase.from('gite_push_subscriptions').select('*'),
    ])

    if (subError) return new Response(JSON.stringify({ error: subError.message }), { status: 500 })
    if (!subs || subs.length === 0) return new Response('No subscribers', { status: 200 })

    const notifications = [
      ...(departures || []).map(r => ({
        title: `🧹 Ménage à faire — ${r.gite_gites?.nom}`,
        body: `Départ de ${r.nom_locataire} aujourd'hui. Pensez au ménage !`,
        tag: `depart-${r.id}`,
      })),
      ...(arrivals || []).map(r => ({
        title: `📋 Arrivée dans 2 jours — ${r.gite_gites?.nom}`,
        body: `${r.nom_locataire} arrive le ${new Date(r.date_arrivee).toLocaleDateString('fr-FR')}. Vérifiez que tout est prêt.`,
        tag: `arrivee-${r.id}`,
      })),
    ]

    if (notifications.length === 0) {
      return new Response(
        JSON.stringify({ sent: 0, subscribers: subs.length, message: "Aucun événement aujourd'hui" }),
        { headers: { 'Content-Type': 'application/json' } }
      )
    }

    let sent = 0
    const errors: string[] = []

    for (const notif of notifications) {
      for (const sub of subs) {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            JSON.stringify(notif)
          )
          sent++
        } catch (e: any) {
          if (e.statusCode === 410) {
            await supabase.from('gite_push_subscriptions').delete().eq('endpoint', sub.endpoint)
          } else {
            errors.push(`${e.statusCode || ''} ${e.message}`)
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ sent, subscribers: subs.length, errors }),
      { headers: { 'Content-Type': 'application/json' } }
    )

  } catch (e: any) {
    return new Response(
      JSON.stringify({ error: e.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
