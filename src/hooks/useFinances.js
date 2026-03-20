import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { formatMinutes } from './useHeures'

export function useFinances(giteId = null) {
  const [montantsDus, setMontantsDus] = useState([])
  const [versements, setVersements]   = useState([])
  const [loading, setLoading]         = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)
    let mq = supabase.from('gite_montants_dus')
      .select('*, gite_gites(nom, mode_suivi, taux_horaire, forfait_montant, proprietaire)')
      .order('date_prestation', { ascending: false })
    let vq = supabase.from('gite_versements')
      .select('*, gite_gites(nom, mode_suivi, proprietaire)')
      .order('date_versement', { ascending: false })
    if (giteId) { mq = mq.eq('gite_id', giteId); vq = vq.eq('gite_id', giteId) }
    const [{ data: m }, { data: v }] = await Promise.all([mq, vq])
    setMontantsDus(m || [])
    setVersements(v || [])
    setLoading(false)
  }, [giteId])

  useEffect(() => {
    fetch()
    const chanId = giteId || 'all'
    const sub = supabase.channel(`finances-${chanId}`)
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

  // Ajoute un versement et archive automatiquement les sessions couvertes
  const addVersement = async ({ gite_id, montant, date_versement, note }) => {
    // Insérer le versement
    await supabase.from('gite_versements').insert({ gite_id, montant, date_versement, note })

    // Récupérer infos du gîte
    const { data: gite } = await supabase.from('gite_gites')
      .select('mode_suivi, taux_horaire, forfait_montant')
      .eq('id', gite_id).single()

    if (!gite || gite.mode_suivi === 'amiable') { await fetch(); return }

    // Récupérer les sessions non archivées, triées par date (plus anciennes d'abord)
    const { data: sessions } = await supabase
      .from('gite_heures_sessions')
      .select('*')
      .eq('gite_id', gite_id)
      .order('date_session', { ascending: true })

    if (!sessions || sessions.length === 0) { await fetch(); return }

    // Calculer le montant de chaque session directement depuis le taux/forfait
    const getMontantSession = (s) => {
      if (gite.mode_suivi === 'taux_horaire' && gite.taux_horaire > 0) {
        return Math.round((s.duree_minutes / 60) * gite.taux_horaire * 100) / 100
      }
      if (gite.mode_suivi === 'forfait' && gite.forfait_montant > 0) {
        return Number(gite.forfait_montant)
      }
      return 0
    }

    // Consommer le versement sur les sessions (plus anciennes d'abord)
    let restant = Number(montant)
    const sessionsAArchiver = []

    for (const session of sessions) {
      const montantSession = getMontantSession(session)
      if (montantSession <= 0) continue
      if (restant >= montantSession - 0.01) { // tolérance arrondi
        sessionsAArchiver.push({ ...session, montantSession })
        restant = Math.round((restant - montantSession) * 100) / 100
      }
      if (restant < 0.01) break
    }

    if (sessionsAArchiver.length === 0) { await fetch(); return }

    // Créer l'entrée d'archivage
    const dates   = sessionsAArchiver.map(s => s.date_session).sort()
    const totalMin = sessionsAArchiver.reduce((s, x) => s + x.duree_minutes, 0)

    await supabase.from('gite_paiements').insert({
      gite_id,
      total_minutes: totalMin,
      periode_debut: dates[0],
      periode_fin:   dates[dates.length - 1],
      date_paiement: date_versement,
      note: `Archivage auto — ${sessionsAArchiver.length} session(s) — versement ${montant}€${note ? ' · ' + note : ''}`,
    })

    // Supprimer les sessions archivées
    await supabase.from('gite_heures_sessions')
      .delete().in('id', sessionsAArchiver.map(s => s.id))

    // Supprimer les montants dus correspondants (par montant + gite, pas par date)
    for (const session of sessionsAArchiver) {
      const montantSession = session.montantSession
      // Cherche un montant dû avec le même montant pour ce gîte
      const { data: mdus } = await supabase.from('gite_montants_dus')
        .select('id')
        .eq('gite_id', gite_id)
        .gte('montant', montantSession - 0.01)
        .lte('montant', montantSession + 0.01)
        .limit(1)
      if (mdus && mdus.length > 0) {
        await supabase.from('gite_montants_dus').delete().eq('id', mdus[0].id)
      }
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
    montantsDus, versements, loading,
    addMontantDu, deleteMontantDu,
    addVersement, deleteVersement,
    soldeByGite, soldeByProprietaire,
    totalDu, totalRecu, soldeGlobal,
    refresh: fetch,
  }
}
