import { useState } from 'react'
import { Plus, Trash2, X, Check, Clock, TrendingUp, CreditCard, ChevronDown, ChevronUp } from 'lucide-react'
import { useHeures, parseduree, formatMinutes } from '../hooks/useHeures'
import { useGites } from '../hooks/useGites'

const MONTHS_FR = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']

function formatMonth(str) {
  const [y, m] = str.split('-')
  return `${MONTHS_FR[parseInt(m) - 1]} ${y}`
}

function AddSessionModal({ gites, onSave, onClose }) {
  const today = new Date().toISOString().split('T')[0]
  const [form, setForm] = useState({ gite_id: gites[0]?.id || '', duree: '', date_session: today, note: '' })
  const [error, setError] = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = () => {
    const min = parseduree(form.duree)
    if (!min) { setError('Format invalide. Exemples : 2h30, 1h, 45'); return }
    if (!form.gite_id) { setError('Sélectionnez un gîte'); return }
    onSave({ ...form, duree_minutes: min })
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Ajouter des heures</h2>
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
            <label>Durée</label>
            <input value={form.duree} onChange={e => set('duree', e.target.value)}
              placeholder="2h30 ou 1h ou 45" autoFocus />
            {error && <div className="field-error">{error}</div>}
          </div>
          <div className="form-field">
            <label>Date</label>
            <input type="date" value={form.date_session} onChange={e => set('date_session', e.target.value)} />
          </div>
          <div className="form-field full">
            <label>Note <span style={{ color: '#9c9890' }}>(optionnel)</span></label>
            <input value={form.note} onChange={e => set('note', e.target.value)} placeholder="Ménage complet, état correct..." />
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

function PayerModal({ gite, totalMinutes, onConfirm, onClose }) {
  const [note, setNote] = useState('')
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Marquer comme payé — {gite.nom}</h2>
          <button className="icon-btn" onClick={onClose}><X size={18} /></button>
        </div>
        <p className="modal-body">
          Cela va archiver <strong>{formatMinutes(totalMinutes)}</strong> et remettre le compteur à zéro pour ce gîte.
        </p>
        <div className="form-grid">
          <div className="form-field full">
            <label>Note <span style={{ color: '#9c9890' }}>(optionnel)</span></label>
            <input value={note} onChange={e => setNote(e.target.value)} placeholder="Virement reçu, chèque..." />
          </div>
        </div>
        <div className="modal-actions">
          <button className="btn-gray" onClick={onClose}>Annuler</button>
          <button className="btn-primary" onClick={() => onConfirm(note)}>
            <CreditCard size={14} /> Confirmer le paiement
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Heures() {
  const { gites } = useGites()
  const { sessions, paiements, loading, addSession, deleteSession, payerGite, statsByGite, statsByMonth, statsByYear } = useHeures()
  const [showAdd, setShowAdd] = useState(false)
  const [payingGite, setPayingGite] = useState(null)
  const [activeTab, setActiveTab] = useState('courant') // courant | historique
  const [showSessions, setShowSessions] = useState(true)

  if (loading) return <div className="loading">Chargement...</div>

  const byGite = statsByGite()
  const totalCourant = sessions.reduce((a, s) => a + s.duree_minutes, 0)
  const byMonth = statsByMonth()
  const byYear = statsByYear()

  return (
    <div>
      {/* TABS */}
      <div className="view-toggle" style={{ marginBottom: '0.85rem', width: 'fit-content' }}>
        <button className={`toggle-btn ${activeTab === 'courant' ? 'active' : ''}`} onClick={() => setActiveTab('courant')}>
          <Clock size={13} /> En cours
        </button>
        <button className={`toggle-btn ${activeTab === 'historique' ? 'active' : ''}`} onClick={() => setActiveTab('historique')}>
          <TrendingUp size={13} /> Historique
        </button>
      </div>

      {/* ── EN COURS ── */}
      {activeTab === 'courant' && (
        <>
          {/* Résumé total */}
          <div className="heures-total-card">
            <div className="heures-total-label">Total non payé — tous gîtes</div>
            <div className="heures-total-val">{formatMinutes(totalCourant)}</div>
          </div>

          {/* Par gîte */}
          {byGite.length === 0 && (
            <div className="empty-tasks">
              <Clock size={28} color="#9c9890" />
              <p>Aucune heure enregistrée.</p>
            </div>
          )}

          {byGite.map(g => {
            const giteObj = gites.find(x => x.id === g.gite_id)
            return (
              <div key={g.gite_id} className="card">
                <div className="card-header">
                  <div>
                    <div className="card-title">{g.nom}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{g.count} session{g.count > 1 ? 's' : ''}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="heures-badge">{formatMinutes(g.minutes)}</span>
                    {giteObj && (
                      <button className="btn-primary-sm" onClick={() => setPayingGite({ ...giteObj, minutes: g.minutes })}>
                        <CreditCard size={12} /> Payé
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}

          {/* Sessions récentes */}
          {sessions.length > 0 && (
            <div className="card">
              <div className="card-header" style={{ cursor: 'pointer' }} onClick={() => setShowSessions(s => !s)}>
                <span className="card-title">Sessions ({sessions.length})</span>
                {showSessions ? <ChevronUp size={15} color="#9c9890" /> : <ChevronDown size={15} color="#9c9890" />}
              </div>
              {showSessions && sessions.map(s => (
                <div key={s.id} className="session-item">
                  <div className="session-left">
                    <div className="session-gite">{s.gites?.nom}</div>
                    <div className="session-meta">
                      {new Date(s.date_session).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                      {s.note && ` · ${s.note}`}
                    </div>
                  </div>
                  <span className="heures-badge">{formatMinutes(s.duree_minutes)}</span>
                  <button className="icon-btn-xs danger" onClick={() => window.confirm('Supprimer ?') && deleteSession(s.id)}>
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <button className="btn-add-item" onClick={() => setShowAdd(true)}>
            <Plus size={14} /> Ajouter des heures
          </button>
        </>
      )}

      {/* ── HISTORIQUE ── */}
      {activeTab === 'historique' && (
        <>
          {/* Par année */}
          {byYear.length > 0 && (
            <div className="card">
              <div className="card-title" style={{ marginBottom: '0.85rem' }}>Par année</div>
              {byYear.map(({ year, minutes }) => (
                <div key={year} className="stat-row">
                  <span className="stat-row-label">{year}</span>
                  <div className="stat-row-bar-wrap">
                    <div className="stat-row-bar" style={{ width: `${Math.min(100, minutes / 600 * 100)}%` }} />
                  </div>
                  <span className="stat-row-val">{formatMinutes(minutes)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Par mois */}
          {byMonth.length > 0 && (
            <div className="card">
              <div className="card-title" style={{ marginBottom: '0.85rem' }}>Par mois</div>
              {byMonth.map(({ month, minutes }) => (
                <div key={month} className="stat-row">
                  <span className="stat-row-label">{formatMonth(month)}</span>
                  <div className="stat-row-bar-wrap">
                    <div className="stat-row-bar" style={{ width: `${Math.min(100, minutes / 300 * 100)}%` }} />
                  </div>
                  <span className="stat-row-val">{formatMinutes(minutes)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Paiements archivés */}
          {paiements.length > 0 && (
            <div className="card">
              <div className="card-title" style={{ marginBottom: '0.85rem' }}>Paiements reçus</div>
              {paiements.map(p => (
                <div key={p.id} className="paiement-item">
                  <div className="paiement-left">
                    <div className="paiement-gite">{p.gites?.nom}</div>
                    <div className="paiement-meta">
                      Du {new Date(p.periode_debut).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} au{' '}
                      {new Date(p.periode_fin).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                    {p.note && <div className="paiement-note">{p.note}</div>}
                  </div>
                  <div className="paiement-right">
                    <span className="heures-badge green">{formatMinutes(p.total_minutes)}</span>
                    <div className="paiement-date">{new Date(p.date_paiement).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {paiements.length === 0 && byMonth.length === 0 && (
            <div className="empty-tasks">
              <TrendingUp size={28} color="#9c9890" />
              <p>Aucun historique disponible.</p>
            </div>
          )}
        </>
      )}

      {/* MODALS */}
      {showAdd && (
        <AddSessionModal
          gites={gites}
          onSave={async (form) => { await addSession(form); setShowAdd(false) }}
          onClose={() => setShowAdd(false)}
        />
      )}

      {payingGite && (
        <PayerModal
          gite={payingGite}
          totalMinutes={payingGite.minutes}
          onConfirm={async (note) => { await payerGite(payingGite.id, note); setPayingGite(null) }}
          onClose={() => setPayingGite(null)}
        />
      )}
    </div>
  )
}
