import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useFinances(giteId = null) {
  const [montantsDus, setMontantsDus] = useState([])
  const [versements, setVersements]   = useState([])
  const [loading, setLoading]         = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)
    let mq = supabase.from('gite_montants_dus').select('*, gite_gites(nom, mode_suivi, taux_horaire, forfait_montant, proprietaire)').order('date_prestation', { ascending: false })
    let vq = supabase.from('gite_versements').select('*, gite_gites(nom, mode_suivi, proprietaire)').order('date_versement', { ascending: false })
    if (giteId) { mq = mq.eq('gite_id', giteId); vq = vq.eq('gite_id', giteId) }
    const [{ data: m }, { data: v }] = await Promise.all([mq, vq])
    setMontantsDus(m || [])
    setVersements(v || [])
    setLoading(false)
  }, [giteId])

  useEffect(() => {
    fetch()
    const sub = supabase.channel('finances-' + (giteId || 'all'))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gite_montants_dus' }, fetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gite_versements' }, fetch)
      .subscribe()
    return () => supabase.removeChannel(sub)
  }, [fetch])

  const addMontantDu = async ({ gite_id, montant, description, date_prestation, passage_id = null }) => {
    await supabase.from('gite_montants_dus').insert({ gite_id, montant, description, date_prestation, passage_id })
    await fetch()
  }

  const deleteMontantDu = async (id) => {
    await supabase.from('gite_montants_dus').delete().eq('id', id)
    await fetch()
  }

  const addVersement = async ({ gite_id, montant, date_versement, note }) => {
    await supabase.from('gite_versements').insert({ gite_id, montant, date_versement, note })
    await fetch()
  }

  const deleteVersement = async (id) => {
    await supabase.from('gite_versements').delete().eq('id', id)
    await fetch()
  }

  // Solde par gîte
  const soldeByGite = () => {
    const map = {}
    montantsDus.forEach(m => {
      if (!map[m.gite_id]) map[m.gite_id] = { gite_id: m.gite_id, nom: m.gite_gites?.nom, proprietaire: m.gite_gites?.proprietaire, mode: m.gite_gites?.mode_suivi, du: 0, recu: 0 }
      map[m.gite_id].du += Number(m.montant)
    })
    versements.forEach(v => {
      if (!map[v.gite_id]) map[v.gite_id] = { gite_id: v.gite_id, nom: v.gite_gites?.nom, proprietaire: v.gite_gites?.proprietaire, mode: v.gite_gites?.mode_suivi, du: 0, recu: 0 }
      map[v.gite_id].recu += Number(v.montant)
    })
    return Object.values(map).map(g => ({ ...g, solde: g.du - g.recu }))
  }

  // Regrouper par propriétaire
  const soldeByProprietaire = () => {
    const soldes = soldeByGite()
    const map = {}
    soldes.forEach(g => {
      const key = g.proprietaire || 'Sans propriétaire'
      if (!map[key]) map[key] = { proprietaire: key, gites: [], totalDu: 0, totalRecu: 0 }
      map[key].gites.push(g)
      map[key].totalDu   += g.du
      map[key].totalRecu += g.recu
    })
    return Object.values(map).map(p => ({ ...p, solde: p.totalDu - p.totalRecu }))
  }

  const totalDu    = montantsDus.reduce((s, m) => s + Number(m.montant), 0)
  const totalRecu  = versements.reduce((s, v) => s + Number(v.montant), 0)
  const soldeGlobal = totalDu - totalRecu

  return {
    montantsDus, versements, loading,
    addMontantDu, deleteMontantDu,
    addVersement, deleteVersement,
    soldeByGite, soldeByProprietaire,
    totalDu, totalRecu, soldeGlobal,
    refresh: fetch,
  }
}
