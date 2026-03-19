import { useState } from 'react'
import { Plus, Trash2, X, Check, TrendingUp, TrendingDown, Euro, Clock } from 'lucide-react'
import { useFinances } from '../hooks/useFinances'
import { useHeures, formatMinutes } from '../hooks/useHeures'
import { useGites } from '../hooks/useGites'

function fmt(n) {
  return Number(n).toFixed(2).replace('.', ',') + ' €'
}

function AddMontantModal({ gites, onSave, onClose }) {
  const today = new Date().toISOString().split('T')[0]
  const [form, setForm] = useState({ gite_id: gites[0]?.id || '', montant: '', description: '', date_prestation: today })
  const [error, setError] = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const handleSave = () => {
    if (!form.montant || isNaN(parseFloat(form.montant))) { setError('Montant invalide'); return }
    if (!form.gite_id) { setError('Sélectionnez un gîte'); return }
    onSave({ ...form, montant: parseFloat(form.montant) })
  }
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Ajouter un montant dû</h2>
          <button className="icon-btn" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="form-grid">
          <div className="form-field full">
            <label>Gîte</label>
            <select value={form.gite_id} onChange={e => set('gite_id', e.target.value)}>
              {gites.map(g => <option key={g.id} value={g.id}>{g.nom}</option>)}
            </select>
          </div>
          <div className="form-field">
            <label>Montant (€)</label>
            <input type="number" step="0.01" min="0" value={form.montant}
              onChange={e => set('montant', e.target.value)} placeholder="50.00" autoFocus />
            {error && <div className="field-error">{error}</div>}
          </div>
          <div className="form-field">
            <label>Date</label>
            <input type="date" value={form.date_prestation} onChange={e => set('date_prestation', e.target.value)} />
          </div>
          <div className="form-field full">
            <label>Description</label>
            <input value={form.description} onChange={e => set('description', e.target.value)}
              placeholder="Ménage complet, passage #3..." />
          </div>
        </div>
        <div className="modal-actions">
          <button className="btn-gray" onClick={onClose}>Annuler</button>
          <button className="btn-primary" onClick={handleSave}><Check size={14} /> Enregistrer</button>
        </div>
      </div>
    </div>
  )
}

function AddVersementModal({ gites, onSave, onClose }) {
  const today = new Date().toISOString().split('T')[0]
  const [form, setForm] = useState({ gite_id: gites[0]?.id || '', montant: '', date_versement: today, note: '' })
  const [error, setError] = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const handleSave = () => {
    if (!form.montant || isNaN(parseFloat(form.montant))) { setError('Montant invalide'); return }
    onSave({ ...form, montant: parseFloat(form.montant) })
  }
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Enregistrer un versement reçu</h2>
          <button className="icon-btn" onClick={onClose}><X size={18} /></button>
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
            <input type="number" step="0.01" min="0" value={form.montant}
              onChange={e => set('montant', e.target.value)} placeholder="150.00" autoFocus />
            {error && <div className="field-error">{error}</div>}
          </div>
          <div className="form-field">
            <label>Date</label>
            <input type="date" value={form.date_versement} onChange={e => set('date_versement', e.target.value)} />
          </div>
          <div className="form-field full">
            <label>Note</label>
            <input value={form.note} onChange={e => set('note', e.target.value)}
              placeholder="Espèces, virement, chèque..." />
          </div>
        </div>
        <div className="modal-actions">
          <button className="btn-gray" onClick={onClose}>Annuler</button>
          <button className="btn-primary" onClick={handleSave}><Check size={14} /> Enregistrer</button>
        </div>
      </div>
    </div>
  )
}

