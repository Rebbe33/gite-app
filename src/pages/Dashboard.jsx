import { useState, useMemo } from 'react'
import { useAllReservations } from '../hooks/useReservations'
import { useStocks } from '../hooks/useStocks'
import { useFinances } from '../hooks/useFinances'
import { useHeures, formatMinutes } from '../hooks/useHeures'
import { useVersements } from '../hooks/useVersements'
import { AlertTriangle, Clock, Euro, Plus, X, Check, Users } from 'lucide-react'
import Menage from './Menage'

const GITE_COLORS = ['#4a7c59','#185fa5','#c9853a','#7c4a7c','#b33030']
const MONTHS_FR   = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']
const DAYS_FR     = ['L','M','M','J','V','S','D']

function fmt(n) { return Number(n).toFixed(2).replace('.', ',') + ' €' }

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

// ─── Encadré urgence ménage ───────────────────────────────────────────────────
function UrgencyCard({ cleaning, onFaire, onDejaFait }) {
  const { giteNom, prevResa, nextResa, daysLeft, colorIdx } = cleaning

  let emoji, message, color, bg, border
  if (daysLeft <= 0) {
    emoji = '🚨'
    message = 'Urgent — les prochains locataires arrivent aujourd\'hui !'
    color = '#b33030'; bg = '#fff5f5'; border = '#ffb3b3'
  } else if (daysLeft === 1) {
    emoji = '⚠️'
    message = 'Plus qu\'1 jour avant les prochains locataires'
    color = '#c9853a'; bg = '#fffaf0'; border = '#ffd599'
  } else if (daysLeft === 2) {
    emoji = '🕐'
    message = 'Plus que 2 jours pour faire le ménage'
    color = '#c9853a'; bg = '#fffcf0'; border = '#ffe5b3'
  } else {
    emoji = '🧹'
    message = `Plus que ${daysLeft} jours pour faire le ménage`
    color = '#4a7c59'; bg = '#f4faf6'; border = '#b3d9c0'
  }

  return (
    <div style={{
      background: bg,
      border: `1px solid ${border}`,
      borderLeft: `4px solid ${color}`,
      borderRadius: 12,
      padding: '12px 14px',
      marginBottom: 10,
    }}>
      {/* Titre */}
      <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:8 }}>
        <span style={{ fontSize:16 }}>{emoji}</span>
        <span style={{ fontWeight:600, fontSize:13, color }}>{message}</span>
      </div>

      {/* Gîte + détails */}
      <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:6 }}>
        <span style={{ width:8, height:8, borderRadius:'50%', background: GITE_COLORS[colorIdx], display:'inline-block', flexShrink:0 }}/>
        <span style={{ fontWeight:600, fontSize:13 }}>{giteNom}</span>
      </div>
      <div style={{ fontSize:12, color:'var(--text-2)', marginBottom:4, paddingLeft:14 }}>
        🚪 Départ : <strong>{prevResa.nom_locataire}</strong> le{' '}
        {new Date(prevResa.date_depart).toLocaleDateString('fr-FR',{weekday:'short',day:'numeric',month:'long'})}
      </div>
      <div style={{ fontSize:12, color:'var(--text-2)', marginBottom:10, paddingLeft:14 }}>
        🏠 Arrivée : <strong>{nextResa.nom_locataire}</strong> le{' '}
        {new Date(nextResa.date_arrivee).toLocaleDateString('fr-FR',{weekday:'short',day:'numeric',month:'long'})}
        {nextResa.nb_personnes ? ` · ${nextResa.nb_personnes} pers.` : ''}
      </div>

      {/* Actions */}
      <div style={{ display:'flex', gap:8 }}>
        <button
          onClick={() => onFaire(cleaning)}
          style={{
            flex: 1, background: color, color: '#fff', border: 'none',
            borderRadius: 8, padding: '9px 0', fontSize: 13, fontWeight: 600,
            cursor: 'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:6,
          }}>
          🧹 Faire le ménage
        </button>
        <button
          onClick={() => onDejaFait(cleaning)}
          style={{
            padding: '9px 14px', background: 'transparent',
            border: `1px solid ${border}`, borderRadius: 8,
            fontSize: 12, color: 'var(--text-2)', cursor: 'pointer', whiteSpace:'nowrap',
          }}>
          Déjà fait ✓
        </button>
      </div>
    </div>
  )
}

