import { useState } from 'react'
import { Plus, Trash2, X, Check, Clock, History, Users } from 'lucide-react'
import { useFinances } from '../hooks/useFinances'
import { useHeures, formatMinutes } from '../hooks/useHeures'
import { useGites } from '../hooks/useGites'
import { useIntervenants } from '../hooks/useIntervenants'

function fmt(n) { return Number(n).toFixed(2).replace('.', ',') + ' €' }

function AddVersementModal({ giteId, giteName, onSave, onClose }) {
  const today = new Date().toISOString().split('T')[0]
  const [form, setForm] = useState({ montant: '', date_versement: today, note: '' })
  const [error, setError] = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const handleSave = () => {
    if (!form.montant || isNaN(parseFloat(form.montant))) { setError('Montant invalide'); return }
    onSave({ ...form, gite_id: giteId, montant: parseFloat(form.montant) })
  }
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Versement reçu — {giteName}</h2>
          <button className="icon-btn" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="form-grid">
          <div className="form-field">
            <label>Montant reçu (€)</label>
            <input type="number" step="0.01" min="0" value={form.montant}
              onChange={e => set('montant', e.target.value)} placeholder="90.00" autoFocus />
            {error && <div className="field-error">{error}</div>}
          </div>
          <div className="form-field">
            <label>Date</label>
            <input type="date" value={form.date_versement} onChange={e => set('date_versement', e.target.value)} />
          </div>
          <div className="form-field full">
            <label>Note</label>
            <input value={form.note} onChange={e => set('note', e.target.value)} placeholder="Espèces, virement..." />
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

function AddPaiementIntervenantModal({ intervenant, giteId, montantSuggere, onSave, onClose }) {
  const today = new Date().toISOString().split('T')[0]
  const [form, setForm] = useState({
    montant: montantSuggere > 0 ? String(montantSuggere) : '',
    date_paiement: today,
    note: '',
    est_avance: false,
  })
  const [error, setError] = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const handleSave = () => {
    if (!form.montant || isNaN(parseFloat(form.montant))) { setError('Montant invalide'); return }
    onSave({
      intervenant_id: intervenant.id,
      gite_id: giteId,
      montant: parseFloat(form.montant),
      date_paiement: form.date_paiement,
      note: form.note,
      est_avance: form.est_avance,
    })
  }
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Paiement — {intervenant.nom}</h2>
          <button className="icon-btn" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="form-grid">
          <div className="form-field">
            <label>Montant versé (€)</label>
            <input type="number" step="0.01" min="0" value={form.montant}
              onChange={e => set('montant', e.target.value)} placeholder="90.00" autoFocus />
            {error && <div className="field-error">{error}</div>}
          </div>
          <div className="form-field">
            <label>Date</label>
            <input type="date" value={form.date_paiement} onChange={e => set('date_paiement', e.target.value)} />
          </div>
          <div className="form-field full">
            <label>Note</label>
            <input value={form.note} onChange={e => set('note', e.target.value)} placeholder="Espèces, virement..." />
          </div>
          <div className="form-field full">
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 400 }}>
              <input type="checkbox" checked={form.est_avance} onChange={e => set('est_avance', e.target.checked)}
                style={{ width: 'auto', margin: 0 }} />
              J'avance l'argent (proprio pas encore payé)
            </label>
            {form.est_avance && (
              <div style={{ fontSize: 12, color: 'var(--sage)', marginTop: 4, paddingLeft: 2 }}>
                Ce montant sera comptabilisé comme une avance en attente du remboursement du proprio.
              </div>
            )}
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

