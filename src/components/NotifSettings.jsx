import { Bell, BellOff, BellRing } from 'lucide-react'
import { usePushNotifications } from '../hooks/usePushNotifications'

export default function NotifSettings() {
  const { supported, permission, subscribed, loading, subscribe, unsubscribe } = usePushNotifications()

  if (!supported) return (
    <div className="notif-row notif-unsupported">
      <BellOff size={15} />
      <span>Notifications non supportées sur ce navigateur</span>
    </div>
  )

  if (subscribed) return (
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
  )

  return (
    <div className="notif-row notif-inactive">
      <Bell size={15} />
      <div className="notif-text">
        <span>Notifications désactivées</span>
        <span className="notif-sub">Recevez un rappel J-2 avant chaque arrivée et le jour du départ</span>
      </div>
      <button className="btn-primary-sm" onClick={subscribe} disabled={loading || !import.meta.env.VITE_VAPID_PUBLIC_KEY}>
        {loading ? '...' : 'Activer'}
      </button>
    </div>
  )
}