// ─── Popup ménage ─────────────────────────────────────────────────────────────
function MenagePopup({ giteId, giteNom, onPassageClosed, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        onClick={e => e.stopPropagation()}
        style={{ maxHeight:'90dvh', overflowY:'auto', width:'100%', maxWidth:520 }}>
        <div className="modal-header" style={{ position:'sticky', top:0, background:'var(--card)', zIndex:1 }}>
          <h2 className="modal-title">🧹 Ménage — {giteNom}</h2>
          <button className="icon-btn" onClick={onClose}><X size={18}/></button>
        </div>
        <div style={{ padding:'0 2px' }}>
          <Menage giteId={giteId} onPassageClosed={onPassageClosed} />
        </div>
      </div>
    </div>
  )
}

// ─── Calendrier ───────────────────────────────────────────────────────────────
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

  const dayMap = {}
  allResas.forEach(r => {
    const start = new Date(r.date_arrivee)
    const end   = new Date(r.date_depart)
    for (let d = new Date(start); d <= end; d.setDate(d.getDate()+1)) {
      if (d.getFullYear()===year && d.getMonth()===month) {
        const key = d.getDate()
        if (!dayMap[key]) dayMap[key] = []
        const existing = dayMap[key].find(x=>x.colorIdx===r.colorIdx)
        if (!existing) dayMap[key].push({ colorIdx: r.colorIdx, resaId: r.id, isStart: d.getTime()===start.getTime(), isEnd: d.getTime()===end.getTime() })
        else if (existing.resaId !== r.id) existing.isTransition = true
      }
    }
  })

  const daysInMonth    = new Date(year, month+1, 0).getDate()
  const firstDayOfWeek = (new Date(year, month, 1).getDay()+6)%7
  const todayDay = today.getFullYear()===year && today.getMonth()===month ? today.getDate() : -1

  const monthResas = allResas
    .filter(r => {
      const s = new Date(r.date_arrivee), e = new Date(r.date_depart)
      return (s.getFullYear()===year && s.getMonth()===month) || (e.getFullYear()===year && e.getMonth()===month)
    })
    .sort((a,b) => new Date(a.date_arrivee)-new Date(b.date_arrivee))

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
              style={{position:'relative',paddingBottom:entries.length?'10px':undefined}}>
              <span style={{fontSize:13}}>{day}</span>
              {entries.length > 0 && (
                <div style={{position:'absolute',bottom:2,left:0,right:0,display:'flex',gap:1,justifyContent:'center',flexWrap:'wrap'}}>
                  {entries.map((e,idx) => (
                    <span key={idx} style={{
                      width: e.isTransition ? 3 : 5, height: 5,
                      borderRadius: e.isTransition ? '1px' : '50%',
                      background: GITE_COLORS[e.colorIdx],
                      opacity: e.isEnd || e.isStart ? 1 : 0.7,
                    }}/>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
      <div style={{marginTop:10,borderTop:'0.5px solid var(--border-2)',paddingTop:10}}>
        {monthResas.length === 0 && <p className="empty-text">Aucune réservation ce mois.</p>}
        {monthResas.map(r => (
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
        ))}
      </div>
    </div>
  )
}

function CompteRendu({ gites }) {
  const { sessions } = useHeures()
  const { versements } = useVersements()
  const { soldeByProprietaire } = useFinances()

  const giteProprietaire = {}
  gites.forEach(g => { giteProprietaire[g.id] = (g.proprietaire || '').trim() || 'Sans propriétaire' })

  const heuresMap = {}
  sessions.forEach(s => {
    const gite = gites.find(g => g.id === s.gite_id)
    if (!gite || gite.mode_suivi !== 'amiable') return
    const prop = giteProprietaire[s.gite_id] || 'Sans propriétaire'
    if (!heuresMap[prop]) heuresMap[prop] = { proprietaire: prop, minutes: 0, giteNoms: new Set() }
    heuresMap[prop].minutes += s.duree_minutes
    heuresMap[prop].giteNoms.add(gite.nom)
  })

  const versMap = {}
  versements.forEach(v => {
    const gite = gites.find(g => g.id === v.gite_id)
    if (!gite || gite.mode_suivi !== 'amiable') return
    const prop = giteProprietaire[v.gite_id] || 'Sans propriétaire'
    if (!versMap[prop]) versMap[prop] = 0
    versMap[prop] += Number(v.montant)
  })

  const soldes = soldeByProprietaire().filter(s => s.gites?.some(g => g.mode !== 'amiable'))
  const allProps = [...new Set([...Object.keys(heuresMap), ...soldes.map(s => s.proprietaire)])]

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
                <Euro size={12}/><span>{fmt(v)} reçus (à l'amiable)</span>
              </div>
            )}
            {s && (
              <>
                {s.totalDu > 0 && (
                  <div style={{fontSize:13,color:'var(--warm)',marginBottom:3,display:'flex',alignItems:'center',gap:5}}>
                    <Euro size={12}/><span>{fmt(s.totalDu)} dus (taux fixe)</span>
                  </div>
                )}
                {s.solde > 0 && (
                  <div style={{fontSize:13,color:'var(--warm)',display:'flex',alignItems:'center',gap:5}}>
                    <Euro size={12}/><span>Reste à payer : {fmt(s.solde)}</span>
                  </div>
                )}
                {s.solde < 0 && (
                  <div style={{fontSize:13,color:'var(--sage)',display:'flex',alignItems:'center',gap:5}}>
                    <Euro size={12}/><span>Avance de {fmt(Math.abs(s.solde))}</span>
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

// ─── Dashboard ────────────────────────────────────────────────────────────────
export default function Dashboard({ gites = [] }) {
  const rawResas = useAllReservations(gites)
  const allLow   = useAllStocks(gites)
  const [showAddResa, setShowAddResa] = useState(false)
  const [menagePopup, setMenagePopup] = useState(null)

  const [dismissedKeys, setDismissedKeys] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem('passage-dismissed') || '[]')) }
    catch { return new Set() }
  })

  const dismiss = (key) => {
    const next = new Set([...dismissedKeys, key])
    setDismissedKeys(next)
    localStorage.setItem('passage-dismissed', JSON.stringify([...next]))
  }

  const allResas = useMemo(() =>
    rawResas
      .filter(r => r.statut !== 'annule')
      .map(r => {
        const idx = gites.findIndex(g => g.id === r.gite_id)
        return { ...r, colorIdx: idx >= 0 ? idx : 0, giteNom: gites[idx]?.nom ?? '' }
      }),
    [rawResas, gites]
  )

  // ── Alertes ménage : fenêtre entre deux réservations ──────────────────────
  // On cherche les paires consécutives (départ client A → arrivée client B)
  // et on alerte si aujourd'hui est dans cette fenêtre de ménage
  const urgentCleanings = useMemo(() => {
    const today = new Date(); today.setHours(0,0,0,0)
    const results = []

    // Grouper par gîte
    const byGite = {}
    allResas.forEach(r => {
      if (!byGite[r.gite_id]) byGite[r.gite_id] = []
      byGite[r.gite_id].push(r)
    })

    Object.entries(byGite).forEach(([giteId, resas]) => {
      // Trier par date d'arrivée
      const sorted = [...resas].sort((a,b) => new Date(a.date_arrivee) - new Date(b.date_arrivee))

      for (let i = 0; i < sorted.length - 1; i++) {
        const prev = sorted[i]
        const next = sorted[i + 1]

        const depart  = new Date(prev.date_depart);  depart.setHours(0,0,0,0)
        const arrivee = new Date(next.date_arrivee); arrivee.setHours(0,0,0,0)

        // On est dans la fenêtre de ménage si :
        // aujourd'hui >= date de départ ET aujourd'hui < date d'arrivée suivante
        if (today >= depart && today <= arrivee) {
          const daysLeft = Math.round((arrivee - today) / 86400000)
          const key = `clean-${prev.id}-${next.id}`
          if (!dismissedKeys.has(key)) {
            results.push({
              giteId,
              giteNom: prev.giteNom,
              colorIdx: prev.colorIdx,
              prevResa: prev,
              nextResa: next,
              daysLeft,
              key,
            })
          }
        }
      }
    })

    return results.sort((a,b) => a.daysLeft - b.daysLeft)
  }, [allResas, dismissedKeys])

  const handleAddResa = async (form) => {
    const { supabase } = await import('../lib/supabase.js')
    await supabase.from('gite_reservations').insert({
      gite_id: form.gite_id, nom_locataire: form.nom_locataire,
      date_arrivee: form.date_arrivee, date_depart: form.date_depart,
      nb_personnes: form.nb_personnes, statut: form.statut, notes: form.notes || ''
    })
    setShowAddResa(false)
  }

  return (
    <div>
      {/* ── Alertes ménage ── */}
      {urgentCleanings.map(cleaning => (
        <UrgencyCard
          key={cleaning.key}
          cleaning={cleaning}
          onFaire={(c) => setMenagePopup({ giteId: c.giteId, giteNom: c.giteNom, key: c.key })}
          onDejaFait={(c) => dismiss(c.key)}
        />
      ))}

      <CalendarSection gites={gites} allResas={allResas} onAddResa={() => setShowAddResa(true)}/>

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

      <CompteRendu gites={gites}/>

      {showAddResa && (
        <AddResaModal gites={gites} onSave={handleAddResa} onClose={() => setShowAddResa(false)}/>
      )}

      {menagePopup && (
        <MenagePopup
          giteId={menagePopup.giteId}
          giteNom={menagePopup.giteNom}
          onPassageClosed={() => { dismiss(menagePopup.key); setMenagePopup(null) }}
          onClose={() => setMenagePopup(null)}
        />
      )}
    </div>
  )
}
