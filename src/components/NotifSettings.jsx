import { useState } from 'react'
import { Bell, BellOff, BellRing, AlertCircle } from 'lucide-react'
import { usePushNotifications } from '../hooks/usePushNotifications'

export default function NotifSettings() {
  const { supported, permission, subscribed, loading, subscribe, unsubscribe, lastError } = usePushNotifications()
  const [localError, setLocalError] = useState(null)

  const handleSubscribe = async () => {
    setLocalError(null)
    try {
      await subscribe()
    } catch (e) {
      setLocalError(e.message)
    }
  }

  if (!supported) return (
    <div className="notif-row notif-unsupported">
      <BellOff size={15} />
      <span>Notifications non supportées sur ce navigateur</span>
    </div>
  )

  return (
    <div>
      {(lastError || localError) && (
        <div className="error-banner" style={{ marginBottom: 8 }}>
          <AlertCircle size={14} />
          <span>{lastError || localError}</span>
        </div>
      )}

      {!import.meta.env.VITE_VAPID_PUBLIC_KEY && (
        <div className="error-banner" style={{ marginBottom: 8 }}>
          <AlertCircle size={14} />
          <span>Clé VAPID manquante — vérifiez VITE_VAPID_PUBLIC_KEY sur Vercel</span>
        </div>
      )}

      {subscribed ? (
        <div className="notif-row notif-active">
          <BellRing size={15} />
          <div className="notif-text">
            <span>Notifications activées</span>
            <span className="notif-sub">J-2 avant arrivée · Jour du départ</span>
          </div>
          <button className="btn-outline-sm" onClick={unsubscribe} disabled={loading}>
            {loading ? '...' : 'Désactiver'}
          </button>
        </div>
      ) : (
        <div className="notif-row notif-inactive">
          <Bell size={15} />
          <div className="notif-text">
            <span>Notifications désactivées</span>
            <span className="notif-sub">Rappel J-2 avant arrivée et jour du départ</span>
          </div>
          <button className="btn-primary-sm" onClick={handleSubscribe} disabled={loading}>
            {loading ? '...' : 'Activer'}
          </button>
        </div>
      )}
    </div>
  )
}
