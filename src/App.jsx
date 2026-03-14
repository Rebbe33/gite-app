import { useState } from 'react'
import { Calendar, ClipboardList, Package, StickyNote, Clock, Plus, Settings, X, Check, Pencil, Trash2, Upload } from 'lucide-react'
import { useGites } from './hooks/useGites'
import { parseTasksExcel } from './lib/excel'

import Planning from './pages/Planning'
import Heures   from './pages/Heures'
import NotifSettings from './components/NotifSettings'
import Menage   from './pages/Menage'
import Stocks   from './pages/Stocks'
import Notes    from './pages/Notes'
import './index.css'

function AddGiteModal({ onSave, onClose }) {
  const [name, setName]     = useState('')
  const [file, setFile]     = useState(null)
  const [tasks, setTasks]   = useState(null)
  const [error, setError]   = useState(null)
  const [loading, setLoading] = useState(false)

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
    try { await onSave(name.trim(), tasks || []) }
    finally { setLoading(false) }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Nouveau gîte</h2>
          <button className="icon-btn" onClick={onClose}><X size={18} /></button>
        </div>
        <div style={{marginBottom:'1rem'}}><NotifSettings /></div>
        <div className="form-grid">
          <div className="form-field full">
            <label>Nom du gîte</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Gîte du Passeur" autoFocus />
          </div>
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

function GiteSettings({ gite, onRename, onDelete, onClose }) {
  const [name, setName] = useState(gite.nom)
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Paramètres — {gite.nom}</h2>
          <button className="icon-btn" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="form-grid">
          <div className="form-field full">
            <label>Renommer</label>
            <input value={name} onChange={e => setName(e.target.value)} />
          </div>
        </div>
        <div className="modal-actions">
          <button className="btn-danger" onClick={() => window.confirm(`Supprimer ${gite.nom} et toutes ses données ?`) && onDelete(gite.id)}>
            <Trash2 size={14} /> Supprimer
          </button>
          <button className="btn-gray" onClick={onClose}>Fermer</button>
          <button className="btn-primary" onClick={() => onRename(gite.id, name)}>
            <Check size={14} /> Renommer
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
      {tab === 'notes'     && <Notes    giteId={gite.id} giteName={gite.nom} />}
      {tab === 'heures'    && <Heures />}
    </main>
  )
}

export default function App() {
  const { gites, loading, error, addGite, deleteGite, renameGite } = useGites()
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

  const handleAddGite = async (name, tasks) => {
    const gite = await addGite(name)
    if (tasks.length > 0) {
      const { supabase: sb } = await import('./lib/supabase')
      const toInsert = tasks.map(t => ({ ...t, gite_id: gite.id }))
      await sb.from('tasks').insert(toInsert)
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

        {/* Sélecteur gîtes */}
        {gites.length > 0 && (
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

        {/* Nom gîte actif */}
        {activeGite && (
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
        activeGite && <GiteApp gite={activeGite} tab={tab} setTab={setTab} />
      )}

      {/* NAV */}
      {gites.length > 0 && (
        <nav className="nav">
          {[
            { id: 'planning', label: 'Planning', Icon: Calendar },
            { id: 'menage',   label: 'Ménage',   Icon: ClipboardList },
            { id: 'stocks',   label: 'Stocks',   Icon: Package },
            { id: 'notes',    label: 'Notes',    Icon: StickyNote },
          { id: 'heures',   label: 'Heures',   Icon: Clock },
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
          onRename={async (id, nom) => { await renameGite(id, nom); setShowSettings(false) }}
          onDelete={async (id) => { await deleteGite(id); setActiveGiteId(null); setShowSettings(false) }}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  )
}
