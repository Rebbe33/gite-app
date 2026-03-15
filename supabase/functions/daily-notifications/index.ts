// supabase/functions/daily-notifications/index.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

const VAPID_PUBLIC  = Deno.env.get('VAPID_PUBLIC_KEY')!
const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY')!
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') || 'mailto:admin@gite.fr'

function base64url(data: ArrayBuffer | Uint8Array): string {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data)
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

function base64urlDecode(str: string): Uint8Array {
  str = str.replace(/-/g, '+').replace(/_/g, '/')
  while (str.length % 4) str += '='
  return Uint8Array.from(atob(str), c => c.charCodeAt(0))
}

// Convertit clé privée raw (32 bytes) en PKCS8 pour ECDSA P-256
function rawPrivateKeyToPkcs8(rawKey: Uint8Array): Uint8Array {
  // Template PKCS8 pour ECDSA P-256
  const prefix = new Uint8Array([
    0x30, 0x41, 0x02, 0x01, 0x00, 0x30, 0x13,
    0x06, 0x07, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x02, 0x01,
    0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x03, 0x01, 0x07,
    0x04, 0x27, 0x30, 0x25, 0x02, 0x01, 0x01, 0x04, 0x20
  ])
  const result = new Uint8Array(prefix.length + rawKey.length)
  result.set(prefix)
  result.set(rawKey, prefix.length)
  return result
}

async function buildVapidJWT(audience: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const header  = base64url(new TextEncoder().encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })))
  const payload = base64url(new TextEncoder().encode(JSON.stringify({
    aud: audience, exp: now + 43200, sub: VAPID_SUBJECT
  })))
  const unsigned = `${header}.${payload}`

  const rawPrivate = base64urlDecode(VAPID_PRIVATE)
  const pkcs8 = rawPrivateKeyToPkcs8(rawPrivate)

  const signingKey = await crypto.subtle.importKey(
    'pkcs8', pkcs8,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false, ['sign']
  )

  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: { name: 'SHA-256' } },
    signingKey,
    new TextEncoder().encode(unsigned)
  )

  return `${unsigned}.${base64url(signature)}`
}

async function sendWebPush(
  sub: { endpoint: string; p256dh: string; auth: string },
  payload: string
): Promise<{ ok: boolean; status: number; body: string }> {
  const audience = new URL(sub.endpoint).origin
  const jwt = await buildVapidJWT(audience)

  // Génération des clés éphémères serveur
  const serverKeys = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']
  )
  const serverPublicRaw = new Uint8Array(
    await crypto.subtle.exportKey('raw', serverKeys.publicKey)
  )

  // Clé publique client
  const clientPublicKey = await crypto.subtle.importKey(
    'raw', base64urlDecode(sub.p256dh),
    { name: 'ECDH', namedCurve: 'P-256' }, false, []
  )

  // Secret partagé ECDH
  const sharedBits = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: clientPublicKey },
    serverKeys.privateKey, 256
  )

  const salt = crypto.getRandomValues(new Uint8Array(16))
  const authSecret = base64urlDecode(sub.auth)

  // HKDF - PRK
  const prkHmacKey = await crypto.subtle.importKey(
    'raw', authSecret, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  )
  const prk = new Uint8Array(await crypto.subtle.sign(
    'HMAC', prkHmacKey,
    concat(new Uint8Array(sharedBits), new TextEncoder().encode('Content-Encoding: auth\0'))
  ))

  // HKDF - Clé de chiffrement
  const prkHmacKey2 = await crypto.subtle.importKey(
    'raw', prk, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  )

  const keyInfo   = concat(new TextEncoder().encode('Content-Encoding: aesgcm\0'), new Uint8Array([0x41]), serverPublicRaw, new Uint8Array([0x41]), base64urlDecode(sub.p256dh))
  const nonceInfo = concat(new TextEncoder().encode('Content-Encoding: nonce\0'),  new Uint8Array([0x41]), serverPublicRaw, new Uint8Array([0x41]), base64urlDecode(sub.p256dh))

  const saltHmac = await crypto.subtle.importKey(
    'raw', salt, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  )

  const keyBytes   = new Uint8Array((await crypto.subtle.sign('HMAC', prkHmacKey2, concat(keyInfo,   new Uint8Array([0x01])))).slice(0, 16))
  const nonceBytes = new Uint8Array((await crypto.subtle.sign('HMAC', prkHmacKey2, concat(nonceInfo, new Uint8Array([0x01])))).slice(0, 12))

  // Chiffrement AES-GCM
  const contentKey = await crypto.subtle.importKey(
    'raw', keyBytes, { name: 'AES-GCM' }, false, ['encrypt']
  )
  const payloadBytes = new TextEncoder().encode(payload)
  const padded = new Uint8Array(2 + payloadBytes.length)
  padded.set(payloadBytes, 2)

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonceBytes }, contentKey, padded
  )

  const res = await fetch(sub.endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `vapid t=${jwt}, k=${VAPID_PUBLIC}`,
      'Content-Type': 'application/octet-stream',
      'Content-Encoding': 'aesgcm',
      'Encryption': `salt=${base64url(salt)}`,
      'Crypto-Key': `dh=${base64url(serverPublicRaw)};vapid=${VAPID_PUBLIC}`,
      'TTL': '86400',
    },
    body: encrypted,
  })

  return { ok: res.ok, status: res.status, body: await res.text() }
}

function concat(...arrays: Uint8Array[]): Uint8Array {
  const total = arrays.reduce((s, a) => s + a.length, 0)
  const result = new Uint8Array(total)
  let offset = 0
  for (const a of arrays) { result.set(a, offset); offset += a.length }
  return result
}

Deno.serve(async () => {
  try {
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
            errors.push(`HTTP ${res.status}: ${res.body}`)
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
      JSON.stringify({ error: e.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
