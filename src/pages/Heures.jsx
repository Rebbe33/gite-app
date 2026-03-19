import { useState } from 'react'
import { Plus, Trash2, X, Check, Clock, TrendingUp, ChevronDown, ChevronUp, Euro, Archive } from 'lucide-react'
import { useHeures, parseduree, formatMinutes } from '../hooks/useHeures'
import { useVersements } from '../hooks/useVersements'
import { useGites } from '../hooks/useGites'

const MONTHS_FR = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']
function formatMonth(str) {
  const [y, m] = str.split('-')
  return `${MONTHS_FR[parseInt(m)-1]} ${y}`
}
function fmt(n) { return Number(n).toFixed(2).replace('.', ',') + ' €' }

function AddSessionModal({ gites, onSave, onClose }) {
  const today = new Date().toISOString().split('T')[0]
  const [form, setForm] = useState({ gite_id: gites[0]?.id || '', duree: '', date_session: today, note: '' })
  const [error, setError] = useState('')
  const set = (k,v) => setForm(f => ({...f,[k]:v}))
  const gite = gites.find(g => g.id === form.gite_id)

  const handleSave = () => {
    const min = parseduree(form.duree)
    if (!min) { setError('Format invalide. Ex: 2h30, 1h, 45'); return }
    onSave({ ...form, duree_minutes: min })
  }
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Ajouter des heures</h2>
          <button className="icon-btn" onClick={onClose}><X size={18}/></button>
        </div>
        {gite?.mode_suivi === 'taux_horaire' && gite.taux_horaire > 0 && (
          <div className="fin-heures-row" style={{marginBottom:8}}>
            <Euro size={13} color="var(--sage)"/>
            <span>Taux : {gite.taux_horaire}€/h — le montant dû sera calculé automatiquement</span>
          </div>
        )}
        {gite?.mode_suivi === 'forfait' && (
          <div className="fin-heures-row" style={{marginBottom:8}}>
            <Euro size={13} color="var(--sage)"/>
            <span>Forfait : {gite.forfait_montant}€ par passage</span>
          </div>
        )}
        <div className="form-grid">
          <div className="form-field full">
            <label>Gîte</label>
            <select value={form.gite_id} onChange={e => set('gite_id', e.target.value)}>
              {gites.map(g => <option key={g.id} value={g.id}>{g.nom}</option>)}
            </select>
          </div>
          <div className="form-field">
            <label>Durée</label>
            <input value={form.duree} onChange={e => set('duree', e.target.value)} placeholder="2h30 ou 1h ou 45" autoFocus/>
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

function AddVersementModal({ gites, onSave, onClose }) {
  const today = new Date().toISOString().split('T')[0]
  const [form, setForm] = useState({ gite_id: gites[0]?.id || '', montant: '', date_versement: today, note: '', nb_heures_couvertes: '' })
  const [error, setError] = useState('')
  const set = (k,v) => setForm(f => ({...f,[k]:v}))
  const gite = gites.find(g => g.id === form.gite_id)
  const isAmiable = !gite || gite.mode_suivi === 'amiable'

  const handleSave = () => {
    if (!form.montant || isNaN(parseFloat(form.montant))) { setError('Montant invalide'); return }
    onSave({ ...form, montant: parseFloat(form.montant), nb_heures_couvertes: form.nb_heures_couvertes ? parseFloat(form.nb_heures_couvertes) : null })
  }
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Versement reçu</h2>
          <button className="icon-btn" onClick={onClose}><X size={18}/></button>
        </div>
        <div className="form-grid">
          <div className="form-field full">
            <label>Gîte</label>
            <select value={form.gite_id} onChange={e => set('gite_id', e.target.value)}>
              {gites.map(g => <option key={g.id} value={g.id}>{g.nom}</option>)}
            </select>
          </div>
          <div className="form-field">
            <label>Montant reçu (€)</label>
            <input type="number" step="0.01" min="0" value={form.montant} onChange={e => set('montant', e.target.value)} placeholder="150.00" autoFocus/>
            {error && <div className="field-error">{error}</div>}
          </div>
          <div className="form-field">
            <label>Date</label>
            <input type="date" value={form.date_versement} onChange={e => set('date_versement', e.target.value)}/>
          </div>
          {isAmiable && (
            <div className="form-field">
              <label>Heures couvertes <span style={{color:'#9c9890'}}>(optionnel)</span></label>
              <input type="number" step="0.5" min="0" value={form.nb_heures_couvertes} onChange={e => set('nb_heures_couvertes', e.target.value)} placeholder="ex: 6"/>
            </div>
          )}
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
  const [selectedSessions, setSelectedSessions]   = useState(sessions.map(s => s.id))
  const [selectedVersements, setSelectedVersements] = useState(versements.map(v => v.id))
  const [note, setNote] = useState('')

  const toggleSession  = id => setSelectedSessions(prev => prev.includes(id) ? prev.filter(x=>x!==id) : [...prev, id])
  const toggleVersement = id => setSelectedVersements(prev => prev.includes(id) ? prev.filter(x=>x!==id) : [...prev, id])

  const totalMin = sessions.filter(s => selectedSessions.includes(s.id)).reduce((s,x) => s+x.duree_minutes, 0)
  const totalVerse = versements.filter(v => selectedVersements.includes(v.id)).reduce((s,v) => s+Number(v.montant), 0)

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{maxHeight:'85dvh',overflowY:'auto'}}>
        <div className="modal-header">
          <h2 className="modal-title">Archiver — {gite.nom}</h2>
          <button className="icon-btn" onClick={onClose}><X size={18}/></button>
        </div>

        <div style={{marginBottom:'1rem'}}>
          <div className="filter-label" style={{marginBottom:6}}>Sessions à archiver</div>
          {sessions.map(s => (
            <div key={s.id} className="session-item" style={{cursor:'pointer'}} onClick={() => toggleSession(s.id)}>
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
              <div key={v.id} className="session-item" style={{cursor:'pointer'}} onClick={() => toggleVersement(v.id)}>
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
            <input value={note} onChange={e => setNote(e.target.value)} placeholder="Point fait avec la propriétaire le..."/>
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
  const { sessions, paiements, loading, addSession, deleteSession, deletePaiement, archiverSelection, payerGite, statsByGite, statsByMonth, statsByYear } = useHeures(giteId)
  const { versements, add: addVersement, remove: removeVersement } = useVersements(giteId)
  const [showAdd, setShowAdd]             = useState(false)
  const [showAddVersement, setShowAddVersement] = useState(false)
  const [archiverGite, setArchiverGite]   = useState(null)
  const [activeTab, setActiveTab]         = useState('courant')
  const [showSessions, setShowSessions]   = useState(true)
  const [showVersements, setShowVersements] = useState(true)

  if (loading) return <div className="loading">Chargement...</div>

  const byGite    = statsByGite()
  const totalCourant = sessions.reduce((a,s) => a+s.duree_minutes, 0)
  const byMonth   = statsByMonth()
  const byYear    = statsByYear()

  return (
    <div>
      <div className="view-toggle" style={{marginBottom:'0.85rem',width:'fit-content'}}>
        <button className={`toggle-btn ${activeTab==='courant'?'active':''}`} onClick={() => setActiveTab('courant')}><Clock size={13}/> En cours</button>
        <button className={`toggle-btn ${activeTab==='historique'?'active':''}`} onClick={() => setActiveTab('historique')}><TrendingUp size={13}/> Historique</button>
      </div>

      {activeTab === 'courant' && (
        <>
          <div className="heures-total-card">
            <div className="heures-total-label">Total non réglé — tous gîtes</div>
            <div className="heures-total-val">{formatMinutes(totalCourant)}</div>
          </div>

          {byGite.length === 0 && <div className="empty-tasks"><Clock size={28} color="#9c9890"/><p>Aucune heure enregistrée.</p></div>}

          {byGite.map(g => {
            const giteObj = gites.find(x => x.id === g.gite_id)
            const isAmiable = !giteObj || giteObj.mode_suivi === 'amiable'
            const giteVersements = versements.filter(v => v.gite_id === g.gite_id)
            const totalVerse = giteVersements.reduce((s,v) => s+Number(v.montant), 0)
            const hCouvertes = giteVersements.reduce((s,v) => s+(v.nb_heures_couvertes||0), 0)
            const giteSessions = sessions.filter(s => s.gite_id === g.gite_id)

            return (
              <div key={g.gite_id} className="card">
                <div className="card-header">
                  <div>
                    <div className="card-title">{g.nom}</div>
                    <div style={{fontSize:12,color:'var(--text-3)',marginTop:2}}>{g.count} session{g.count>1?'s':''}</div>
                  </div>
                  <div style={{display:'flex',alignItems:'center',gap:8}}>
                    <span className="heures-badge">{formatMinutes(g.minutes)}</span>
                    <button className="btn-outline-sm" onClick={() => setArchiverGite({ gite: giteObj, sessions: giteSessions, versements: giteVersements })}>
                      <Archive size={13}/> Archiver
                    </button>
                  </div>
                </div>
                {giteVersements.length > 0 && (
                  <div className="fin-heures-row" style={{margin:'0 0 4px'}}>
                    <Euro size={13} color="var(--sage)"/>
                    <span>{fmt(totalVerse)} reçus{hCouvertes > 0 && ` · couvre ${hCouvertes}h`}</span>
                  </div>
                )}
              </div>
            )
          })}

          {sessions.length > 0 && (
            <div className="card">
              <div className="card-header" style={{cursor:'pointer'}} onClick={() => setShowSessions(s=>!s)}>
                <span className="card-title">Sessions ({sessions.length})</span>
                {showSessions ? <ChevronUp size={15} color="#9c9890"/> : <ChevronDown size={15} color="#9c9890"/>}
              </div>
              {showSessions && sessions.map(s => (
                <div key={s.id} className="session-item">
                  <div className="session-left">
                    <div className="session-gite">{s.gite_gites?.nom}</div>
                    <div className="session-meta">
                      {new Date(s.date_session).toLocaleDateString('fr-FR',{day:'numeric',month:'short',year:'numeric'})}
                      {s.note && ` · ${s.note}`}
                    </div>
                  </div>
                  <span className="heures-badge">{formatMinutes(s.duree_minutes)}</span>
                  <button className="icon-btn-xs danger" onClick={() => window.confirm('Supprimer ?') && deleteSession(s.id)}><Trash2 size={12}/></button>
                </div>
              ))}
            </div>
          )}

          <div className="card">
            <div className="card-header" style={{cursor:'pointer'}} onClick={() => setShowVersements(v=>!v)}>
              <span className="card-title">Versements reçus ({versements.length})</span>
              {showVersements ? <ChevronUp size={15} color="#9c9890"/> : <ChevronDown size={15} color="#9c9890"/>}
            </div>
            {showVersements && (
              <>
                {versements.length === 0 && <p className="empty-text">Aucun versement enregistré.</p>}
                {versements.map(v => (
                  <div key={v.id} className="session-item">
                    <div className="session-left">
                      <div className="session-gite">{v.gite_gites?.nom}</div>
                      <div className="session-meta">
                        {new Date(v.date_versement).toLocaleDateString('fr-FR',{day:'numeric',month:'short',year:'numeric'})}
                        {v.nb_heures_couvertes && ` · couvre ${v.nb_heures_couvertes}h`}
                        {v.note && ` · ${v.note}`}
                      </div>
                    </div>
                    <span className="heures-badge green">{fmt(v.montant)}</span>
                    <button className="icon-btn-xs danger" onClick={() => window.confirm('Supprimer ?') && removeVersement(v.id)}><Trash2 size={12}/></button>
                  </div>
                ))}
              </>
            )}
          </div>

          <div style={{display:'flex',gap:8}}>
            <button className="btn-add-item" style={{flex:1}} onClick={() => setShowAdd(true)}>
              <Plus size={14}/> Ajouter des heures
            </button>
            <button className="btn-add-item" style={{flex:1,color:'var(--sage)'}} onClick={() => setShowAddVersement(true)}>
              <Plus size={14}/> Versement reçu
            </button>
          </div>
        </>
      )}

      {activeTab === 'historique' && (
        <>
          {byYear.length > 0 && (
            <div className="card">
              <div className="card-title" style={{marginBottom:'0.85rem'}}>Par année</div>
              {byYear.map(({year,minutes}) => (
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
              {byMonth.map(({month,minutes}) => (
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
              {paiements.map(p => (
                <div key={p.id} className="paiement-item">
                  <div className="paiement-left">
                    <div className="paiement-gite">{p.gite_gites?.nom}</div>
                    <div className="paiement-meta">
                      Du {new Date(p.periode_debut).toLocaleDateString('fr-FR',{day:'numeric',month:'short'})} au{' '}
                      {new Date(p.periode_fin).toLocaleDateString('fr-FR',{day:'numeric',month:'short',year:'numeric'})}
                    </div>
                    {p.note && <div className="paiement-note">{p.note}</div>}
                  </div>
                  <div className="paiement-right">
                    <span className="heures-badge">{formatMinutes(p.total_minutes)}</span>
                    <button className="icon-btn-xs danger" onClick={() => window.confirm('Supprimer ?') && deletePaiement(p.id)}><Trash2 size={12}/></button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {paiements.length === 0 && byMonth.length === 0 && (
            <div className="empty-tasks"><TrendingUp size={28} color="#9c9890"/><p>Aucun historique disponible.</p></div>
          )}
        </>
      )}

      {showAdd && (
        <AddSessionModal gites={gites}
          onSave={async f => { await addSession(f); setShowAdd(false) }}
          onClose={() => setShowAdd(false)}/>
      )}
      {showAddVersement && (
        <AddVersementModal gites={gites}
          onSave={async f => { await addVersement(f); setShowAddVersement(false) }}
          onClose={() => setShowAddVersement(false)}/>
      )}
      {archiverGite && (
        <ArchiverModal
          gite={archiverGite.gite}
          sessions={archiverGite.sessions}
          versements={archiverGite.versements}
          onArchive={async (sIds, vIds, note) => {
            await archiverSelection(archiverGite.gite.id, sIds, vIds, note)
            setArchiverGite(null)
          }}
          onClose={() => setArchiverGite(null)}/>
      )}
    </div>
  )
}
