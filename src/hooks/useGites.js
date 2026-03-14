import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useGites() {
  const [gites, setGites] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchGites = useCallback(async () => {
    const { data, error } = await supabase.from('gite_gites').select('*').order('created_at')
    if (error) setError(error.message)
    else setGites(data || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchGites()
    const sub = supabase.channel('gites').on('postgres_changes',
      { event: '*', schema: 'public', table: 'gite_gites' }, fetchGites
    ).subscribe()
    return () => supabase.removeChannel(sub)
  }, [fetchGites])

  const addGite = async (nom) => {
    const { data, error } = await supabase.from('gite_gites').insert({ nom }).select().single()
    if (error) throw error
    return data
  }

  const deleteGite = async (id) => {
    await supabase.from('gite_gites').delete().eq('id', id)
  }

  const renameGite = async (id, nom) => {
    await supabase.from('gite_gites').update({ nom }).eq('id', id)
  }

  return { gites, loading, error, addGite, deleteGite, renameGite, refresh: fetchGites }
}
