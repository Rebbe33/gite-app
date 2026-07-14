import { useState, Component } from 'react'
import { Calendar, ClipboardList, Package, StickyNote, Clock, Plus, Settings, X, Check, Trash2, Upload, Home } from 'lucide-react'
import { useGites } from './hooks/useGites'
import { parseTasksExcel } from './lib/excel'

import Planning   from './pages/Planning'
import Dashboard  from './pages/Dashboard'
import Finances   from './pages/Finances'
import Heures     from './pages/Heures'
import NotifSettings from './components/NotifSettings'
import Menage     from './pages/Menage'
import Stocks     from './pages/Stocks'
import Notes      from './pages/Notes'
import './index.css'

// ─── Error Boundary ───────────────────────────────────────────────────────────
class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null } }
  static getDerivedStateFromError(error) { return { error } }
  render() {
    if (this.state.error) return (
      <div style={{ padding: 24, background: '#fff1f0', border: '1px solid #ffccc7', borderRadius: 8, margin: 16 }}>
        <div style={{ fontWeight: 700, color: '#cf1322', marginBottom: 8 }}>💥 Erreur — {this.props.name}</div>
        <div style={{ fontFamily: 'monospace', fontSize: 13, color: '#333', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {this.state.error?.message}
          {'\n\n'}
          {this.state.error?.stack}
        </div>
        <button style={{ marginTop: 12, padding: '6px 14px', background: '#cf1322', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}
          onClick={() => this.setState({ error: null })}>Réessayer</button>
      </div>
    )
    return this.props.children
  }
}
// ──────────────────────────────────────────────────────────────────────────────

function AddGiteModal({ onSave, onClose }) {
  const [name, setName]         = useState('')
  const [modeSuivi, setModeSuivi] = useState('amiable')
  const [tauxHoraire, setTauxHoraire] = useState('')
  const [forfaitMontant, setForfaitMontant] = useState('')
  const [proprietaire, setProprietaire] = useState('')
  const [file, setFile]         = useState(null)
  const [tasks, setTasks]       = useState(null)
  const [error, setError]       = useState(null)
  const [loading, setLoading]   = useState(false)

  const handleFile = async (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f); setError(null)
    try {
      const parsed = await parseTasksExcel(f)
      setTasks(parsed)
    } catch (err) {
      setError(err.message); setTasks(null)
    }
  }

  const handleSave = async () => {
    if (!name.trim()) return
    setLoading(true)
    try {
      await onSave(name.trim(), tasks || [], {
        mode_suivi: modeSuivi,
        proprietaire,
        taux_horaire: modeSuivi === 'taux_horaire' ? parseFloat(tauxHoraire)||0 : 0,
        forfait_montant: modeSuivi === 'forfait' ? parseFloat(forfaitMontant)||0 : 0,
      })
    } finally { setLoading(false) }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Nouveau gîte</h2>
          <button className="icon-btn" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="form-grid">
          <div className="form-field full">
            <label>Nom du gîte</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Gîte du Passeur" autoFocus />
          </div>
          <div className="form-field full">
            <label>Propriétaire</label>
            <input value={proprietaire} onChange={e => setProprietaire(e.target.value)} placeholder="Mme Martin"/>
          </div>
          <div className="form-field full">
            <label>Mode de suivi financier</label>
            <select value={modeSuivi} onChange={e => setModeSuivi(e.target.value)}>
              <option value="amiable">{"À l'amiable"}</option>
              <option value="taux_horaire">Taux horaire</option>
              <option value="forfait">Forfait par passage</option>
            </select>
          </div>
          {modeSuivi === 'taux_horaire' && (
            <div className="form-field full">
              <label>Taux horaire (€/h)</label>
              <input type="number" step="0.5" min="0" value={tauxHoraire} onChange={e => setTauxHoraire(e.target.value)} placeholder="12.00"/>
            </div>
          )}
          {modeSuivi === 'forfait' && (
            <div className="form-field full">
              <label>Montant forfait (€)</label>
              <input type="number" step="1" min="0" value={forfaitMontant} onChange={e => setForfaitMontant(e.target.value)} placeholder="50.00"/>
            </div>
          )}
          <div className="form-field full">
            <label>Fichier Excel de tâches <span style={{ color:'#9c9890' }}>(optionnel)</span></label>
            <label className="file-drop">
              <Upload size={16} color="#9c9890" />
              <span>{file ? `${file.name} — ${tasks?.length ?? 0} tâches` : 'Choisir un fichier .xlsx'}</span>
              <input type="file" accept=".xlsx,.xls" style={{ display:'none' }} onChange={handleFile} />
            </label>
            {error && <div className="field-error">{error}</div>}
          </div>
        </div>
        <div className="modal-actions">
          <button className="btn-gray" onClick={onClose}>Annuler</button>
          <button className="btn-primary" onClick={handleSave} disabled={!name.trim() || loading}>
            <Check size={14} /> {loading ? 'Création...' : 'Créer le gîte'}
          </button>
        </div>
      </div>
    </div>
  )
}

function GiteSettings({ gite, onRename, onDelete, onUpdate, onClose }) {
  const [name, setName] = useState(gite.nom)
  const [proprietaire, setProprietaire] = useState(gite.proprietaire || '')
  const [modeSuivi, setModeSuivi] = useState(gite.mode_suivi || 'amiable')
  const [tauxHoraire, setTauxHoraire] = useState(gite.taux_horaire || 0)
  const [forfaitMontant, setForfaitMontant] = useState(gite.forfait_montant || 0)

  const handleSave = () => {
    onRename(gite.id, name)
    onUpdate(gite.id, {
      proprietaire,
      mode_suivi: modeSuivi,
      taux_horaire: modeSuivi === 'taux_horaire' ? parseFloat(tauxHoraire) : 0,
      forfait_montant: modeSuivi === 'forfait' ? parseFloat(forfaitMontant) : 0,
    })
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Paramètres — {gite.nom}</h2>
          <button className="icon-btn" onClick={onClose}><X size={18} /></button>
        </div>
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-2)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.05em' }}>Notifications</div>
          <NotifSettings />
        </div>
        <div className="form-grid">
          <div className="form-field full">
            <label>Nom du gîte</label>
            <input value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="form-field full">
            <label>Propriétaire</label>
            <input value={proprietaire} onChange={e => setProprietaire(e.target.value)} placeholder="Mme Martin"/>
          </div>
          <div className="form-field full">
            <label>Mode de suivi financier</label>
            <select value={modeSuivi} onChange={e => setModeSuivi(e.target.value)}>
              <option value="amiable">À l'amiable — heures + versements reçus</option>
              <option value="taux_horaire">Taux horaire — montant calculé automatiquement</option>
              <option value="forfait">Forfait par passage — montant fixe</option>
            </select>
          </div>
          {modeSuivi === 'taux_horaire' && (
            <div className="form-field full">
              <label>Taux horaire (€/h)</label>
              <input type="number" step="0.5" min="0" value={tauxHoraire}
                onChange={e => setTauxHoraire(e.target.value)} placeholder="12.00" />
            </div>
          )}
          {modeSuivi === 'forfait' && (
            <div className="form-field full">
              <label>Montant par passage (€)</label>
              <input type="number" step="1" min="0" value={forfaitMontant}
                onChange={e => setForfaitMontant(e.target.value)} placeholder="50.00" />
            </div>
          )}
        </div>
        <div className="modal-actions">
          <button className="btn-danger" onClick={() => window.confirm(`Supprimer ${gite.nom} et toutes ses données ?`) && onDelete(gite.id)}>
            <Trash2 size={14} /> Supprimer
          </button>
          <button className="btn-gray" onClick={onClose}>Fermer</button>
          <button className="btn-primary" onClick={handleSave}>
            <Check size={14} /> Enregistrer
          </button>
        </div>
      </div>
    </div>
  )
}

