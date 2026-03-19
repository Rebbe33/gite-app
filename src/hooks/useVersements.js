import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useVersements(giteId = null) {
  const [versements, setVersements] = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)
    let q = supabase.from('gite_versements')
      .select('*, gite_gites(nom, mode_suivi)')
      .order('date_versement', { ascending: false })
    if (giteId) q = q.eq('gite_id', giteId)
    const { data } = await q
    setVersements(data || [])
    setLoading(false)
  }, [giteId])

  useEffect(() => {
    fetch()
    const sub = supabase.channel(`versements-${giteId || 'all'}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gite_versements' }, fetch)
      .subscribe()
    return () => supabase.removeChannel(sub)
  }, [fetch])

  const add = async ({ gite_id, montant, date_versement, note, nb_heures_couvertes = null }) => {
    await supabase.from('gite_versements').insert({
      gite_id, montant, date_versement, note, nb_heures_couvertes
    })
    await fetch()
  }

  const remove = async (id) => {
    await supabase.from('gite_versements').delete().eq('id', id)
    await fetch()
  }

  return { versements, loading, add, remove, refresh: fetch }
}
