import { useState } from 'react'
import { Plus, Trash2, X, Check, Euro, Clock } from 'lucide-react'
import { useFinances } from '../hooks/useFinances'
import { useHeures, formatMinutes } from '../hooks/useHeures'
import { useVersements } from '../hooks/useVersements'
import { useGites } from '../hooks/useGites'

function fmt(n) { return Number(n).toFixed(2).replace('.', ',') + ' €' }

function AddMontantModal({ giteId, giteName, onSave, onClose }) {
  const today = new Date().toISOString().split('T')[0]
  const [form, setForm] = useState({ montant: '', description: '', date_prestation: today })
  const [error, setError] = useState('')
  const set = (k,v) => setForm(f => ({...f,[k]:v}))
  const handleSave = () => {
    if (!form.montant || isNaN(parseFloat(form.montant))) { setError('Montant invalide'); return }
    onSave({ ...form, gite_id: giteId, montant: parseFloat(form.montant) })
  }
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Montant dû — {giteName}</h2>
          <button className="icon-btn" onClick={onClose}><X size={18}/></button>
        </div>
        <div className="form-grid">
          <div className="form-field">
            <label>Montant (€)</label>
            <input type="number" step="0.01" min="0" value={form.montant}
              onChange={e => set('montant', e.target.value)} placeholder="50.00" autoFocus/>
            {error && <div className="field-error">{error}</div>}
          </div>
          <div className="form-field">
            <label>Date</label>
            <input type="date" value={form.date_prestation} onChange={e => set('date_prestation', e.target.value)}/>
          </div>
          <div className="form-field full">
            <label>Description</label>
            <input value={form.description} onChange={e => set('description', e.target.value)} placeholder="Ménage complet, passage #3..."/>
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
  const [form, setForm] = useState({ montant: '', date_versement: today, note: '' })
  const [error, setError] = useState('')
  const set = (k,v) => setForm(f => ({...f,[k]:v}))
  const handleSave = () => {
    if (!form.montant || isNaN(parseFloat(form.montant))) { setError('Montant invalide'); return }
    onSave({ ...form, gite_id: giteId, montant: parseFloat(form.montant) })
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

export default function Finances({ giteId }) {
  const { gites } = useGites()
  const gite = gites.find(g => g.id === giteId)
  const { montantsDus, versements: finVersements, loading, addMontantDu, deleteMontantDu, addVersement: addFinVersement, deleteVersement, totalDu, totalRecu, soldeGlobal } = useFinances(giteId)
  const { sessions } = useHeures(giteId)
  const { versements, add: addVersement, remove: removeVersement } = useVersements(giteId)
  const [showAddDu, setShowAddDu]               = useState(false)
  const [showAddVersement, setShowAddVersement] = useState(false)
  const [activeTab, setActiveTab]               = useState('solde')
  const [proposeArchive, setProposeArchive]     = useState(false)

  if (loading) return <div className="loading">Chargement...</div>

  const solde = totalDu - totalRecu
  const totalHeures = sessions.reduce((s, h) => s + h.duree_minutes, 0)

  const handleAddVersement = async (form) => {
    await addFinVersement(form)
    setShowAddVersement(false)
    // Proposer archivage si versement >= solde restant
    const newRecu = totalRecu + form.montant
    if (newRecu >= totalDu && totalDu > 0) {
      setProposeArchive(true)
    }
  }

  return (
    <div>
      <div className="view-toggle" style={{ marginBottom:'0.85rem', width:'fit-content' }}>
        <button className={`toggle-btn ${activeTab==='solde'?'active':''}`} onClick={() => setActiveTab('solde')}>Solde</button>
        <button className={`toggle-btn ${activeTab==='dus'?'active':''}`} onClick={() => setActiveTab('dus')}>Montants dus</button>
        <button className={`toggle-btn ${activeTab==='versements'?'active':''}`} onClick={() => setActiveTab('versements')}>Versements</button>
      </div>

      {/* ── SOLDE ── */}
      {activeTab === 'solde' && (
        <>
          <div className="fin-summary">
            <div className="fin-summary-item">
              <div className="fin-summary-label">Total dû</div>
              <div className="fin-summary-val du">{fmt(totalDu)}</div>
            </div>
            <div className="fin-summary-sep"/>
            <div className="fin-summary-item">
              <div className="fin-summary-label">Total reçu</div>
              <div className="fin-summary-val recu">{fmt(totalRecu)}</div>
            </div>
            <div className="fin-summary-sep"/>
            <div className="fin-summary-item">
              <div className="fin-summary-label">Solde</div>
              <div className={`fin-summary-val ${solde>0?'positif':solde<0?'negatif':''}`}>
                {solde>0?'+':''}{fmt(solde)}
              </div>
            </div>
          </div>

          {totalHeures > 0 && (
            <div className="fin-heures-row">
              <Clock size={14} color="var(--text-2)"/>
              <span>{formatMinutes(totalHeures)} travaillées (heures saisies dans l'onglet Heures)</span>
            </div>
          )}

          {proposeArchive && (
            <div className="alert-banner" style={{ background:'var(--sage-light)', color:'var(--sage)' }}>
              <Check size={14}/>
              <span>Le versement couvre le montant dû.</span>
              <button className="btn-primary-sm" style={{ marginLeft:'auto' }}
                onClick={() => { setProposeArchive(false) }}>
                Archiver dans Heures
              </button>
            </div>
          )}

          <div style={{ display:'flex', gap:8, marginTop:4 }}>
            <button className="btn-add-item" style={{ flex:1 }} onClick={() => setShowAddDu(true)}>
              <Plus size={14}/> Montant dû
            </button>
            <button className="btn-add-item" style={{ flex:1, color:'var(--sage)' }} onClick={() => setShowAddVersement(true)}>
              <Plus size={14}/> Versement reçu
            </button>
          </div>
        </>
      )}

      {/* ── MONTANTS DUS ── */}
      {activeTab === 'dus' && (
        <>
          <button className="btn-add-item" onClick={() => setShowAddDu(true)}>
            <Plus size={14}/> Ajouter un montant dû
          </button>
          <div className="card">
            {montantsDus.length === 0 && <p className="empty-text">Aucun montant enregistré.</p>}
            {montantsDus.map(m => (
              <div key={m.id} className="fin-item">
                <div className="fin-item-left">
                  <div className="fin-item-title">{m.description || 'Prestation'}</div>
                  <div className="fin-item-meta">
                    {new Date(m.date_prestation).toLocaleDateString('fr-FR',{day:'numeric',month:'short',year:'numeric'})}
                  </div>
                </div>
                <span className="fin-montant du">{fmt(m.montant)}</span>
                <button className="icon-btn-xs danger" onClick={() => window.confirm('Supprimer ?') && deleteMontantDu(m.id)}>
                  <Trash2 size={12}/>
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── VERSEMENTS ── */}
      {activeTab === 'versements' && (
        <>
          <button className="btn-add-item" style={{ color:'var(--sage)' }} onClick={() => setShowAddVersement(true)}>
            <Plus size={14}/> Enregistrer un versement reçu
          </button>
          <div className="card">
            {finVersements.length === 0 && <p className="empty-text">Aucun versement enregistré.</p>}
            {finVersements.map(v => (
              <div key={v.id} className="fin-item">
                <div className="fin-item-left">
                  <div className="fin-item-title">{v.note || 'Versement'}</div>
                  <div className="fin-item-meta">
                    {new Date(v.date_versement).toLocaleDateString('fr-FR',{day:'numeric',month:'short',year:'numeric'})}
                  </div>
                </div>
                <span className="fin-montant recu">{fmt(v.montant)}</span>
                <button className="icon-btn-xs danger" onClick={() => window.confirm('Supprimer ?') && deleteVersement(v.id)}>
                  <Trash2 size={12}/>
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {showAddDu && (
        <AddMontantModal giteId={giteId} giteName={gite?.nom}
          onSave={async f => { await addMontantDu(f); setShowAddDu(false) }}
          onClose={() => setShowAddDu(false)}/>
      )}
      {showAddVersement && (
        <AddVersementModal giteId={giteId} giteName={gite?.nom}
          onSave={handleAddVersement}
          onClose={() => setShowAddVersement(false)}/>
      )}
    </div>
  )
}
