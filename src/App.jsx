import { useState } from 'react'
import { Calendar, ClipboardList, Package, StickyNote, Clock, LayoutDashboard, Euro, Home, Plus, Settings, X, Check, Pencil, Trash2, Upload } from 'lucide-react'
import { useGites } from './hooks/useGites'
import { parseTasksExcel } from './lib/excel'

import Planning   from './pages/Planning'
import Dashboard  from './pages/Dashboard'
import Finances   from './pages/Finances'
import Heures   from './pages/Heures'
import NotifSettings from './components/NotifSettings'
import Menage   from './pages/Menage'
import Stocks   from './pages/Stocks'
import Notes    from './pages/Notes'
import './index.css'

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
    }
    finally { setLoading(false) }
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
            <label>Fichier Excel de tâches <span style={{ color:'#9c9890' }}>(optionnel, importable plus tard)</span></label>
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

// Composant interne pour avoir accès à useTasks dans le contexte du gîte actif
function GiteApp({ gite, tab, setTab }) {
  return (
    <main className="main">
      {tab === 'planning'  && <Planning giteId={gite.id} />}
      {tab === 'menage'    && <Menage   giteId={gite.id} />}
      {tab === 'stocks'    && <Stocks   giteId={gite.id} />}
      {tab === 'notes'     && <Notes     giteId={gite.id} giteName={gite.nom} />}
      {tab === 'heures'    && <Heures    giteId={gite.id} />}
      {tab === 'finances'  && <Finances  giteId={gite.id} />}
    </main>
  )
}

export default function App() {
  const { gites, loading, error, addGite, deleteGite, renameGite, updateGite } = useGites()
  const [activeGiteId, setActiveGiteId] = useState(null)
  const [tab, setTab] = useState('menage')
  const [showAddGite, setShowAddGite] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  const { supabase: sb } = (() => { try { return { supabase: true } } catch { return { supabase: false } } })()

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
      <div className="splash-sub" style={{ marginTop:8, fontSize:13 }}>Vérifiez votre fichier .env (VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY)</div>
    </div>
  )

  const handleAddGite = async (name, tasks, options = {}) => {
    const gite = await addGite(name)
    if (options && Object.keys(options).length > 0) {
      await updateGite(gite.id, options)
    }
    if (tasks.length > 0) {
      const { supabase } = await import('./lib/supabase.js')
      const toInsert = tasks.map(t => ({ ...t, gite_id: gite.id }))
      await supabase.from('gite_tasks').insert(toInsert)
    }
    setActiveGiteId(gite.id)
    setShowAddGite(false)
  }

  return (
    <div className="app">
      {/* HEADER */}
      <header className="header">
        <div className="header-top">
          <div className="logo">
            <span className="logo-icon">🏡</span>
            <div>
              <div className="logo-title">Gestion Gîtes</div>
            </div>
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

        {/* Sélecteur gîtes - caché sur dashboard */}
        {gites.length > 0 && tab !== 'dashboard' && (
          <div className="gite-tabs">
            {gites.map(g => (
              <button key={g.id}
                className={`gite-tab ${g.id === activeGite?.id ? 'active' : ''}`}
                onClick={() => setActiveGiteId(g.id)}>
                {g.nom}
              </button>
            ))}
          </div>
        )}

        {/* Nom gîte actif - caché sur dashboard */}
        {activeGite && tab !== 'dashboard' && (
          <div className="active-gite-name">{activeGite.nom}</div>
        )}
      </header>

      {/* Contenu */}
      {gites.length === 0 ? (
        <div className="empty-app">
          <div style={{ fontSize:'3rem' }}>🏡</div>
          <p>Aucun gîte configuré.</p>
          <button className="btn-primary" onClick={() => setShowAddGite(true)}>
            <Plus size={14} /> Créer mon premier gîte
          </button>
        </div>
      ) : (
        tab === 'dashboard' ? <main className="main"><Dashboard /></main> : activeGite && <GiteApp gite={activeGite} tab={tab} setTab={setTab} />
      )}

      {/* NAV */}
      {gites.length > 0 && tab !== 'dashboard' && (
        <nav className="nav">
          {[
           { id: 'planning',  label: 'Planning',  Icon: Calendar },
            { id: 'menage',    label: 'Ménage',    Icon: ClipboardList },
            { id: 'notes',     label: 'Notes',     Icon: StickyNote },
            ...(activeGite?.mode_suivi && activeGite.mode_suivi !== 'amiable' ? [{ id: 'finances', label: 'Finances', Icon: Euro }] : []),
            { id: 'stocks',    label: 'Stocks',    Icon: Package },
            { id: 'heures',    label: 'Heures',    Icon: Clock },
          ].map(({ id, label, Icon }) => (
            <button key={id} className={`nav-btn ${tab===id?'active':''}`} onClick={() => setTab(id)}>
              <Icon size={17} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      )}

      {showAddGite && (
        <AddGiteModal onSave={handleAddGite} onClose={() => setShowAddGite(false)} />
      )}

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
