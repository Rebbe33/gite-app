import { useState } from 'react'
import { useGites } from '../hooks/useGites'
import { useReservations } from '../hooks/useReservations'
import { useStocks } from '../hooks/useStocks'
import { useFinances } from '../hooks/useFinances'
import { useHeures, formatMinutes } from '../hooks/useHeures'
import { useVersements } from '../hooks/useVersements'
import { AlertTriangle, Clock, Euro, Plus, X, Check, Users, Calendar } from 'lucide-react'

const GITE_COLORS = ['#4a7c59','#185fa5','#c9853a','#7c4a7c','#b33030']
const MONTHS_FR   = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']
const DAYS_FR     = ['L','M','M','J','V','S','D']

function fmt(n) { return Number(n).toFixed(2).replace('.', ',') + ' €' }

// Reservations pour tous les gites (max 4)
function useAllReservations(gites) {
  const { reservations: r0 } = useReservations(gites[0]?.id)
  const { reservations: r1 } = useReservations(gites[1]?.id)
  const { reservations: r2 } = useReservations(gites[2]?.id)
  const { reservations: r3 } = useReservations(gites[3]?.id)
  return [
    ...(r0||[]).map(r => ({...r, colorIdx:0, giteNom: gites[0]?.nom})),
    ...(r1||[]).map(r => ({...r, colorIdx:1, giteNom: gites[1]?.nom})),
    ...(r2||[]).map(r => ({...r, colorIdx:2, giteNom: gites[2]?.nom})),
    ...(r3||[]).map(r => ({...r, colorIdx:3, giteNom: gites[3]?.nom})),
  ].filter(r => r.statut !== 'annule')
}

function useAllStocks(gites) {
  const { stocks: s0 } = useStocks(gites[0]?.id)
  const { stocks: s1 } = useStocks(gites[1]?.id)
  const { stocks: s2 } = useStocks(gites[2]?.id)
  const { stocks: s3 } = useStocks(gites[3]?.id)
  return [
    ...(s0||[]).filter(s=>s.quantite<=s.seuil_alerte).map(s=>({...s,giteNom:gites[0]?.nom})),
    ...(s1||[]).filter(s=>s.quantite<=s.seuil_alerte).map(s=>({...s,giteNom:gites[1]?.nom})),
    ...(s2||[]).filter(s=>s.quantite<=s.seuil_alerte).map(s=>({...s,giteNom:gites[2]?.nom})),
    ...(s3||[]).filter(s=>s.quantite<=s.seuil_alerte).map(s=>({...s,giteNom:gites[3]?.nom})),
  ]
}

function AddResaModal({ gites, onSave, onClose }) {
  const today = new Date().toISOString().split('T')[0]
  const [form, setForm] = useState({ gite_id: gites[0]?.id||'', nom_locataire:'', date_arrivee: today, date_depart: today, nb_personnes: 2, statut:'confirme', notes:'' })
  const set = (k,v) => setForm(f => ({...f,[k]:v}))
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e=>e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Nouvelle réservation</h2>
          <button className="icon-btn" onClick={onClose}><X size={18}/></button>
        </div>
        <div className="form-grid">
          <div className="form-field full">
            <label>Gîte</label>
            <select value={form.gite_id} onChange={e=>set('gite_id',e.target.value)}>
              {gites.map(g=><option key={g.id} value={g.id}>{g.nom}</option>)}
            </select>
          </div>
          <div className="form-field full">
            <label>Nom du locataire</label>
            <input value={form.nom_locataire} onChange={e=>set('nom_locataire',e.target.value)} placeholder="Famille Dupont" autoFocus/>
          </div>
          <div className="form-field">
            <label>Arrivée</label>
            <input type="date" value={form.date_arrivee} onChange={e=>set('date_arrivee',e.target.value)}/>
          </div>
          <div className="form-field">
            <label>Départ</label>
            <input type="date" value={form.date_depart} onChange={e=>set('date_depart',e.target.value)}/>
          </div>
          <div className="form-field">
            <label>Personnes</label>
            <input type="number" min="1" max="20" value={form.nb_personnes} onChange={e=>set('nb_personnes',parseInt(e.target.value))}/>
          </div>
          <div className="form-field">
            <label>Statut</label>
            <select value={form.statut} onChange={e=>set('statut',e.target.value)}>
              <option value="confirme">Confirmé</option>
              <option value="en_attente">En attente</option>
              <option value="annule">Annulé</option>
            </select>
          </div>
        </div>
        <div className="modal-actions">
          <button className="btn-gray" onClick={onClose}>Annuler</button>
          <button className="btn-primary" onClick={()=>onSave(form)}><Check size={14}/> Enregistrer</button>
        </div>
      </div>
    </div>
  )
}

