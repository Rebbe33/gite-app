import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'

export function useGites() {
  const [gites, setGites] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Nom unique par instance → jamais de conflit même si useGites est appelé plusieurs fois
  const channelName = useRef(`gites-${Math.random().toString(36).slice(2)}`)
  const fetchRef = useRef(null)

  const fetchGites = useCallback(async () => {
    const { data, error } = await supabase.from('gite_gites').select('*').order('created_at')
    if (error) setError(error.message)
    else setGites(data || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchRef.current = fetchGites
  }, [fetchGites])

  useEffect(() => {
    fetchGites()
    const sub = supabase.channel(channelName.current)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'gite_gites' },
        () => fetchRef.current()
      ).subscribe()
    return () => supabase.removeChannel(sub)
  }, [])

  const addGite = async (nom) => {
    const { data, error } = await supabase.from('gite_gites')
      .insert({ nom, mode_suivi: 'amiable', taux_horaire: 0, forfait_montant: 0, proprietaire: '' })
      .select().single()
    if (error) throw error
    return data
  }

  const deleteGite  = async (id) => { await supabase.from('gite_gites').delete().eq('id', id) }
  const renameGite  = async (id, nom) => { await supabase.from('gite_gites').update({ nom }).eq('id', id) }
  const updateGite  = async (id, updates) => {
    await supabase.from('gite_gites').update(updates).eq('id', id)
    await fetchGites()
  }

  return { gites, loading, error, addGite, deleteGite, renameGite, updateGite, refresh: fetchGites }
}
