import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

// Convertit "2h30" ou "1h" ou "45" (minutes) en minutes
export function parseduree(str) {
  if (!str) return 0
  str = str.trim().toLowerCase().replace(',', '.')
  const matchHM = str.match(/^(\d+(?:\.\d+)?)h(\d+)?$/)
  if (matchHM) {
    const h = parseFloat(matchHM[1])
    const m = parseInt(matchHM[2] || '0')
    return Math.round(h * 60) + m
  }
  const matchH = str.match(/^(\d+(?:\.\d+)?)\s*h$/)
  if (matchH) return Math.round(parseFloat(matchH[1]) * 60)
  const matchM = str.match(/^(\d+)\s*m?$/)
  if (matchM) return parseInt(matchM[1])
  return 0
}

// Formate des minutes en "2h30" ou "45min"
export function formatMinutes(total) {
  if (!total) return '0min'
  const h = Math.floor(total / 60)
  const m = total % 60
  if (h === 0) return `${m}min`
  if (m === 0) return `${h}h`
  return `${h}h${String(m).padStart(2, '0')}`
}

export function useHeures(giteId = null) {
  const [sessions, setSessions]   = useState([])
  const [paiements, setPaiements] = useState([])
  const [loading, setLoading]     = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)
    let sq = supabase.from('heures_sessions').select('*, gites(nom)').order('date_session', { ascending: false })
    let pq = supabase.from('paiements').select('*, gites(nom)').order('date_paiement', { ascending: false })
    if (giteId) { sq = sq.eq('gite_id', giteId); pq = pq.eq('gite_id', giteId) }
    const [{ data: s }, { data: p }] = await Promise.all([sq, pq])
    setSessions(s || [])
    setPaiements(p || [])
    setLoading(false)
  }, [giteId])

  useEffect(() => {
    fetch()
    const sub = supabase.channel('heures')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'heures_sessions' }, fetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'paiements' }, fetch)
      .subscribe()
    return () => supabase.removeChannel(sub)
  }, [fetch])

  const addSession = async ({ gite_id, passage_id = null, duree_minutes, date_session, note = '' }) => {
    await supabase.from('heures_sessions').insert({ gite_id, passage_id, duree_minutes, date_session, note })
    await fetch()
  }

  const deleteSession = async (id) => {
    await supabase.from('heures_sessions').delete().eq('id', id)
    await fetch()
  }

  const deletePaiement = async (id) => {
    await supabase.from('paiements').delete().eq('id', id)
    await fetch()
  }

  // Clôturer et payer : archive les sessions non payées d'un gîte
  const payerGite = async (gite_id, note = '') => {
    const unpaid = sessions.filter(s => s.gite_id === gite_id)
    if (unpaid.length === 0) return
    const total = unpaid.reduce((acc, s) => acc + s.duree_minutes, 0)
    const dates = unpaid.map(s => s.date_session).sort()
    await supabase.from('paiements').insert({
      gite_id,
      total_minutes: total,
      periode_debut: dates[0],
      periode_fin: dates[dates.length - 1],
      date_paiement: new Date().toISOString().split('T')[0],
      note,
    })
    // Supprimer les sessions archivées
    await supabase.from('heures_sessions').delete().eq('gite_id', gite_id)
    await fetch()
  }

  // Stats agrégées — sessions non payées par gîte
  const statsByGite = () => {
    const map = {}
    sessions.forEach(s => {
      if (!map[s.gite_id]) map[s.gite_id] = { gite_id: s.gite_id, nom: s.gites?.nom, minutes: 0, count: 0 }
      map[s.gite_id].minutes += s.duree_minutes
      map[s.gite_id].count++
    })
    return Object.values(map)
  }

  // Stats par mois (toutes sessions + paiements confondus)
  const statsByMonth = () => {
    const map = {}
    // Sessions en cours
    sessions.forEach(s => {
      const key = s.date_session.slice(0, 7) // YYYY-MM
      if (!map[key]) map[key] = { month: key, minutes: 0 }
      map[key].minutes += s.duree_minutes
    })
    // Paiements archivés
    paiements.forEach(p => {
      const key = p.periode_fin.slice(0, 7)
      if (!map[key]) map[key] = { month: key, minutes: 0 }
      map[key].minutes += p.total_minutes
    })
    return Object.entries(map)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([, v]) => v)
  }

  const statsByYear = () => {
    const map = {}
    sessions.forEach(s => {
      const y = s.date_session.slice(0, 4)
      map[y] = (map[y] || 0) + s.duree_minutes
    })
    paiements.forEach(p => {
      const y = p.periode_fin.slice(0, 4)
      map[y] = (map[y] || 0) + p.total_minutes
    })
    return Object.entries(map).sort(([a], [b]) => b.localeCompare(a)).map(([year, minutes]) => ({ year, minutes }))
  }

  return {
    sessions, paiements, loading,
    addSession, deleteSession, deletePaiement, payerGite,
    statsByGite, statsByMonth, statsByYear,
    refresh: fetch,
  }
}
