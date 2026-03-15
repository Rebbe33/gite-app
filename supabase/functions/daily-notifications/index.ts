// supabase/functions/daily-notifications/index.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

const VAPID_PUBLIC  = Deno.env.get('VAPID_PUBLIC_KEY')!
const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY')!
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') || 'mailto:admin@gite.fr'

// Encode en base64url
function base64url(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

function base64urlDecode(str: string): Uint8Array {
  str = str.replace(/-/g, '+').replace(/_/g, '/')
  while (str.length % 4) str += '='
  return Uint8Array.from(atob(str), c => c.charCodeAt(0))
}

// Implémentation Web Push manuelle (sans librairie externe)
async function sendWebPush(sub: { endpoint: string; p256dh: string; auth: string }, payload: string) {
  // Clé privée VAPID en format brut
  const vapidPrivateKey = base64urlDecode(VAPID_PRIVATE)
  const vapidPublicKey  = base64urlDecode(VAPID_PUBLIC)

  // Import des clés VAPID
  const privateKey = await crypto.subtle.importKey(
    'raw', vapidPrivateKey,
    { name: 'ECDH', namedCurve: 'P-256' },
    false, ['deriveKey', 'deriveBits']
  )

  // JWT VAPID
  const audience = new URL(sub.endpoint).origin
  const now = Math.floor(Date.now() / 1000)
  const header = base64url(new TextEncoder().encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })))
  const claims = base64url(new TextEncoder().encode(JSON.stringify({
    aud: audience, exp: now + 86400, sub: VAPID_SUBJECT
  })))

  const signingKey = await crypto.subtle.importKey(
    'pkcs8',
    await crypto.subtle.exportKey('pkcs8', await crypto.subtle.importKey(
      'raw', vapidPrivateKey,
      { name: 'ECDSA', namedCurve: 'P-256' },
      true, ['sign']
    )),
    { name: 'ECDSA', namedCurve: 'P-256' },
    false, ['sign']
  )

  const sig = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    signingKey,
    new TextEncoder().encode(`${header}.${claims}`)
  )

  const jwt = `${header}.${claims}.${base64url(sig)}`
  const vapidAuth = `vapid t=${jwt}, k=${VAPID_PUBLIC}`

  // Chiffrement du payload (Web Push Encryption)
  const serverKeys = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveKey', 'deriveBits']
  )

  const clientPublicKey = await crypto.subtle.importKey(
    'raw', base64urlDecode(sub.p256dh),
    { name: 'ECDH', namedCurve: 'P-256' }, false, []
  )

  const sharedSecret = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: clientPublicKey },
    serverKeys.privateKey, 256
  )

  const salt = crypto.getRandomValues(new Uint8Array(16))
  const authBuffer = base64urlDecode(sub.auth)
  const serverPublicKeyRaw = new Uint8Array(await crypto.subtle.exportKey('raw', serverKeys.publicKey))

  // HKDF pour dériver les clés
  const ikm = await crypto.subtle.importKey('raw', sharedSecret, 'HKDF', false, ['deriveKey', 'deriveBits'])

  const prk = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt: authBuffer, info: new TextEncoder().encode('Content-Encoding: auth\0') },
    ikm, 256
  )

  const prkKey = await crypto.subtle.importKey('raw', prk, 'HKDF', false, ['deriveKey', 'deriveBits'])

  const keyInfo = new Uint8Array([...new TextEncoder().encode('Content-Encoding: aesgcm\0'), 0x41, ...serverPublicKeyRaw, 0x41, ...base64urlDecode(sub.p256dh)])
  const nonceInfo = new Uint8Array([...new TextEncoder().encode('Content-Encoding: nonce\0'), 0x41, ...serverPublicKeyRaw, 0x41, ...base64urlDecode(sub.p256dh)])

  const contentKey = await crypto.subtle.deriveKey(
    { name: 'HKDF', hash: 'SHA-256', salt, info: keyInfo },
    prkKey, { name: 'AES-GCM', length: 128 }, false, ['encrypt']
  )

  const nonce = new Uint8Array(await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt, info: nonceInfo },
    prkKey, 96
  ))

  const payloadBuffer = new TextEncoder().encode(payload)
  const padded = new Uint8Array(2 + payloadBuffer.length)
  padded.set(payloadBuffer, 2)

  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, contentKey, padded)

  const response = await fetch(sub.endpoint, {
    method: 'POST',
    headers: {
      'Authorization': vapidAuth,
      'Content-Type': 'application/octet-stream',
      'Content-Encoding': 'aesgcm',
      'Encryption': `salt=${base64url(salt.buffer)}`,
      'Crypto-Key': `dh=${base64url(serverPublicKeyRaw.buffer)};vapid=${VAPID_PUBLIC}`,
      'TTL': '86400',
    },
    body: encrypted,
  })

  return response
}

Deno.serve(async () => {
  try {
    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]
    const in2days = new Date(today)
    in2days.setDate(in2days.getDate() + 2)
    const in2daysStr = in2days.toISOString().split('T')[0]

    const { data: departures } = await supabase
      .from('gite_reservations')
      .select('*, gite_gites(nom)')
      .eq('date_depart', todayStr)
      .eq('statut', 'confirme')

    const { data: arrivals } = await supabase
      .from('gite_reservations')
      .select('*, gite_gites(nom)')
      .eq('date_arrivee', in2daysStr)
      .eq('statut', 'confirme')

    const { data: subs, error: subError } = await supabase
      .from('gite_push_subscriptions')
      .select('*')

    if (subError) return new Response(JSON.stringify({ error: subError.message }), { status: 500 })
    if (!subs || subs.length === 0) return new Response('No subscribers', { status: 200 })

    const notifications = []

    for (const r of (departures || [])) {
      notifications.push({
        title: `🧹 Ménage à faire — ${r.gite_gites?.nom}`,
        body: `Départ de ${r.nom_locataire} aujourd'hui. Pensez au ménage !`,
        tag: `depart-${r.id}`,
      })
    }

    for (const r of (arrivals || [])) {
      notifications.push({
        title: `📋 Arrivée dans 2 jours — ${r.gite_gites?.nom}`,
        body: `${r.nom_locataire} arrive le ${new Date(r.date_arrivee).toLocaleDateString('fr-FR')}. Vérifiez que tout est prêt.`,
        tag: `arrivee-${r.id}`,
      })
    }

    if (notifications.length === 0) {
      return new Response(
        JSON.stringify({ sent: 0, subscribers: subs.length, message: "Aucun événement aujourd'hui" }),
        { headers: { 'Content-Type': 'application/json' } }
      )
    }

    let sent = 0
    const errors = []

    for (const notif of notifications) {
      for (const sub of subs) {
        try {
          const res = await sendWebPush(sub, JSON.stringify(notif))
          if (res.status === 201 || res.status === 200) {
            sent++
          } else if (res.status === 410) {
            await supabase.from('gite_push_subscriptions').delete().eq('endpoint', sub.endpoint)
          } else {
            errors.push(`HTTP ${res.status}: ${await res.text()}`)
          }
        } catch (e) {
          errors.push(e.message)
        }
      }
    }

    return new Response(
      JSON.stringify({ sent, subscribers: subs.length, errors }),
      { headers: { 'Content-Type': 'application/json' } }
    )

  } catch (e) {
    return new Response(
      JSON.stringify({ error: e.message, stack: e.stack }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