function GiteApp({ gite, tab, setTab }) {
  return (
    <main className="main">
      {tab === 'planning'  && <ErrorBoundary name="Planning"><Planning giteId={gite.id} /></ErrorBoundary>}
      {tab === 'menage'    && <ErrorBoundary name="Menage"><Menage   giteId={gite.id} /></ErrorBoundary>}
      {tab === 'stocks'    && <ErrorBoundary name="Stocks"><Stocks   giteId={gite.id} /></ErrorBoundary>}
      {tab === 'notes'     && <ErrorBoundary name="Notes"><Notes     giteId={gite.id} giteName={gite.nom} /></ErrorBoundary>}
      {tab === 'heures'    && <ErrorBoundary name="Heures"><Heures   giteId={gite.id} /></ErrorBoundary>}
      {tab === 'finances'  && <ErrorBoundary name="Finances"><Finances giteId={gite.id} /></ErrorBoundary>}
    </main>
  )
}

export default function App() {
  const { gites, loading, error, addGite, deleteGite, renameGite, updateGite } = useGites()
  const [activeGiteId, setActiveGiteId] = useState(null)
  const [tab, setTab] = useState('menage')
  const [showAddGite, setShowAddGite] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  const activeGite = gites.find(g => g.id === activeGiteId) || gites[0]

  if (loading) return (
    <div className="splash">
      <div className="splash-logo">🏡</div>
      <div className="splash-title">Gestion Gîtes</div>
      <div className="splash-sub">Connexion à Supabase...</div>
    </div>
  )

  if (error) return (
    <div className="splash">
      <div className="splash-logo">⚠️</div>
      <div className="splash-title">Erreur de connexion</div>
      <div className="splash-sub">{error}</div>
    </div>
  )

  const handleAddGite = async (name, tasks, options = {}) => {
    const gite = await addGite(name)
    if (options && Object.keys(options).length > 0) await updateGite(gite.id, options)
    if (tasks.length > 0) {
      const { supabase } = await import('./lib/supabase.js')
      await supabase.from('gite_tasks').insert(tasks.map(t => ({ ...t, gite_id: gite.id })))
    }
    setActiveGiteId(gite.id)
    setShowAddGite(false)
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-top">
          <div className="logo">
            <span className="logo-icon">🏡</span>
            <div><div className="logo-title">Gestion Gîtes</div></div>
          </div>
          <div className="header-actions">
            <button className={`icon-btn ${tab==='dashboard'?'icon-btn-active':''}`} onClick={() => setTab('dashboard')} title="Vue globale">
              <Home size={17} />
            </button>
            {activeGite && (
              <button className="icon-btn" onClick={() => setShowSettings(true)} title="Paramètres gîte">
                <Settings size={17} />
              </button>
            )}
            <button className="btn-add-gite" onClick={() => setShowAddGite(true)}>
              <Plus size={13} /> Gîte
            </button>
          </div>
        </div>

        {gites.length > 0 && (
          <div className="gite-tabs">
            {gites.map(g => (
              <button key={g.id}
                className={`gite-tab ${g.id === activeGite?.id ? 'active' : ''}`}
                onClick={() => { setActiveGiteId(g.id); if (tab === 'dashboard') setTab('menage') }}>
                {g.nom}
              </button>
            ))}
          </div>
        )}

        {activeGite && tab !== 'dashboard' && (
          <div className="active-gite-name">{activeGite.nom}</div>
        )}
      </header>

      {gites.length === 0 ? (
        <div className="empty-app">
          <div style={{ fontSize:'3rem' }}>🏡</div>
          <p>Aucun gîte configuré.</p>
          <button className="btn-primary" onClick={() => setShowAddGite(true)}>
            <Plus size={14} /> Créer mon premier gîte
          </button>
        </div>
      ) : (
        tab === 'dashboard'
          ? <main className="main"><ErrorBoundary name="Dashboard"><Dashboard /></ErrorBoundary></main>
          : activeGite && <GiteApp gite={activeGite} tab={tab} setTab={setTab} />
      )}

      {gites.length > 0 && tab !== 'dashboard' && (
        <nav className="nav">
          {[
            { id: 'planning', label: 'Planning', Icon: Calendar },
            { id: 'menage',   label: 'Ménage',   Icon: ClipboardList },
            { id: 'stocks',   label: 'Stocks',   Icon: Package },
            { id: 'notes',    label: 'Notes',    Icon: StickyNote },
            { id: 'heures',   label: 'Heures',   Icon: Clock },
          ].map(({ id, label, Icon }) => (
            <button key={id} className={`nav-btn ${tab===id?'active':''}`} onClick={() => setTab(id)}>
              <Icon size={17} /><span>{label}</span>
            </button>
          ))}
        </nav>
      )}

      {showAddGite && <AddGiteModal onSave={handleAddGite} onClose={() => setShowAddGite(false)} />}

      {showSettings && activeGite && (
        <GiteSettings
          gite={activeGite}
          onRename={async (id, nom) => { await renameGite(id, nom) }}
          onUpdate={async (id, updates) => { await updateGite(id, updates) }}
          onDelete={async (id) => { await deleteGite(id); setActiveGiteId(null); setShowSettings(false) }}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  )
}