export default function Finances({ giteId }) {
  const { gites } = useGites()
  const { montantsDus, versements, loading, addMontantDu, deleteMontantDu, addVersement, deleteVersement, soldeByGite, totalDu, totalRecu, soldeGlobal } = useFinances(giteId)
  const { sessions } = useHeures(giteId)
  const [showAddDu, setShowAddDu] = useState(false)
  const [showAddVersement, setShowAddVersement] = useState(false)
  const [activeTab, setActiveTab] = useState('solde')

  if (loading) return <div className="loading">Chargement...</div>

  const soldes = soldeByGite()
  const totalHeures = sessions.reduce((s, h) => s + h.duree_minutes, 0)

  return (
    <div>
      {/* TABS */}
      <div className="view-toggle" style={{ marginBottom: '0.85rem', width: 'fit-content' }}>
        <button className={`toggle-btn ${activeTab === 'solde' ? 'active' : ''}`} onClick={() => setActiveTab('solde')}>
          Soldes
        </button>
        <button className={`toggle-btn ${activeTab === 'dus' ? 'active' : ''}`} onClick={() => setActiveTab('dus')}>
          Montants dus
        </button>
        <button className={`toggle-btn ${activeTab === 'versements' ? 'active' : ''}`} onClick={() => setActiveTab('versements')}>
          Versements
        </button>
      </div>

      {/* ── SOLDES ── */}
      {activeTab === 'solde' && (
        <>
          {/* Résumé global */}
          <div className="fin-summary">
            <div className="fin-summary-item">
              <div className="fin-summary-label">Total dû</div>
              <div className="fin-summary-val du">{fmt(totalDu)}</div>
            </div>
            <div className="fin-summary-sep" />
            <div className="fin-summary-item">
              <div className="fin-summary-label">Total reçu</div>
              <div className="fin-summary-val recu">{fmt(totalRecu)}</div>
            </div>
            <div className="fin-summary-sep" />
            <div className="fin-summary-item">
              <div className="fin-summary-label">Solde global</div>
              <div className={`fin-summary-val ${soldeGlobal > 0 ? 'positif' : soldeGlobal < 0 ? 'negatif' : ''}`}>
                {soldeGlobal > 0 ? '+' : ''}{fmt(soldeGlobal)}
              </div>
            </div>
          </div>

          {/* Heures en cours */}
          {totalHeures > 0 && (
            <div className="fin-heures-row">
              <Clock size={14} color="var(--text-2)" />
              <span>{formatMinutes(totalHeures)} travaillées (non liées aux montants)</span>
            </div>
          )}

          {/* Par gîte */}
          {soldes.length === 0 && (
            <div className="empty-tasks">
              <Euro size={28} color="#9c9890" />
              <p>Aucune donnée financière.</p>
            </div>
          )}

          {soldes.map(g => (
            <div key={g.gite_id} className="card">
              <div className="card-header">
                <span className="card-title">{g.nom}</span>
                <span className={`fin-solde-badge ${g.solde > 0 ? 'positif' : g.solde < 0 ? 'negatif' : 'zero'}`}>
                  {g.solde > 0 ? 'Elle te doit ' : g.solde < 0 ? 'Tu as été trop payée ' : 'Soldé '}
                  {g.solde !== 0 && <strong>{fmt(Math.abs(g.solde))}</strong>}
                </span>
              </div>
              <div className="fin-detail-row">
                <span className="fin-detail-label">Dû</span>
                <span className="fin-detail-val du">{fmt(g.du)}</span>
              </div>
              <div className="fin-detail-row">
                <span className="fin-detail-label">Reçu</span>
                <span className="fin-detail-val recu">{fmt(g.recu)}</span>
              </div>
            </div>
          ))}

          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button className="btn-add-item" style={{ flex: 1 }} onClick={() => setShowAddDu(true)}>
              <Plus size={14} /> Montant dû
            </button>
            <button className="btn-add-item" style={{ flex: 1, color: 'var(--sage)' }} onClick={() => setShowAddVersement(true)}>
              <Plus size={14} /> Versement reçu
            </button>
          </div>
        </>
      )}

      {/* ── MONTANTS DUS ── */}
      {activeTab === 'dus' && (
        <>
          <button className="btn-add-item" onClick={() => setShowAddDu(true)}>
            <Plus size={14} /> Ajouter un montant dû
          </button>
          <div className="card">
            {montantsDus.length === 0 && <p className="empty-text">Aucun montant enregistré.</p>}
            {montantsDus.map(m => (
              <div key={m.id} className="fin-item">
                <div className="fin-item-left">
                  <div className="fin-item-title">{m.gite_gites?.nom}</div>
                  <div className="fin-item-meta">
                    {new Date(m.date_prestation).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                    {m.description && ` · ${m.description}`}
                  </div>
                </div>
                <span className="fin-montant du">{fmt(m.montant)}</span>
                <button className="icon-btn-xs danger" onClick={() => window.confirm('Supprimer ?') && deleteMontantDu(m.id)}>
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── VERSEMENTS ── */}
      {activeTab === 'versements' && (
        <>
          <button className="btn-add-item" style={{ color: 'var(--sage)' }} onClick={() => setShowAddVersement(true)}>
            <Plus size={14} /> Enregistrer un versement reçu
          </button>
          <div className="card">
            {versements.length === 0 && <p className="empty-text">Aucun versement enregistré.</p>}
            {versements.map(v => (
              <div key={v.id} className="fin-item">
                <div className="fin-item-left">
                  <div className="fin-item-title">{v.gite_gites?.nom}</div>
                  <div className="fin-item-meta">
                    {new Date(v.date_versement).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                    {v.note && ` · ${v.note}`}
                  </div>
                </div>
                <span className="fin-montant recu">{fmt(v.montant)}</span>
                <button className="icon-btn-xs danger" onClick={() => window.confirm('Supprimer ?') && deleteVersement(v.id)}>
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {showAddDu && (
        <AddMontantModal gites={gites} onSave={async f => { await addMontantDu(f); setShowAddDu(false) }} onClose={() => setShowAddDu(false)} />
      )}
      {showAddVersement && (
        <AddVersementModal gites={gites} onSave={async f => { await addVersement(f); setShowAddVersement(false) }} onClose={() => setShowAddVersement(false)} />
      )}
    </div>
  )
}
