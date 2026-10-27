import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { formatMinutes } from './useHeures'

export function useIntervenants(giteId = null) {
  const [intervenants, setIntervenants] = useState([])
  const [paiements, setPaiements]       = useState([])
  const [loading, setLoading]           = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data: i } = await supabase
      .from('gite_intervenants')
      .select('*')
      .order('nom')

    let pq = supabase.from('gite_paiements_intervenants')
      .select('*, gite_intervenants(nom), gite_gites(nom)')
      .order('date_paiement', { ascending: false })
    if (giteId) pq = pq.eq('gite_id', giteId)
    const { data: p } = await pq

    setIntervenants(i || [])
    setPaiements(p || [])
    setLoading(false)
  }, [giteId])

  const fetchRef   = useRef(fetch)
  useEffect(() => { fetchRef.current = fetch }, [fetch])
  const channelName = useRef(`intervenants-${Math.random().toString(36).slice(2)}`)

  useEffect(() => {
    fetch()
    const sub = supabase.channel(channelName.current)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gite_intervenants' },          () => fetchRef.current())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gite_paiements_intervenants' }, () => fetchRef.current())
      .subscribe()
    return () => supabase.removeChannel(sub)
  }, [giteId])

  // ── CRUD intervenants ───────────────────────────────────────────────────────

  const addIntervenant = async ({ nom, note = '' }) => {
    await supabase.from('gite_intervenants').insert({ nom, note })
    await fetch()
  }

  const updateIntervenant = async (id, { nom, note }) => {
    await supabase.from('gite_intervenants').update({ nom, note }).eq('id', id)
    await fetch()
  }

  const deleteIntervenant = async (id) => {
    await supabase.from('gite_intervenants').delete().eq('id', id)
    await fetch()
  }

  // ── Paiements à l'intervenant ───────────────────────────────────────────────
  // est_avance = true  → Rebecca a payé AVANT de recevoir le virement du proprio
  // est_avance = false → Rebecca a payé APRÈS avoir reçu l'argent du proprio

  const addPaiement = async ({ intervenant_id, gite_id, montant, date_paiement, note = '', est_avance = false }) => {
    await supabase.from('gite_paiements_intervenants').insert({
      intervenant_id, gite_id, montant, date_paiement, note, est_avance,
    })
    await fetch()
  }

  const deletePaiement = async (id) => {
    await supabase.from('gite_paiements_intervenants').delete().eq('id', id)
    await fetch()
  }

  // ── Calcul du solde par intervenant ────────────────────────────────────────
  // sessions : tableau venant de useHeures (avec gite_gites jointé)
  const soldeByIntervenant = (sessions = []) => {
    const map = {}

    // Initialiser depuis la liste des intervenants connus
    intervenants.forEach(i => {
      map[i.id] = { intervenant_id: i.id, nom: i.nom, montant_du: 0, montant_avance: 0, montant_paye: 0 }
    })

    // Montant dû = valeur des sessions actives faites par l'intervenant
    sessions.forEach(s => {
      if (!s.intervenant_id) return
      if (!map[s.intervenant_id]) map[s.intervenant_id] = {
        intervenant_id: s.intervenant_id,
        nom: s.gite_intervenants?.nom || 'Inconnu',
        montant_du: 0, montant_avance: 0, montant_paye: 0,
      }
      const mode    = s.gite_gites?.mode_suivi
      const montant = mode === 'taux_horaire'
        ? Math.round((s.duree_minutes / 60) * (s.gite_gites?.taux_horaire || 0) * 100) / 100
        : mode === 'forfait' ? Number(s.gite_gites?.forfait_montant || 0) : 0
      map[s.intervenant_id].montant_du += montant
    })

    // Paiements déjà effectués
    paiements.forEach(p => {
      if (!map[p.intervenant_id]) map[p.intervenant_id] = {
        intervenant_id: p.intervenant_id,
        nom: p.gite_intervenants?.nom || 'Inconnu',
        montant_du: 0, montant_avance: 0, montant_paye: 0,
      }
      if (p.est_avance) map[p.intervenant_id].montant_avance += Number(p.montant)
      else              map[p.intervenant_id].montant_paye   += Number(p.montant)
    })

    return Object.values(map).map(i => ({
      ...i,
      // Reste à payer = ce qui est dû MOINS ce qui a déjà été payé (avancé ou normal)
      reste_a_payer: Math.round((i.montant_du - i.montant_avance - i.montant_paye) * 100) / 100,
      // Montant avancé non encore remboursé par le proprio (payé avant réception)
      avance_en_cours: Math.round(i.montant_avance * 100) / 100,
    }))
  }

  return {
    intervenants, paiements, loading,
    addIntervenant, updateIntervenant, deleteIntervenant,
    addPaiement, deletePaiement,
    soldeByIntervenant,
    refresh: fetch,
  }
}
