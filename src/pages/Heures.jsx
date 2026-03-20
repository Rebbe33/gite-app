import { useState } from 'react'
import { Plus, Trash2, X, Check, Clock, TrendingUp, ChevronDown, ChevronUp, Archive } from 'lucide-react'
import { useHeures, parseduree, formatMinutes } from '../hooks/useHeures'
import { useVersements } from '../hooks/useVersements'
import { useGites } from '../hooks/useGites'

const MONTHS_FR = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']
function formatMonth(str) {
  const [y,m] = str.split('-')
  return `${MONTHS_FR[parseInt(m)-1]} ${y}`
}
function fmt(n) { return Number(n).toFixed(2).replace('.', ',') + ' €' }

function AddSessionModal({ giteId, giteName, gite, onSave, onClose }) {
  const today = new Date().toISOString().split('T')[0]
  const [form, setForm] = useState({ duree: '', date_session: today, note: '' })
  const [error, setError] = useState('')
  const set = (k,v) => setForm(f => ({...f,[k]:v}))
  const handleSave = () => {
    const min = parseduree(form.duree)
    if (!min) { setError('Format invalide. Ex: 2h30, 1h, 45'); return }
    onSave({ ...form, gite_id: giteId, duree_minutes: min })
  }
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Ajouter des heures — {giteName}</h2>
          <button className="icon-btn" onClick={onClose}><X size={18}/></button>
        </div>
        {gite?.mode_suivi === 'taux_horaire' && gite.taux_horaire > 0 && (
          <div className="fin-heures-row" style={{marginBottom:8}}>
            <span>Taux : {gite.taux_horaire}€/h — montant dû calculé automatiquement</span>
          </div>
        )}
        {gite?.mode_suivi === 'forfait' && gite.forfait_montant > 0 && (
          <div className="fin-heures-row" style={{marginBottom:8}}>
            <span>Forfait : {gite.forfait_montant}€ par passage</span>
          </div>
        )}
        <div className="form-grid">
          <div className="form-field">
            <label>Durée</label>
            <input value={form.duree} onChange={e => set('duree', e.target.value)}
              placeholder="2h30 ou 1h ou 45" autoFocus/>
            {error && <div className="field-error">{error}</div>}
          </div>
          <div className="form-field">
            <label>Date</label>
            <input type="date" value={form.date_session} onChange={e => set('date_session', e.target.value)}/>
          </div>
          <div className="form-field full">
            <label>Note <span style={{color:'#9c9890'}}>(optionnel)</span></label>
            <input value={form.note} onChange={e => set('note', e.target.value)} placeholder="Ménage complet..."/>
          </div>
        </div>
        <div className="modal-actions">
          <button className="btn-gray" onClick={onClose}>Annuler</button>
          <button className="btn-primary" onClick={handleSave}><Check size={14}/> Enregistrer</button>
        </div>
      </div>
    </div>
  )
}

function AddVersementModal({ giteId, giteName, onSave, onClose }) {
  const today = new Date().toISOString().split('T')[0]
  const [form, setForm] = useState({ montant: '', date_versement: today, note: '', nb_heures_couvertes: '' })
  const [error, setError] = useState('')
  const set = (k,v) => setForm(f => ({...f,[k]:v}))
  const handleSave = () => {
    if (!form.montant || isNaN(parseFloat(form.montant))) { setError('Montant invalide'); return }
    onSave({ ...form, gite_id: giteId, montant: parseFloat(form.montant), nb_heures_couvertes: form.nb_heures_couvertes ? parseFloat(form.nb_heures_couvertes) : null })
  }
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Versement reçu — {giteName}</h2>
          <button className="icon-btn" onClick={onClose}><X size={18}/></button>
        </div>
        <div className="form-grid">
          <div className="form-field">
            <label>Montant reçu (€)</label>
            <input type="number" step="0.01" min="0" value={form.montant}
              onChange={e => set('montant', e.target.value)} placeholder="150.00" autoFocus/>
            {error && <div className="field-error">{error}</div>}
          </div>
          <div className="form-field">
            <label>Date</label>
            <input type="date" value={form.date_versement} onChange={e => set('date_versement', e.target.value)}/>
          </div>
          <div className="form-field">
            <label>Heures couvertes <span style={{color:'#9c9890'}}>(optionnel)</span></label>
            <input type="number" step="0.5" min="0" value={form.nb_heures_couvertes}
              onChange={e => set('nb_heures_couvertes', e.target.value)} placeholder="ex: 6"/>
          </div>
          <div className="form-field full">
            <label>Note</label>
            <input value={form.note} onChange={e => set('note', e.target.value)} placeholder="Espèces, virement..."/>
          </div>
        </div>
        <div className="modal-actions">
          <button className="btn-gray" onClick={onClose}>Annuler</button>
          <button className="btn-primary" onClick={handleSave}><Check size={14}/> Enregistrer</button>
        </div>
      </div>
    </div>
  )
}

