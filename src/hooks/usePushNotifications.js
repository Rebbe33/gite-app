import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || ''

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)))
}

export function usePushNotifications() {
  const [permission, setPermission] = useState('default')
  const [subscribed, setSubscribed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [supported, setSupported] = useState(false)
  const [lastError, setLastError] = useState(null)

  useEffect(() => {
    const ok = 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window
    setSupported(ok)
    if (ok) {
      setPermission(Notification.permission)
      checkExistingSubscription()
    }
  }, [])

  async function checkExistingSubscription() {
    try {
      const reg = await navigator.serviceWorker.getRegistration('/sw2.js')
      if (!reg) return
      const sub = await reg.pushManager.getSubscription()
      setSubscribed(!!sub)
    } catch (e) {
      setLastError('Erreur vérification subscription: ' + e.message)
    }
  }

  async function subscribe() {
    setLastError(null)
    if (!VAPID_PUBLIC_KEY) {
      const msg = 'Clé VAPID manquante (VITE_VAPID_PUBLIC_KEY)'
      setLastError(msg)
      throw new Error(msg)
    }
    setLoading(true)
    try {
      // Enregistrer le service worker
      const reg = await navigator.serviceWorker.register('/sw2.js')
      await navigator.serviceWorker.ready

      // Demander permission
      const perm = await Notification.requestPermission()
      setPermission(perm)
      if (perm !== 'granted') {
        setLastError('Permission refusée par le navigateur')
        setLoading(false)
        return
      }

      // Forcer une nouvelle subscription (supprimer l'ancienne si elle existe)
      const existing = await reg.pushManager.getSubscription()
      if (existing) await existing.unsubscribe()

      // Créer la nouvelle subscription
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })

      const json = sub.toJSON()
      if (!json.keys) {
        setLastError('Subscription invalide — pas de clés')
        return
      }

      // Sauvegarder dans Supabase
      const { error } = await supabase.from('gite_push_subscriptions').upsert({
        endpoint: json.endpoint,
        p256dh: json.keys.p256dh,
        auth: json.keys.auth,
      }, { onConflict: 'endpoint' })

      if (error) {
        setLastError('Erreur Supabase: ' + error.message)
        return
      }

      setSubscribed(true)
    } catch (e) {
      setLastError('Erreur: ' + e.message)
      throw e
    } finally {
      setLoading(false)
    }
  }

  async function unsubscribe() {
    setLoading(true)
    try {
      const reg = await navigator.serviceWorker.getRegistration('/sw2.js')
      if (!reg) return
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await supabase.from('gite_push_subscriptions').delete().eq('endpoint', sub.endpoint)
        await sub.unsubscribe()
      }
      setSubscribed(false)
    } finally {
      setLoading(false)
    }
  }

  return { supported, permission, subscribed, loading, lastError, subscribe, unsubscribe }
}
