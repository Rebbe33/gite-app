import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

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
    let sq = supabase.from('gite_heures_sessions')
      .select('*, gite_gites(nom, mode_suivi, taux_horaire, forfait_montant, proprietaire)')
      .order('date_session', { ascending: false })
    let pq = supabase.from('gite_paiements')
      .select('*, gite_gites(nom)')
      .order('date_paiement', { ascending: false })
    if (giteId) { sq = sq.eq('gite_id', giteId); pq = pq.eq('gite_id', giteId) }
    const [{ data: s }, { data: p }] = await Promise.all([sq, pq])
    setSessions(s || [])
    setPaiements(p || [])
    setLoading(false)
  }, [giteId])

  useEffect(() => {
    fetch()
    const sub = supabase.channel('heures-' + (giteId || 'all'))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gite_heures_sessions' }, fetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gite_paiements' }, fetch)
      .subscribe()
    return () => supabase.removeChannel(sub)
  }, [fetch])

  const addSession = async ({ gite_id, passage_id = null, duree_minutes, date_session, note = '' }) => {
    await supabase.from('gite_heures_sessions').insert({ gite_id, passage_id, duree_minutes, date_session, note })
    // Si mode taux_horaire ou forfait, créer automatiquement un montant dû
    const { data: gite } = await supabase.from('gite_gites').select('mode_suivi, taux_horaire, forfait_montant').eq('id', gite_id).single()
    if (gite && gite.mode_suivi === 'taux_horaire' && gite.taux_horaire > 0) {
      const montant = (duree_minutes / 60) * gite.taux_horaire
      await supabase.from('gite_montants_dus').insert({
        gite_id, montant: Math.round(montant * 100) / 100,
        description: `${formatMinutes(duree_minutes)} @ ${gite.taux_horaire}€/h`,
        date_prestation: date_session,
      })
    }
    await fetch()
  }

  const deleteSession = async (id) => {
    await supabase.from('gite_heures_sessions').delete().eq('id', id)
    await fetch()
  }

  const deletePaiement = async (id) => {
    await supabase.from('gite_paiements').delete().eq('id', id)
    await fetch()
  }

  // Archiver une sélection de sessions (mode amiable)
  const archiverSelection = async (gite_id, sessionIds, versementIds, note = '') => {
    const selectedSessions  = sessions.filter(s => sessionIds.includes(s.id))
    const totalMin = selectedSessions.reduce((s, x) => s + x.duree_minutes, 0)
    if (totalMin === 0) return

    const dates = selectedSessions.map(s => s.date_session).sort()
    await supabase.from('gite_paiements').insert({
      gite_id,
      total_minutes: totalMin,
      periode_debut: dates[0],
      periode_fin: dates[dates.length - 1],
      date_paiement: new Date().toISOString().split('T')[0],
      note,
    })
    // Supprimer sessions et versements sélectionnés
    if (sessionIds.length > 0)
      await supabase.from('gite_heures_sessions').delete().in('id', sessionIds)
    if (versementIds.length > 0)
      await supabase.from('gite_versements').delete().in('id', versementIds)
    await fetch()
  }

  // Clôturer tout (mode taux fixe)
  const payerGite = async (gite_id, note = '') => {
    const unpaid = sessions.filter(s => s.gite_id === gite_id)
    if (unpaid.length === 0) return
    const total = unpaid.reduce((acc, s) => acc + s.duree_minutes, 0)
    const dates = unpaid.map(s => s.date_session).sort()
    await supabase.from('gite_paiements').insert({
      gite_id, total_minutes: total,
      periode_debut: dates[0],
      periode_fin: dates[dates.length - 1],
      date_paiement: new Date().toISOString().split('T')[0],
      note,
    })
    await supabase.from('gite_heures_sessions').delete().eq('gite_id', gite_id)
    await fetch()
  }

  const statsByGite = () => {
    const map = {}
    sessions.forEach(s => {
      if (!map[s.gite_id]) map[s.gite_id] = { gite_id: s.gite_id, nom: s.gite_gites?.nom, proprietaire: s.gite_gites?.proprietaire, minutes: 0, count: 0 }
      map[s.gite_id].minutes += s.duree_minutes
      map[s.gite_id].count++
    })
    return Object.values(map)
  }

  const statsByMonth = () => {
    const map = {}
    sessions.forEach(s => {
      const key = s.date_session.slice(0, 7)
      if (!map[key]) map[key] = { month: key, minutes: 0 }
      map[key].minutes += s.duree_minutes
    })
    paiements.forEach(p => {
      const key = p.periode_fin.slice(0, 7)
      if (!map[key]) map[key] = { month: key, minutes: 0 }
      map[key].minutes += p.total_minutes
    })
    return Object.entries(map).sort(([a],[b]) => b.localeCompare(a)).map(([,v]) => v)
  }

  const statsByYear = () => {
    const map = {}
    sessions.forEach(s => { const y = s.date_session.slice(0,4); map[y] = (map[y]||0) + s.duree_minutes })
    paiements.forEach(p => { const y = p.periode_fin.slice(0,4); map[y] = (map[y]||0) + p.total_minutes })
    return Object.entries(map).sort(([a],[b]) => b.localeCompare(a)).map(([year,minutes]) => ({ year, minutes }))
  }

  return {
    sessions, paiements, loading,
    addSession, deleteSession, deletePaiement,
    archiverSelection, payerGite,
    statsByGite, statsByMonth, statsByYear,
    refresh: fetch,
  }
}