function ArchiverModal({ gite, sessions, versements, onArchive, onClose }) {
  const [selectedSessions, setSelectedSessions]     = useState(sessions.map(s => s.id))
  const [selectedVersements, setSelectedVersements] = useState(versements.map(v => v.id))
  const [note, setNote] = useState('')
  const toggleS = id => setSelectedSessions(p => p.includes(id) ? p.filter(x=>x!==id) : [...p,id])
  const toggleV = id => setSelectedVersements(p => p.includes(id) ? p.filter(x=>x!==id) : [...p,id])
  const totalMin   = sessions.filter(s => selectedSessions.includes(s.id)).reduce((s,x)=>s+x.duree_minutes,0)
  const totalVerse = versements.filter(v => selectedVersements.includes(v.id)).reduce((s,v)=>s+Number(v.montant),0)
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e=>e.stopPropagation()} style={{maxHeight:'85dvh',overflowY:'auto'}}>
        <div className="modal-header">
          <h2 className="modal-title">Archiver — {gite?.nom}</h2>
          <button className="icon-btn" onClick={onClose}><X size={18}/></button>
        </div>
        <div style={{marginBottom:'1rem'}}>
          <div className="filter-label" style={{marginBottom:6}}>Sessions à archiver</div>
          {sessions.length === 0 && <p className="empty-text">Aucune session.</p>}
          {sessions.map(s => (
            <div key={s.id} className="session-item" style={{cursor:'pointer'}} onClick={() => toggleS(s.id)}>
              <div className={`checkbox ${selectedSessions.includes(s.id)?'checked':''}`}>
                {selectedSessions.includes(s.id) && <Check size={11} color="white" strokeWidth={3}/>}
              </div>
              <div className="session-left">
                <div className="session-meta">
                  {new Date(s.date_session).toLocaleDateString('fr-FR',{day:'numeric',month:'short',year:'numeric'})}
                  {s.note && ` · ${s.note}`}
                </div>
              </div>
              <span className="heures-badge">{formatMinutes(s.duree_minutes)}</span>
            </div>
          ))}
          <div style={{fontSize:13,fontWeight:500,color:'var(--sage)',marginTop:6}}>
            Total sélectionné : {formatMinutes(totalMin)}
          </div>
        </div>
        {versements.length > 0 && (
          <div style={{marginBottom:'1rem'}}>
            <div className="filter-label" style={{marginBottom:6}}>Versements à archiver</div>
            {versements.map(v => (
              <div key={v.id} className="session-item" style={{cursor:'pointer'}} onClick={() => toggleV(v.id)}>
                <div className={`checkbox ${selectedVersements.includes(v.id)?'checked':''}`}>
                  {selectedVersements.includes(v.id) && <Check size={11} color="white" strokeWidth={3}/>}
                </div>
                <div className="session-left">
                  <div className="session-meta">
                    {new Date(v.date_versement).toLocaleDateString('fr-FR',{day:'numeric',month:'short',year:'numeric'})}
                    {v.nb_heures_couvertes && ` · couvre ${v.nb_heures_couvertes}h`}
                    {v.note && ` · ${v.note}`}
                  </div>
                </div>
                <span className="heures-badge green">{fmt(v.montant)}</span>
              </div>
            ))}
            <div style={{fontSize:13,fontWeight:500,color:'var(--sage)',marginTop:6}}>
              Total versements : {fmt(totalVerse)}
            </div>
          </div>
        )}
        <div className="form-grid">
          <div className="form-field full">
            <label>Note d'archivage</label>
            <input value={note} onChange={e=>setNote(e.target.value)} placeholder="Point fait avec la propriétaire le..."/>
          </div>
        </div>
        <div className="modal-actions">
          <button className="btn-gray" onClick={onClose}>Annuler</button>
          <button className="btn-primary" onClick={() => onArchive(selectedSessions, selectedVersements, note)} disabled={selectedSessions.length===0}>
            <Archive size={14}/> Archiver la sélection
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Heures({ giteId }) {
  const { gites } = useGites()
  const gite = gites.find(g => g.id === giteId)
  const isAmiable = !gite || gite.mode_suivi === 'amiable'

  const { sessions, paiements, loading, addSession, deleteSession, deletePaiement, archiverSelection, statsByMonth, statsByYear } = useHeures(giteId)
  const { versements, add: addVersement, remove: removeVersement } = useVersements(giteId)

  const [showAdd, setShowAdd]                   = useState(false)
  const [showAddVersement, setShowAddVersement] = useState(false)
  const [archiverData, setArchiverData]         = useState(null)
  const [activeTab, setActiveTab]               = useState('courant')
  const [showSessions, setShowSessions]         = useState(true)
  const [showVersements, setShowVersements]     = useState(true)

  if (loading) return <div className="loading">Chargement...</div>

  const totalCourant = sessions.reduce((a,s)=>a+s.duree_minutes,0)
  const totalVerse   = versements.reduce((s,v)=>s+Number(v.montant),0)
  const hCouvertes   = versements.reduce((s,v)=>s+(v.nb_heures_couvertes||0),0)
  const byMonth = statsByMonth()
  const byYear  = statsByYear()

  return (
    <div>
      <div className="view-toggle" style={{marginBottom:'0.85rem',width:'fit-content'}}>
        <button className={`toggle-btn ${activeTab==='courant'?'active':''}`} onClick={()=>setActiveTab('courant')}><Clock size={13}/> En cours</button>
        <button className={`toggle-btn ${activeTab==='historique'?'active':''}`} onClick={()=>setActiveTab('historique')}><TrendingUp size={13}/> Historique</button>
      </div>

      {activeTab === 'courant' && (
        <>
          <div className="heures-total-card">
            <div>
              <div className="heures-total-label">Heures non réglées</div>
              {isAmiable && hCouvertes > 0 && <div style={{fontSize:12,color:'var(--sage)',marginTop:3}}>{hCouvertes}h couvertes par versements</div>}
              {isAmiable && totalVerse > 0 && <div style={{fontSize:12,color:'var(--sage)',marginTop:2}}>{fmt(totalVerse)} reçus</div>}
            </div>
            <div className="heures-total-val">{formatMinutes(totalCourant)}</div>
          </div>

          {isAmiable && (
            <button className="btn-outline-sm" style={{marginBottom:10,width:'100%',justifyContent:'center'}}
              onClick={() => setArchiverData({ gite, sessions, versements })}>
              <Archive size={13}/> Archiver une sélection
            </button>
          )}

          {sessions.length > 0 && (
            <div className="card">
              <div className="card-header" style={{cursor:'pointer'}} onClick={()=>setShowSessions(s=>!s)}>
                <span className="card-title">Sessions ({sessions.length})</span>
                {showSessions?<ChevronUp size={15} color="#9c9890"/>:<ChevronDown size={15} color="#9c9890"/>}
              </div>
              {showSessions && sessions.map(s=>(
                <div key={s.id} className="session-item">
                  <div className="session-left">
                    <div className="session-meta">
                      {new Date(s.date_session).toLocaleDateString('fr-FR',{day:'numeric',month:'short',year:'numeric'})}
                      {s.note && ` · ${s.note}`}
                    </div>
                  </div>
                  <span className="heures-badge">{formatMinutes(s.duree_minutes)}</span>
                  <button className="icon-btn-xs danger" onClick={()=>window.confirm('Supprimer ?')&&deleteSession(s.id)}><Trash2 size={12}/></button>
                </div>
              ))}
            </div>
          )}

          {isAmiable && (
            <div className="card">
              <div className="card-header" style={{cursor:'pointer'}} onClick={()=>setShowVersements(v=>!v)}>
                <span className="card-title">Versements reçus ({versements.length})</span>
                {showVersements?<ChevronUp size={15} color="#9c9890"/>:<ChevronDown size={15} color="#9c9890"/>}
              </div>
              {showVersements && (
                <>
                  {versements.length===0 && <p className="empty-text">Aucun versement.</p>}
                  {versements.map(v=>(
                    <div key={v.id} className="session-item">
                      <div className="session-left">
                        <div className="session-meta">
                          {new Date(v.date_versement).toLocaleDateString('fr-FR',{day:'numeric',month:'short',year:'numeric'})}
                          {v.nb_heures_couvertes && ` · couvre ${v.nb_heures_couvertes}h`}
                          {v.note && ` · ${v.note}`}
                        </div>
                      </div>
                      <span className="heures-badge green">{fmt(v.montant)}</span>
                      <button className="icon-btn-xs danger" onClick={()=>window.confirm('Supprimer ?')&&removeVersement(v.id)}><Trash2 size={12}/></button>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}

          {isAmiable ? (
            <div style={{display:'flex',gap:8}}>
              <button className="btn-add-item" style={{flex:1}} onClick={()=>setShowAdd(true)}>
                <Plus size={14}/> Ajouter des heures
              </button>
              <button className="btn-add-item" style={{flex:1,color:'var(--sage)'}} onClick={()=>setShowAddVersement(true)}>
                <Plus size={14}/> Versement reçu
              </button>
            </div>
          ) : (
            <button className="btn-add-item" onClick={()=>setShowAdd(true)}>
              <Plus size={14}/> Ajouter des heures
            </button>
          )}
        </>
      )}

      {activeTab === 'historique' && (
        <>
          {byYear.length > 0 && (
            <div className="card">
              <div className="card-title" style={{marginBottom:'0.85rem'}}>Par année</div>
              {byYear.map(({year,minutes})=>(
                <div key={year} className="stat-row">
                  <span className="stat-row-label">{year}</span>
                  <div className="stat-row-bar-wrap"><div className="stat-row-bar" style={{width:`${Math.min(100,minutes/600*100)}%`}}/></div>
                  <span className="stat-row-val">{formatMinutes(minutes)}</span>
                </div>
              ))}
            </div>
          )}
          {byMonth.length > 0 && (
            <div className="card">
              <div className="card-title" style={{marginBottom:'0.85rem'}}>Par mois</div>
              {byMonth.map(({month,minutes})=>(
                <div key={month} className="stat-row">
                  <span className="stat-row-label">{formatMonth(month)}</span>
                  <div className="stat-row-bar-wrap"><div className="stat-row-bar" style={{width:`${Math.min(100,minutes/300*100)}%`}}/></div>
                  <span className="stat-row-val">{formatMinutes(minutes)}</span>
                </div>
              ))}
            </div>
          )}
          {paiements.length > 0 && (
            <div className="card">
              <div className="card-title" style={{marginBottom:'0.85rem'}}>Périodes archivées</div>
              {paiements.map(p=>(
                <div key={p.id} className="paiement-item">
                  <div className="paiement-left">
                    <div className="paiement-meta">
                      Du {new Date(p.periode_debut).toLocaleDateString('fr-FR',{day:'numeric',month:'short'})} au{' '}
                      {new Date(p.periode_fin).toLocaleDateString('fr-FR',{day:'numeric',month:'short',year:'numeric'})}
                    </div>
                    {p.note && <div className="paiement-note">{p.note}</div>}
                  </div>
                  <div className="paiement-right">
                    <span className="heures-badge">{formatMinutes(p.total_minutes)}</span>
                    <button className="icon-btn-xs danger" onClick={()=>window.confirm('Supprimer ?')&&deletePaiement(p.id)}><Trash2 size={12}/></button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {paiements.length===0 && byMonth.length===0 && (
            <div className="empty-tasks"><TrendingUp size={28} color="#9c9890"/><p>Aucun historique.</p></div>
          )}
        </>
      )}

      {showAdd && (
        <AddSessionModal giteId={giteId} giteName={gite?.nom} gite={gite}
          onSave={async f=>{await addSession(f);setShowAdd(false)}}
          onClose={()=>setShowAdd(false)}/>
      )}
      {showAddVersement && isAmiable && (
        <AddVersementModal giteId={giteId} giteName={gite?.nom}
          onSave={async f=>{await addVersement(f);setShowAddVersement(false)}}
          onClose={()=>setShowAddVersement(false)}/>
      )}
      {archiverData && (
        <ArchiverModal
          gite={archiverData.gite}
          sessions={archiverData.sessions}
          versements={archiverData.versements}
          onArchive={async(sIds,vIds,note)=>{
            await archiverSelection(giteId,sIds,vIds,note)
            setArchiverData(null)
          }}
          onClose={()=>setArchiverData(null)}/>
      )}
    </div>
  )
}