function GererIntervenantsModal({ intervenants, onAdd, onDelete, onClose }) {
  const [nom, setNom] = useState('')
  const [error, setError] = useState('')
  const handleAdd = () => {
    if (!nom.trim()) { setError('Nom requis'); return }
    onAdd({ nom: nom.trim() })
    setNom('')
    setError('')
  }
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Gérer l'équipe</h2>
          <button className="icon-btn" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="form-grid" style={{ marginBottom: 8 }}>
          <div className="form-field">
            <label>Nom de la personne</label>
            <input value={nom} onChange={e => setNom(e.target.value)} placeholder="Prénom..." autoFocus
              onKeyDown={e => e.key === 'Enter' && handleAdd()} />
            {error && <div className="field-error">{error}</div>}
          </div>
        </div>
        <button className="btn-add-item" onClick={handleAdd} style={{ marginBottom: 16 }}>
          <Plus size={14} /> Ajouter
        </button>
        {intervenants.length > 0 && (
          <>
            <div className="filter-label" style={{ marginBottom: 6 }}>Enregistrés</div>
            {intervenants.map(i => (
              <div key={i.id} className="session-item">
                <div className="session-left">
                  <div className="session-meta" style={{ fontWeight: 500 }}>{i.nom}</div>
                </div>
                <button className="icon-btn-xs danger"
                  onClick={() => window.confirm(`Supprimer ${i.nom} ?`) && onDelete(i.id)}>
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </>
        )}
        <div className="modal-actions">
          <button className="btn-primary" onClick={onClose}>Fermer</button>
        </div>
      </div>
    </div>
  )
}

export default function Finances({ giteId }) {
  const { gites } = useGites()
  const gite = gites.find(g => g.id === giteId)
  const isAmiable = !gite || gite.mode_suivi === 'amiable'

  const {
    montantsDus, versements, versementsHisto, loading,
    addMontantDu, deleteMontantDu,
    addVersement, deleteVersement, deleteVersementHisto,
    totalDu, totalRecu, soldeGlobal,
  } = useFinances(giteId)

  const { sessions } = useHeures(giteId)
  const {
    intervenants, paiements: paiementsInterv,
    addIntervenant, deleteIntervenant,
    addPaiement: addPaiementInterv, deletePaiement: deletePaiementInterv,
    soldeByIntervenant,
  } = useIntervenants(giteId)

  const [showAddVersement, setShowAddVersement]             = useState(false)
  const [showAddDu, setShowAddDu]                           = useState(false)
  const [showGererInterv, setShowGererInterv]               = useState(false)
  const [paiementIntervModal, setPaiementIntervModal]       = useState(null) // { id, nom, montantSuggere }
  const [activeTab, setActiveTab]                           = useState('solde')

  const totalHeures = sessions.reduce((s, h) => s + h.duree_minutes, 0)
  const solde = totalDu - totalRecu

  // Reliquat en cours (versement non encore consommé)
  const reliquatEnCours = versements
    .filter(v => v.note?.startsWith('Reliquat'))
    .reduce((s, v) => s + Number(v.montant), 0)

  // Soldes par intervenant pour ce gîte
  const soldesInterv = soldeByIntervenant(sessions)
  const intervenantsActifs = soldesInterv.filter(i =>
    i.montant_du > 0 || i.avance_en_cours > 0 || i.reste_a_payer !== 0
  )

  if (loading) return <div className="loading">Chargement...</div>

  return (
    <div>
      <div className="view-toggle" style={{ marginBottom: '0.85rem', width: 'fit-content' }}>
        <button className={`toggle-btn ${activeTab === 'solde' ? 'active' : ''}`} onClick={() => setActiveTab('solde')}>Solde</button>
        {isAmiable && (
          <button className={`toggle-btn ${activeTab === 'dus' ? 'active' : ''}`} onClick={() => setActiveTab('dus')}>Montants dus</button>
        )}
        <button className={`toggle-btn ${activeTab === 'equipe' ? 'active' : ''}`} onClick={() => setActiveTab('equipe')}>
          <Users size={13} /> Équipe
        </button>
        <button className={`toggle-btn ${activeTab === 'historique' ? 'active' : ''}`} onClick={() => setActiveTab('historique')}>
          <History size={13} /> Historique
        </button>
      </div>

      {/* ── SOLDE ── */}
      {activeTab === 'solde' && (
        <>
          <div className="fin-summary">
            <div className="fin-summary-item">
              <div className="fin-summary-label">Total dû</div>
              <div className="fin-summary-val du">{fmt(totalDu)}</div>
            </div>
            <div className="fin-summary-sep" />
            <div className="fin-summary-item">
              <div className="fin-summary-label">{isAmiable ? 'Total reçu' : 'Reliquat'}</div>
              <div className="fin-summary-val recu">{fmt(isAmiable ? totalRecu : reliquatEnCours)}</div>
            </div>
            <div className="fin-summary-sep" />
            <div className="fin-summary-item">
              <div className="fin-summary-label">Solde</div>
              <div className={`fin-summary-val ${solde > 0 ? 'positif' : solde < 0 ? 'negatif' : ''}`}>
                {solde > 0 ? '+' : ''}{fmt(isAmiable ? solde : totalDu - reliquatEnCours)}
              </div>
            </div>
          </div>

          {totalHeures > 0 && (
            <div className="fin-heures-row">
              <Clock size={14} color="var(--text-2)" />
              <span>{formatMinutes(totalHeures)} travaillées (voir onglet Heures)</span>
            </div>
          )}

          {reliquatEnCours > 0 && !isAmiable && (
            <div className="fin-heures-row" style={{ background: 'var(--sage-light)', color: 'var(--sage)' }}>
              <Check size={14} />
              <span>Reliquat disponible : {fmt(reliquatEnCours)} — sera appliqué à la prochaine session</span>
            </div>
          )}

          {/* Versements en cours (mode amiable) */}
          {isAmiable && versements.length > 0 && (
            <div className="card" style={{ marginTop: 8 }}>
              <div className="card-title" style={{ marginBottom: '0.75rem' }}>Versements reçus</div>
              {versements.map(v => (
                <div key={v.id} className="fin-item">
                  <div className="fin-item-left">
                    <div className="fin-item-title">{v.note || 'Versement'}</div>
                    <div className="fin-item-meta">
                      {new Date(v.date_versement).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                  </div>
                  <span className="fin-montant recu">{fmt(v.montant)}</span>
                  <button className="icon-btn-xs danger" onClick={() => window.confirm('Supprimer ?') && deleteVersement(v.id)}>
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Un seul bouton pour taux fixe, deux pour amiable */}
          {isAmiable ? (
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button className="btn-add-item" style={{ flex: 1 }} onClick={() => setShowAddDu(true)}>
                <Plus size={14} /> Montant dû
              </button>
              <button className="btn-add-item" style={{ flex: 1, color: 'var(--sage)' }} onClick={() => setShowAddVersement(true)}>
                <Plus size={14} /> Versement reçu
              </button>
            </div>
          ) : (
            <button className="btn-add-item" style={{ color: 'var(--sage)', marginTop: 8 }} onClick={() => setShowAddVersement(true)}>
              <Plus size={14} /> Versement reçu
            </button>
          )}
        </>
      )}

      {/* ── MONTANTS DUS (amiable seulement) ── */}
      {activeTab === 'dus' && isAmiable && (
        <>
          <button className="btn-add-item" onClick={() => setShowAddDu(true)}>
            <Plus size={14} /> Ajouter un montant dû
          </button>
          <div className="card">
            {montantsDus.length === 0 && <p className="empty-text">Aucun montant enregistré.</p>}
            {montantsDus.map(m => (
              <div key={m.id} className="fin-item">
                <div className="fin-item-left">
                  <div className="fin-item-title">{m.description || 'Prestation'}</div>
                  <div className="fin-item-meta">
                    {new Date(m.date_prestation).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
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

      {/* ── ÉQUIPE ── */}
      {activeTab === 'equipe' && (
        <>
          {/* Bouton gestion */}
          <button className="btn-add-item" style={{ marginBottom: 10 }} onClick={() => setShowGererInterv(true)}>
            <Users size={14} /> Gérer l'équipe
          </button>

          {intervenants.length === 0 ? (
            <div className="empty-tasks">
              <Users size={28} color="#9c9890" />
              <p>Aucun intervenant enregistré.<br/>Cliquez sur "Gérer l'équipe" pour en ajouter un.</p>
            </div>
          ) : (
            <>
              {/* Soldes actifs */}
              {intervenantsActifs.length > 0 && (
                <div className="card">
                  <div className="card-title" style={{ marginBottom: '0.75rem' }}>À régler</div>
                  {intervenantsActifs.map(iv => (
                    <div key={iv.intervenant_id} style={{ marginBottom: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-1)' }}>{iv.nom}</div>
                          {iv.reste_a_payer > 0 && (
                            <div style={{ fontSize: 12, color: 'var(--orange)', marginTop: 3 }}>
                              À payer : <strong>{fmt(iv.reste_a_payer)}</strong>
                            </div>
                          )}
                          {iv.avance_en_cours > 0 && (
                            <div style={{ fontSize: 12, color: 'var(--sage)', marginTop: 2 }}>
                              Avancé (en attente proprio) : {fmt(iv.avance_en_cours)}
                            </div>
                          )}
                          {iv.reste_a_payer <= 0 && iv.avance_en_cours === 0 && (
                            <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>Tout réglé ✓</div>
                          )}
                        </div>
                        <button className="btn-add-item" style={{ color: 'var(--sage)', flexShrink: 0 }}
                          onClick={() => setPaiementIntervModal({
                            id: iv.intervenant_id,
                            nom: iv.nom,
                            montantSuggere: iv.reste_a_payer > 0 ? iv.reste_a_payer : 0,
                          })}>
                          <Plus size={14} /> Payer
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {intervenantsActifs.length === 0 && (
                <div className="fin-heures-row" style={{ background: 'var(--sage-light)', color: 'var(--sage)' }}>
                  <Check size={14} />
                  <span>Tout est à jour — aucun paiement en attente.</span>
                </div>
              )}

              {/* Historique des paiements */}
              {paiementsInterv.length > 0 && (
                <div className="card" style={{ marginTop: 8 }}>
                  <div className="card-title" style={{ marginBottom: '0.75rem' }}>Paiements effectués</div>
                  {paiementsInterv.map(p => {
                    const interv = intervenants.find(i => i.id === p.intervenant_id)
                    return (
                      <div key={p.id} className="fin-item">
                        <div className="fin-item-left">
                          <div className="fin-item-title">
                            {interv?.nom || '—'}
                            {p.est_avance && (
                              <span style={{ background: 'var(--sage-light)', color: 'var(--sage)', borderRadius: 4, padding: '1px 6px', fontSize: 11, marginLeft: 6 }}>
                                avance
                              </span>
                            )}
                          </div>
                          <div className="fin-item-meta">
                            {new Date(p.date_paiement).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                            {p.note && ` · ${p.note}`}
                          </div>
                        </div>
                        <span className="fin-montant recu">{fmt(p.montant)}</span>
                        <button className="icon-btn-xs danger"
                          onClick={() => window.confirm('Supprimer ce paiement ?') && deletePaiementInterv(p.id)}>
                          <Trash2 size={12} />
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* ── HISTORIQUE DES VERSEMENTS ── */}
      {activeTab === 'historique' && (
        <div className="card">
          {versementsHisto.length === 0 && (
            <p className="empty-text">Aucun versement enregistré.</p>
          )}
          {versementsHisto.map(v => (
            <div key={v.id} className="fin-item" style={{ alignItems: 'flex-start' }}>
              <div className="fin-item-left">
                <div className="fin-item-title">
                  {new Date(v.date_versement).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
                <div className="fin-item-meta" style={{ marginTop: 3 }}>
                  Reçu : <strong>{fmt(v.montant_brut)}</strong>
                  {v.montant_consomme > 0 && ` · Consommé : ${fmt(v.montant_consomme)}`}
                  {v.reliquat > 0 && ` · Reliquat : ${fmt(v.reliquat)}`}
                </div>
                {v.nb_sessions_archivees > 0 && (
                  <div className="fin-item-meta">
                    {v.nb_sessions_archivees} session(s) archivée(s)
                  </div>
                )}
                {v.note && <div className="fin-item-meta" style={{ fontStyle: 'italic' }}>{v.note}</div>}
              </div>
              <span className="fin-montant recu">{fmt(v.montant_brut)}</span>
              <button className="icon-btn-xs danger" onClick={() => window.confirm('Supprimer de l\'historique ?') && deleteVersementHisto(v.id)}>
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── MODALS ── */}
      {showAddVersement && (
        <AddVersementModal giteId={giteId} giteName={gite?.nom}
          onSave={async f => { await addVersement(f); setShowAddVersement(false) }}
          onClose={() => setShowAddVersement(false)} />
      )}

      {showAddDu && (
        <div className="modal-overlay" onClick={() => setShowAddDu(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Montant dû — {gite?.nom}</h2>
              <button className="icon-btn" onClick={() => setShowAddDu(false)}><X size={18} /></button>
            </div>
            <AddMontantForm giteId={giteId} onSave={async f => { await addMontantDu(f); setShowAddDu(false) }} onClose={() => setShowAddDu(false)} />
          </div>
        </div>
      )}

      {showGererInterv && (
        <GererIntervenantsModal
          intervenants={intervenants}
          onAdd={async data => { await addIntervenant(data) }}
          onDelete={async id => { await deleteIntervenant(id) }}
          onClose={() => setShowGererInterv(false)} />
      )}

      {paiementIntervModal && (
        <AddPaiementIntervenantModal
          intervenant={{ id: paiementIntervModal.id, nom: paiementIntervModal.nom }}
          giteId={giteId}
          montantSuggere={paiementIntervModal.montantSuggere}
          onSave={async f => { await addPaiementInterv(f); setPaiementIntervModal(null) }}
          onClose={() => setPaiementIntervModal(null)} />
      )}
    </div>
  )
}

function AddMontantForm({ giteId, onSave, onClose }) {
  const today = new Date().toISOString().split('T')[0]
  const [form, setForm] = useState({ montant: '', description: '', date_prestation: today })
  const [error, setError] = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  return (
    <>
      <div className="form-grid">
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
          <input value={form.description} onChange={e => set('description', e.target.value)} placeholder="Ménage complet..." />
        </div>
      </div>
      <div className="modal-actions">
        <button className="btn-gray" onClick={onClose}>Annuler</button>
        <button className="btn-primary" onClick={() => {
          if (!form.montant || isNaN(parseFloat(form.montant))) { setError('Montant invalide'); return }
          onSave({ ...form, gite_id: giteId, montant: parseFloat(form.montant) })
        }}><Check size={14} /> Enregistrer</button>
      </div>
    </>
  )
}
