import { useState, useEffect, useCallback, useRef } from 'react'
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

  // Ref pour toujours appeler la version fraîche de fetch sans recréer le channel
  const fetchRef = useRef(fetch)
  useEffect(() => { fetchRef.current = fetch }, [fetch])

  // Nom de channel unique par instance → jamais de conflit
  const channelName = useRef(`heures-${Math.random().toString(36).slice(2)}`)

  useEffect(() => {
    fetch()
    const sub = supabase.channel(channelName.current)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gite_heures_sessions' }, () => fetchRef.current())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gite_paiements' },       () => fetchRef.current())
      .subscribe()
    return () => supabase.removeChannel(sub)
  }, [giteId]) // Ne se recrée que si giteId change, pas à chaque render

  const addSession = async ({ gite_id, passage_id = null, duree_minutes, date_session, note = '' }) => {
    await supabase.from('gite_heures_sessions').insert({ gite_id, passage_id, duree_minutes, date_session, note })

    // Auto-calcul montant dû pour taux horaire
    const { data: gite } = await supabase.from('gite_gites')
      .select('mode_suivi, taux_horaire, forfait_montant')
      .eq('id', gite_id).single()

    if (gite?.mode_suivi === 'taux_horaire' && gite.taux_horaire > 0) {
      const montant = Math.round((duree_minutes / 60) * gite.taux_horaire * 100) / 100
      await supabase.from('gite_montants_dus').insert({
        gite_id, montant,
        description: `${formatMinutes(duree_minutes)} @ ${gite.taux_horaire}€/h`,
        date_prestation: date_session,
      })
    }
    if (gite?.mode_suivi === 'forfait' && gite.forfait_montant > 0) {
      await supabase.from('gite_montants_dus').insert({
        gite_id,
        montant: Number(gite.forfait_montant),
        description: `Forfait passage`,
        date_prestation: date_session,
      })
    }
    await fetch()
  }

  const deleteSession = async (id) => {
    // Supprimer aussi le montant dû associé si taux horaire ou forfait
    const session = sessions.find(s => s.id === id)
    const mode = session?.gite_gites?.mode_suivi
    if (session && (mode === 'taux_horaire' || mode === 'forfait')) {
      await supabase.from('gite_montants_dus')
        .delete()
        .eq('gite_id', session.gite_id)
        .eq('date_prestation', session.date_session)
    }
    await supabase.from('gite_heures_sessions').delete().eq('id', id)
    await fetch()
  }

  const deletePaiement = async (id) => {
    await supabase.from('gite_paiements').delete().eq('id', id)
    await fetch()
  }

  // Archiver une sélection de sessions (+ versements amiable)
  // Supprime aussi les montants_dus liés aux sessions archivées
  const archiverSelection = async (gite_id, sessionIds, versementIds, note = '') => {
    const selectedSessions = sessions.filter(s => sessionIds.includes(s.id))
    const totalMin = selectedSessions.reduce((s, x) => s + x.duree_minutes, 0)
    if (totalMin === 0) return

    const dates = selectedSessions.map(s => s.date_session).sort()

    // 1. Archiver dans gite_paiements
    await supabase.from('gite_paiements').insert({
      gite_id,
      total_minutes: totalMin,
      periode_debut: dates[0],
      periode_fin: dates[dates.length - 1],
      date_paiement: new Date().toISOString().split('T')[0],
      note,
    })

    // 2. Supprimer les sessions
    if (sessionIds.length > 0)
      await supabase.from('gite_heures_sessions').delete().in('id', sessionIds)

    // 3. Supprimer les montants_dus liés à ces sessions (par date_prestation)
    //    Ceci évite que le reliquat reste positif sur le dashboard après archivage
    const datePrestations = selectedSessions.map(s => s.date_session)
    if (datePrestations.length > 0)
      await supabase.from('gite_montants_dus')
        .delete()
        .eq('gite_id', gite_id)
        .in('date_prestation', datePrestations)

    // 4. Supprimer les versements amiable sélectionnés
    if (versementIds.length > 0)
      await supabase.from('gite_versements').delete().in('id', versementIds)

    await fetch()
  }

  // Archivage automatique de toutes les sessions d'un gîte
  const archiverAuto = async (gite_id) => {
    const giteSessions = sessions.filter(s => s.gite_id === gite_id)
    if (giteSessions.length === 0) return
    const sessionIds   = giteSessions.map(s => s.id)
    const versementIds = [] // versements gérés séparément dans useFinances
    await archiverSelection(gite_id, sessionIds, versementIds, 'Archivage automatique')
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
    archiverSelection, archiverAuto,
    statsByGite, statsByMonth, statsByYear,
    refresh: fetch,
  }
}
