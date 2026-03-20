import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useFinances(giteId = null) {
  const [montantsDus, setMontantsDus]         = useState([])
  const [versements, setVersements]           = useState([])
  const [versementsHisto, setVersementsHisto] = useState([])
  const [loading, setLoading]                 = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)
    let mq = supabase.from('gite_montants_dus')
      .select('*, gite_gites(nom, mode_suivi, taux_horaire, forfait_montant, proprietaire)')
      .order('date_prestation', { ascending: false })
    let vq = supabase.from('gite_versements')
      .select('*, gite_gites(nom, mode_suivi, proprietaire)')
      .order('date_versement', { ascending: false })
    let hq = supabase.from('gite_versements_historique')
      .select('*, gite_gites(nom)')
      .order('date_versement', { ascending: false })
    if (giteId) {
      mq = mq.eq('gite_id', giteId)
      vq = vq.eq('gite_id', giteId)
      hq = hq.eq('gite_id', giteId)
    }
    const [{ data: m }, { data: v }, { data: h }] = await Promise.all([mq, vq, hq])
    setMontantsDus(m || [])
    setVersements(v || [])
    setVersementsHisto(h || [])
    setLoading(false)
  }, [giteId])

  useEffect(() => {
    fetch()
    const chanId = giteId || 'all'
    const sub = supabase.channel(`finances-${chanId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gite_montants_dus' }, fetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gite_versements' }, fetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gite_versements_historique' }, fetch)
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

  const deleteVersementHisto = async (id) => {
    await supabase.from('gite_versements_historique').delete().eq('id', id)
    await fetch()
  }

  const addVersement = async ({ gite_id, montant, date_versement, note }) => {
    const { data: gite } = await supabase.from('gite_gites')
      .select('mode_suivi, taux_horaire, forfait_montant')
      .eq('id', gite_id).single()

    if (!gite || gite.mode_suivi === 'amiable') {
      await supabase.from('gite_versements').insert({ gite_id, montant, date_versement, note })
      await fetch()
      return
    }

    // Récupérer reliquats précédents + sessions
    const { data: versementsExistants } = await supabase
      .from('gite_versements').select('*').eq('gite_id', gite_id)
      .order('date_versement', { ascending: true })

    const { data: sessions } = await supabase
      .from('gite_heures_sessions').select('*').eq('gite_id', gite_id)
      .order('date_session', { ascending: true })

    const getMontantSession = (s) => {
      if (gite.mode_suivi === 'taux_horaire' && gite.taux_horaire > 0)
        return Math.round((s.duree_minutes / 60) * gite.taux_horaire * 100) / 100
      if (gite.mode_suivi === 'forfait' && gite.forfait_montant > 0)
        return Number(gite.forfait_montant)
      return 0
    }

    const totalReliquats = (versementsExistants || []).reduce((s, v) => s + Number(v.montant), 0)
    let budget = Math.round((totalReliquats + Number(montant)) * 100) / 100

    const sessionsAArchiver = []
    for (const session of (sessions || [])) {
      const montantSession = getMontantSession(session)
      if (montantSession <= 0) continue
      if (budget >= montantSession - 0.01) {
        sessionsAArchiver.push({ ...session, montantSession })
        budget = Math.round((budget - montantSession) * 100) / 100
      }
      if (budget < 0.01) break
    }

    // Archiver les sessions couvertes
    if (sessionsAArchiver.length > 0) {
      const dates    = sessionsAArchiver.map(s => s.date_session).sort()
      const totalMin = sessionsAArchiver.reduce((s, x) => s + x.duree_minutes, 0)
      await supabase.from('gite_paiements').insert({
        gite_id, total_minutes: totalMin,
        periode_debut: dates[0], periode_fin: dates[dates.length - 1],
        date_paiement: date_versement,
        note: `Archivage auto — ${sessionsAArchiver.length} session(s)${note ? ' · ' + note : ''}`,
      })
      await supabase.from('gite_heures_sessions')
        .delete().in('id', sessionsAArchiver.map(s => s.id))
      for (const session of sessionsAArchiver) {
        const { data: mdus } = await supabase.from('gite_montants_dus')
          .select('id').eq('gite_id', gite_id)
          .gte('montant', session.montantSession - 0.01)
          .lte('montant', session.montantSession + 0.01).limit(1)
        if (mdus && mdus.length > 0)
          await supabase.from('gite_montants_dus').delete().eq('id', mdus[0].id)
      }
    }

    // Calculer montant consommé
    const montantConsomme = Math.round((Number(montant) + totalReliquats - budget) * 100) / 100

    // Enregistrer dans l'historique
    await supabase.from('gite_versements_historique').insert({
      gite_id,
      montant_brut: Number(montant),
      montant_consomme: Math.min(montantConsomme, Number(montant)),
      reliquat: Math.max(0, Math.round(budget * 100) / 100),
      date_versement,
      note: note || '',
      nb_sessions_archivees: sessionsAArchiver.length,
    })

    // Supprimer anciens reliquats et stocker le nouveau
    if (versementsExistants && versementsExistants.length > 0)
      await supabase.from('gite_versements').delete().in('id', versementsExistants.map(v => v.id))

    const reliquat = Math.round(budget * 100) / 100
    if (reliquat > 0.01) {
      await supabase.from('gite_versements').insert({
        gite_id, montant: reliquat, date_versement,
        note: `Reliquat${note ? ' · ' + note : ''}`,
      })
    }

    await fetch()
  }

  const deleteVersement = async (id) => {
    await supabase.from('gite_versements').delete().eq('id', id)
    await fetch()
  }

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

  const soldeByProprietaire = () => {
    const soldes = soldeByGite()
    const map = {}
    soldes.forEach(g => {
      const key = (g.proprietaire || '').trim() || 'Sans propriétaire'
      if (!map[key]) map[key] = { proprietaire: key, gites: [], totalDu: 0, totalRecu: 0 }
      map[key].gites.push(g)
      map[key].totalDu   += g.du
      map[key].totalRecu += g.recu
    })
    return Object.values(map).map(p => ({ ...p, solde: p.totalDu - p.totalRecu }))
  }

  const totalDu     = montantsDus.reduce((s, m) => s + Number(m.montant), 0)
  const totalRecu   = versements.reduce((s, v) => s + Number(v.montant), 0)
  const soldeGlobal = totalDu - totalRecu

  return {
    montantsDus, versements, versementsHisto, loading,
    addMontantDu, deleteMontantDu,
    addVersement, deleteVersement, deleteVersementHisto,
    soldeByGite, soldeByProprietaire,
    totalDu, totalRecu, soldeGlobal,
    refresh: fetch,
  }
}