function CalendarSection({ gites, allResas, onAddResa }) {
  const today = new Date()
  const [year, setYear]   = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())

  // Map jour → { colorIdx, clientIdx } pour différencier les clients
  const dayMap = {}
  allResas.forEach(r => {
    const start = new Date(r.date_arrivee)
    const end   = new Date(r.date_depart)
    for (let d = new Date(start); d <= end; d.setDate(d.getDate()+1)) {
      if (d.getFullYear()===year && d.getMonth()===month) {
        const key = d.getDate()
        if (!dayMap[key]) dayMap[key] = []
        // Stocker colorIdx + id de résa pour détecter les changements de client
        const existing = dayMap[key].find(x=>x.colorIdx===r.colorIdx)
        if (!existing) dayMap[key].push({ colorIdx: r.colorIdx, resaId: r.id, isStart: d.getTime()===start.getTime(), isEnd: d.getTime()===end.getTime() })
        else if (existing.resaId !== r.id) {
          // Deux clients différents sur le même gîte — jour de transition
          existing.isTransition = true
        }
      }
    }
  })

  const daysInMonth    = new Date(year, month+1, 0).getDate()
  const firstDayOfWeek = (new Date(year, month, 1).getDay()+6)%7
  const todayDay = today.getFullYear()===year && today.getMonth()===month ? today.getDate() : -1

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">{MONTHS_FR[month]} {year}</span>
        <div style={{display:'flex',gap:6}}>
          <button className="btn-outline-sm" onClick={()=>onAddResa()}><Plus size={13}/></button>
          <button className="btn-outline-sm" onClick={()=>{if(month===0){setMonth(11);setYear(y=>y-1)}else setMonth(m=>m-1)}}>◀</button>
          <button className="btn-outline-sm" onClick={()=>{if(month===11){setMonth(0);setYear(y=>y+1)}else setMonth(m=>m+1)}}>▶</button>
        </div>
      </div>

      {/* Légende */}
      <div style={{display:'flex',flexWrap:'wrap',gap:8,marginBottom:10}}>
        {gites.map((g,i) => (
          <div key={g.id} style={{display:'flex',alignItems:'center',gap:4,fontSize:12,color:'var(--text-2)'}}>
            <span style={{width:10,height:10,borderRadius:3,background:GITE_COLORS[i],display:'inline-block'}}/>
            {g.nom}
          </div>
        ))}
      </div>

      <div className="cal-grid">
        {DAYS_FR.map(d=><div key={d} className="cal-day-name">{d}</div>)}
        {Array.from({length:firstDayOfWeek}).map((_,i)=><div key={`e${i}`}/>)}
        {Array.from({length:daysInMonth}).map((_,i) => {
          const day = i+1
          const entries = dayMap[day] || []
          const isToday = day === todayDay
          return (
            <div key={day} className={`cal-day ${isToday?'today':''}`}
              style={{position:'relative',paddingBottom: entries.length?'10px':undefined}}>
              <span style={{fontSize:13}}>{day}</span>
              {entries.length > 0 && (
                <div style={{position:'absolute',bottom:2,left:0,right:0,display:'flex',gap:1,justifyContent:'center',flexWrap:'wrap'}}>
                  {entries.map((e,idx) => (
                    <span key={idx} style={{
                      width: e.isTransition ? 3 : 5,
                      height: e.isTransition ? 5 : 5,
                      borderRadius: e.isTransition ? '1px' : '50%',
                      background: GITE_COLORS[e.colorIdx],
                      border: e.isTransition ? `1px solid ${GITE_COLORS[e.colorIdx]}` : 'none',
                      opacity: e.isEnd || e.isStart ? 1 : 0.7,
                    }}/>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Réservations du mois */}
      <div style={{marginTop:10,borderTop:'0.5px solid var(--border-2)',paddingTop:10}}>
        {allResas
          .filter(r => {
            const s = new Date(r.date_arrivee), e = new Date(r.date_depart)
            return (s.getFullYear()===year && s.getMonth()===month) ||
                   (e.getFullYear()===year && e.getMonth()===month)
          })
          .sort((a,b) => new Date(a.date_arrivee)-new Date(b.date_arrivee))
          .map(r => (
            <div key={r.id} style={{display:'flex',alignItems:'center',gap:8,padding:'6px 0',borderBottom:'0.5px solid var(--border-2)'}}>
              <span style={{width:8,height:8,borderRadius:'50%',background:GITE_COLORS[r.colorIdx],flexShrink:0}}/>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:13,fontWeight:500}}>{r.nom_locataire}</div>
                <div style={{fontSize:11,color:'var(--text-2)'}}>
                  {r.giteNom} · {new Date(r.date_arrivee).toLocaleDateString('fr-FR',{day:'numeric',month:'short'})} → {new Date(r.date_depart).toLocaleDateString('fr-FR',{day:'numeric',month:'short'})}
                  {' · '}<Users size={10} style={{display:'inline'}}/> {r.nb_personnes}
                </div>
              </div>
            </div>
          ))
        }
        {allResas.filter(r => {
          const s = new Date(r.date_arrivee), e = new Date(r.date_depart)
          return (s.getFullYear()===year && s.getMonth()===month) || (e.getFullYear()===year && e.getMonth()===month)
        }).length === 0 && <p className="empty-text">Aucune réservation ce mois.</p>}
      </div>
    </div>
  )
}

function CompteRendu({ gites }) {
  const { sessions } = useHeures()
  const { versements } = useVersements()
  const { soldeByProprietaire } = useFinances()

  // Map giteId -> proprietaire
  const giteProprietaire = {}
  gites.forEach(g => { giteProprietaire[g.id] = (g.proprietaire || '').trim() || 'Sans propriétaire' })

  // Heures par propriétaire (mode amiable uniquement)
  const heuresMap = {}
  sessions.forEach(s => {
    const gite = gites.find(g => g.id === s.gite_id)
    if (!gite || gite.mode_suivi !== 'amiable') return
    const prop = giteProprietaire[s.gite_id] || 'Sans propriétaire'
    if (!heuresMap[prop]) heuresMap[prop] = { proprietaire: prop, minutes: 0, giteNoms: new Set() }
    heuresMap[prop].minutes += s.duree_minutes
    heuresMap[prop].giteNoms.add(gite.nom)
  })

  // Versements par propriétaire (mode amiable uniquement - info seulement)
  const versMap = {}
  versements.forEach(v => {
    const gite = gites.find(g => g.id === v.gite_id)
    if (!gite || gite.mode_suivi !== 'amiable') return
    const prop = giteProprietaire[v.gite_id] || 'Sans propriétaire'
    if (!versMap[prop]) versMap[prop] = 0
    versMap[prop] += Number(v.montant)
  })

  // Soldes financiers (mode taux fixe/forfait uniquement)
  const soldes = soldeByProprietaire().filter(s => {
    return s.gites?.some(g => g.mode !== 'amiable')
  })

  const allProps = [...new Set([
    ...Object.keys(heuresMap),
    ...soldes.map(s => s.proprietaire),
  ])]

  if (allProps.length === 0 && gites.every(g => !g.proprietaire)) return (
    <div className="card">
      <div className="card-title" style={{marginBottom:'0.5rem'}}>Compte rendu par propriétaire</div>
      <p className="empty-text">Assignez des propriétaires aux gîtes dans les paramètres ⚙️</p>
    </div>
  )

  return (
    <div className="card">
      <div className="card-title" style={{marginBottom:'0.85rem'}}>Compte rendu par propriétaire</div>
      {allProps.length === 0 && <p className="empty-text">Aucune donnée à afficher.</p>}
      {allProps.map(prop => {
        const h = heuresMap[prop]
        const v = versMap[prop] || 0
        const s = soldes.find(x => x.proprietaire === prop)
        return (
          <div key={prop} style={{padding:'10px 0',borderBottom:'0.5px solid var(--border-2)'}}>
            <div style={{fontWeight:500,fontSize:14,marginBottom:6}}>{prop}</div>
            {h && h.minutes > 0 && (
              <div style={{fontSize:13,color:'var(--text-2)',marginBottom:3,display:'flex',alignItems:'center',gap:5}}>
                <Clock size={12} color="var(--text-3)"/>
                <span>{formatMinutes(h.minutes)} non réglées</span>
                {h.giteNoms.size > 0 && <span style={{fontSize:11,color:'var(--text-3)'}}>({[...h.giteNoms].join(', ')})</span>}
              </div>
            )}
            {v > 0 && (
              <div style={{fontSize:13,color:'var(--sage)',marginBottom:3,display:'flex',alignItems:'center',gap:5}}>
                <Euro size={12}/>
                <span>{fmt(v)} reçus (à l'amiable)</span>
              </div>
            )}
            {s && (
              <>
                {s.totalDu > 0 && (
                  <div style={{fontSize:13,color:'var(--warm)',marginBottom:3,display:'flex',alignItems:'center',gap:5}}>
                    <Euro size={12}/>
                    <span>{fmt(s.totalDu)} dus (taux fixe)</span>
                  </div>
                )}
                {s.solde > 0 && (
                  <div style={{fontSize:13,color:'var(--warm)',display:'flex',alignItems:'center',gap:5}}>
                    <Euro size={12}/>
                    <span>Reste à payer : {fmt(s.solde)}</span>
                  </div>
                )}
                {s.solde < 0 && (
                  <div style={{fontSize:13,color:'var(--sage)',display:'flex',alignItems:'center',gap:5}}>
                    <Euro size={12}/>
                    <span>Avance de {fmt(Math.abs(s.solde))}</span>
                  </div>
                )}
              </>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function Dashboard() {
  const { gites } = useGites()
  const allResas  = useAllReservations(gites)
  const allLow    = useAllStocks(gites)
  const [showAddResa, setShowAddResa] = useState(false)

  // Pour ajouter une résa depuis le dashboard, on utilise useReservations par gîte
  const handleAddResa = async (form) => {
    const { supabase } = await import('../lib/supabase.js')
    await supabase.from('gite_reservations').insert({
      gite_id: form.gite_id,
      nom_locataire: form.nom_locataire,
      date_arrivee: form.date_arrivee,
      date_depart: form.date_depart,
      nb_personnes: form.nb_personnes,
      statut: form.statut,
      notes: form.notes || ''
    })
    setShowAddResa(false)
  }

  return (
    <div>
      {/* Calendrier multi-gîtes */}
      <CalendarSection gites={gites} allResas={allResas} onAddResa={() => setShowAddResa(true)}/>

      {/* Stocks bas */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Stocks bas</span>
          {allLow.length === 0
            ? <span className="badge badge-green">Tout OK</span>
            : <span className="badge badge-amber">{allLow.length} article{allLow.length>1?'s':''}</span>
          }
        </div>
        {allLow.length === 0 && <p className="empty-text">Aucun stock en alerte.</p>}
        {allLow.map(s => (
          <div key={s.id} className="stock-item">
            <span className="stock-emoji">{s.emoji}</span>
            <span className="stock-name">{s.nom}</span>
            <span style={{fontSize:11,color:'var(--text-3)',background:'var(--bg)',padding:'2px 6px',borderRadius:8}}>{s.giteNom}</span>
            <AlertTriangle size={13} color="#c9853a" style={{marginLeft:'auto'}}/>
            <span className="qty-val low">{s.quantite}</span>
          </div>
        ))}
      </div>

      {/* Compte rendu par propriétaire */}
      <CompteRendu gites={gites}/>

      {showAddResa && (
        <AddResaModal
          gites={gites}
          onSave={handleAddResa}
          onClose={() => setShowAddResa(false)}/>
      )}
    </div>
  )
}
