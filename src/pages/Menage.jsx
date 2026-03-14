import { useState } from 'react'
import { ChevronDown, ChevronUp, Check, AlertCircle, Eye, Plus, Pencil, Trash2, X, Upload } from 'lucide-react'
import { useTasks } from '../hooks/useTasks'
import { FREQ_INFO, ZONE_ICONS, ZONE_ICON_DEFAULT, parseTasksExcel } from '../lib/excel'

function TaskEditModal({ task, onSave, onClose }) {
  const [form, setForm] = useState(task || { zone: '', element: '', tache: '', freq: 1 })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{task ? 'Modifier la tâche' : 'Nouvelle tâche'}</h2>
          <button className="icon-btn" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="form-grid">
          <div className="form-field">
            <label>Zone</label>
            <input value={form.zone} onChange={e => set('zone', e.target.value)} placeholder="Cuisine, Salon..." />
          </div>
          <div className="form-field">
            <label>Élément</label>
            <input value={form.element} onChange={e => set('element', e.target.value)} placeholder="Plan de travail" />
          </div>
          <div className="form-field full">
            <label>Tâche</label>
            <input value={form.tache} onChange={e => set('tache', e.target.value)} placeholder="Nettoyer et désinfecter" />
          </div>
          <div className="form-field">
            <label>Fréquence (tous les N passages)</label>
            <select value={form.freq} onChange={e => set('freq', parseInt(e.target.value))}>
              {[1,2,3,4,5,10,15,20].map(n => (
                <option key={n} value={n}>{n === 1 ? 'Chaque passage' : `Tous les ${n} passages`}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="modal-actions">
          <button className="btn-gray" onClick={onClose}>Annuler</button>
          <button className="btn-primary" onClick={() => onSave(form)}><Check size={14} /> Enregistrer</button>
        </div>
      </div>
    </div>
  )
}

export default function Menage({ giteId }) {
  const {
    tasks, passage, passageCount,
    toggleTask, closePassage, isTaskDone, isDue,
    importTasks, addTask, updateTask, deleteTask,
    loading,
  } = useTasks(giteId)

  const [viewMode, setViewMode] = useState('due')
  const [zoneFilter, setZoneFilter] = useState('all')
  const [freqFilter, setFreqFilter] = useState('all')
  const [expandedZones, setExpandedZones] = useState({})
  const [showCloseConfirm, setShowCloseConfirm] = useState(false)
  const [editingTask, setEditingTask] = useState(null)
  const [showAddTask, setShowAddTask] = useState(false)
  const [importError, setImportError] = useState(null)
  const [importing, setImporting] = useState(false)

  const nextPassage = passageCount + 1

  const handleToggle = async (taskId) => { await toggleTask(taskId) }

  const handleClosePassage = async () => {
    await closePassage()
    setShowCloseConfirm(false)
  }

  const dueTasks = tasks.filter(isDue)
  const visibleTasks = (viewMode === 'due' ? dueTasks : tasks).filter(t => {
    const zoneOk = zoneFilter === 'all' || t.zone === zoneFilter
    const freqOk = freqFilter === 'all' || String(t.freq) === freqFilter
    return zoneOk && freqOk
  })

  const zones = [...new Set(tasks.map(t => t.zone))]
  const freqs = [...new Set(tasks.map(t => t.freq))].sort((a, b) => a - b)

  const byZone = zones.reduce((acc, z) => {
    const ts = visibleTasks.filter(t => t.zone === z)
    if (ts.length) acc[z] = ts
    return acc
  }, {})

  const doneDue  = dueTasks.filter(t => isTaskDone(t.id)).length
  const pct      = dueTasks.length ? Math.round(doneDue / dueTasks.length * 100) : 0

  const handleImport = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true); setImportError(null)
    try {
      const parsed = await parseTasksExcel(file)
      if (!window.confirm(`Importer ${parsed.length} tâches ? Les tâches existantes seront remplacées.`)) return
      await importTasks(parsed)
    } catch (err) {
      setImportError(err.message)
    } finally {
      setImporting(false)
      e.target.value = ''
    }
  }

  if (loading) return <div className="loading">Chargement...</div>

  return (
    <div>
      {/* Stats passage */}
      <div className="passage-info-bar">
        <span className="passage-num-label">Passage #{nextPassage}</span>
        <span className="passage-progress">{doneDue}/{dueTasks.length} tâches dues</span>
        <div className="mini-progress">
          <div className="mini-fill" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* Barre d'outils */}
      <div className="toolbar">
        <div className="view-toggle">
          <button className={`toggle-btn ${viewMode==='due'?'active':''}`} onClick={() => setViewMode('due')}>
            <AlertCircle size={13} /> Tâches dues ({dueTasks.length})
          </button>
          <button className={`toggle-btn ${viewMode==='all'?'active':''}`} onClick={() => setViewMode('all')}>
            <Eye size={13} /> Toutes ({tasks.length})
          </button>
        </div>
        <div style={{ display:'flex', gap:6 }}>
          <button className="btn-outline-sm" onClick={() => setShowAddTask(true)} title="Ajouter une tâche">
            <Plus size={14} />
          </button>
          <label className="btn-outline-sm" title={importing ? 'Import en cours...' : 'Importer Excel'} style={{ cursor:'pointer' }}>
            <Upload size={14} />
            <input type="file" accept=".xlsx,.xls" style={{ display:'none' }} onChange={handleImport} />
          </label>
        </div>
      </div>

      {importError && (
        <div className="error-banner"><AlertCircle size={14} />{importError}</div>
      )}

      {/* Filtres */}
      <div className="filters">
        <div className="filter-pills">
          <button className={`pill ${zoneFilter==='all'?'active':''}`} onClick={() => setZoneFilter('all')}>Tout</button>
          {zones.map(z => (
            <button key={z} className={`pill ${zoneFilter===z?'active':''}`} onClick={() => setZoneFilter(z)}>
              {ZONE_ICONS[z] || ZONE_ICON_DEFAULT} {z}
            </button>
          ))}
        </div>
        <div className="filter-pills" style={{ marginTop:5 }}>
          <button className={`pill ${freqFilter==='all'?'active':''}`} onClick={() => setFreqFilter('all')}>Toutes fréq.</button>
          {freqs.map(f => {
            const info = FREQ_INFO[f] || { short: `×${f}`, color: '#6b6560', bg: '#f5f3f0' }
            return (
              <button key={f} className={`pill freq-pill ${freqFilter===String(f)?'active':''}`}
                style={{ '--fc': info.color, '--fb': info.bg }}
                onClick={() => setFreqFilter(String(f))}>
                {info.short}
              </button>
            )
          })}
        </div>
      </div>

      {/* Tâches groupées par zone */}
      {Object.keys(byZone).length === 0 && (
        <div className="empty-tasks">
          {tasks.length === 0
            ? <><Upload size={28} color="#9c9890" /><p>Aucune tâche. Importez un fichier Excel pour commencer.</p></>
            : <><Check size={28} color="#4a7c59" /><p>Aucune tâche avec ces filtres.</p></>
          }
        </div>
      )}

      {Object.entries(byZone).map(([zone, zoneTasks]) => {
        const zoneDone  = zoneTasks.filter(t => isTaskDone(t.id)).length
        const isOpen    = expandedZones[zone] !== false
        return (
          <div key={zone} className="zone-card">
            <div className="zone-header" onClick={() => setExpandedZones(p => ({ ...p, [zone]: !isOpen }))}>
              <div className="zone-left">
                <span className="zone-icon">{ZONE_ICONS[zone] || ZONE_ICON_DEFAULT}</span>
                <span className="zone-name">{zone}</span>
                <span className="zone-count">{zoneDone}/{zoneTasks.length}</span>
              </div>
              {isOpen ? <ChevronUp size={15} color="#9c9890" /> : <ChevronDown size={15} color="#9c9890" />}
            </div>

            {isOpen && (
              <ul className="task-list">
                {zoneTasks.map(t => {
                  const done    = isTaskDone(t.id)
                  const due     = isDue(t)
                  const freqInfo = FREQ_INFO[t.freq] || { short: `×${t.freq}`, color: '#6b6560', bg: '#f5f3f0' }
                  return (
                    <li key={t.id} className={`task-item ${done ? 'done' : ''} ${!due && viewMode==='all' ? 'not-due' : ''}`}>
                      <div className={`checkbox ${done ? 'checked' : ''}`}
                        onClick={() => handleToggle(t.id)}>
                        {done && <Check size={11} color="white" strokeWidth={3} />}
                      </div>
                      <div className="task-body" onClick={() => handleToggle(t.id)}>
                        <div className="task-element">{t.element}</div>
                        <div className="task-tache">{t.tache}</div>
                      </div>
                      <div className="task-right">
                        <span className="freq-badge" style={{ color: freqInfo.color, background: freqInfo.bg }}>
                          {freqInfo.short}
                        </span>
                        {!due && viewMode === 'all' && (
                          <span className="not-due-badge">pas due</span>
                        )}
                        <div className="task-actions">
                          <button className="icon-btn-xs" onClick={() => setEditingTask(t)}><Pencil size={12} /></button>
                          <button className="icon-btn-xs danger" onClick={() => window.confirm('Supprimer ?') && deleteTask(t.id)}><Trash2 size={12} /></button>
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        )
      })}

      {/* Clôture */}
      {tasks.length > 0 && (
        <div className="close-passage-wrap">
          {doneDue < dueTasks.length && (
            <div className="warning-row">
              <AlertCircle size={13} color="#c9853a" />
              <span>{dueTasks.length - doneDue} tâche(s) due(s) non cochée(s)</span>
            </div>
          )}
          <button className="btn-close-passage" onClick={() => setShowCloseConfirm(true)}>
            <Check size={15} /> Clôturer le passage #{nextPassage}
          </button>
        </div>
      )}

      {/* Modals */}
      {showCloseConfirm && (
        <div className="modal-overlay" onClick={() => setShowCloseConfirm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">Clôturer le passage #{nextPassage} ?</h2>
            <p className="modal-body">
              {doneDue} / {dueTasks.length} tâches dues cochées.
              {doneDue < dueTasks.length && <strong> {dueTasks.length - doneDue} tâche(s) non faite(s).</strong>}
            </p>
            <div className="modal-actions">
              <button className="btn-gray" onClick={() => setShowCloseConfirm(false)}>Annuler</button>
              <button className="btn-primary" onClick={handleClosePassage}>Confirmer</button>
            </div>
          </div>
        </div>
      )}

      {(showAddTask || editingTask) && (
        <TaskEditModal
          task={editingTask}
          onSave={async (form) => {
            if (editingTask) await updateTask(editingTask.id, form)
            else await addTask(form)
            setEditingTask(null); setShowAddTask(false)
          }}
          onClose={() => { setEditingTask(null); setShowAddTask(false) }}
        />
      )}
    </div>
  )
}
