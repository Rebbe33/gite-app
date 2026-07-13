import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useReservations(giteId) {
  const [reservations, setReservations] = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!giteId) { setLoading(false); return }
    const { data } = await supabase.from('gite_reservations')
      .select('*').eq('gite_id', giteId)
      .order('date_arrivee')
    setReservations(data || [])
    setLoading(false)
  }, [giteId])

  useEffect(() => {
    fetch()
    if (!giteId) return
    const sub = supabase.channel(`resa-${giteId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gite_reservations',
        filter: `gite_id=eq.${giteId}` }, fetch)
      .subscribe()
    return () => supabase.removeChannel(sub)
  }, [giteId, fetch])

  const add = async (resa) => {
    await supabase.from('gite_reservations').insert({ ...resa, gite_id: giteId })
    await fetch()
  }
  const update = async (id, updates) => {
    await supabase.from('gite_reservations').update(updates).eq('id', id)
    await fetch()
  }
  const remove = async (id) => {
    await supabase.from('gite_reservations').delete().eq('id', id)
    await fetch()
  }

  return { reservations, loading, add, update, remove, refresh: fetch }
}

export function useAllReservations(gites) {
  const [all, setAll] = useState([])

  // ?.join() corrigé pour éviter le crash quand gites est undefined/vide
  const giteIds = gites?.map(g => g.id)?.join(',') ?? ''

  const fetch = useCallback(async () => {
    if (!gites?.length) return
    const ids = gites.map(g => g.id)
    const { data } = await supabase
      .from('gite_reservations')
      .select('*')
      .in('gite_id', ids)
      .order('date_arrivee')
    setAll(data || [])
  }, [giteIds])

  useEffect(() => {
    fetch()
    if (!gites?.length) return

    const sub = supabase.channel('resa-all')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'gite_reservations'
      }, fetch)
      .subscribe()

    return () => supabase.removeChannel(sub)
  }, [fetch])

  return all
}
