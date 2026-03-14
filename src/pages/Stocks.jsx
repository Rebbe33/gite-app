import { useState } from 'react'
import { Plus, Trash2, X, Check, AlertTriangle } from 'lucide-react'
import { useStocks } from '../hooks/useStocks'

const CATS = [
  { key: 'linge',    label: 'Linge & Textile' },
  { key: 'produits', label: 'Produits ménagers' },
  { key: 'accueil',  label: 'Consommables accueil' },
]

function AddStockModal({ onSave, onClose }) {
  const [form, setForm] = useState({ categorie: 'linge', nom: '', emoji: '📦', quantite: 0, seuil_alerte: 2 })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Nouveau produit</h2>
          <button className="icon-btn" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="form-grid">
          <div className="form-field">
            <label>Catégorie</label>
            <select value={form.categorie} onChange={e => set('categorie', e.target.value)}>
              {CATS.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
          </div>
          <div className="form-field">
            <label>Emoji</label>
            <input value={form.emoji} onChange={e => set('emoji', e.target.value)} maxLength={2} style={{ width:60 }} />
          </div>
          <div className="form-field full">
            <label>Nom</label>
            <input value={form.nom} onChange={e => set('nom', e.target.value)} placeholder="Serviettes de bain" />
          </div>
          <div className="form-field">
            <label>Quantité</label>
            <input type="number" min="0" value={form.quantite} onChange={e => set('quantite', parseInt(e.target.value))} />
          </div>
          <div className="form-field">
            <label>Seuil alerte</label>
            <input type="number" min="0" value={form.seuil_alerte} onChange={e => set('seuil_alerte', parseInt(e.target.value))} />
          </div>
        </div>
        <div className="modal-actions">
          <button className="btn-gray" onClick={onClose}>Annuler</button>
          <button className="btn-primary" onClick={() => onSave(form)}><Check size={14} /> Ajouter</button>
        </div>
      </div>
    </div>
  )
}

export default function Stocks({ giteId }) {
  const { stocks, loading, add, updateQty, remove } = useStocks(giteId)
  const [showAdd, setShowAdd] = useState(false)

  const lowStock = stocks.filter(s => s.quantite <= s.seuil_alerte)

  if (loading) return <div className="loading">Chargement...</div>

  return (
    <div>
      {lowStock.length > 0 && (
        <div className="alert-banner">
          <AlertTriangle size={14} />
          {lowStock.length} article{lowStock.length > 1 ? 's' : ''} en stock bas :
          {' '}{lowStock.map(s => s.nom).join(', ')}
        </div>
      )}

      {CATS.map(cat => {
        const items = stocks.filter(s => s.categorie === cat.key)
        return (
          <div key={cat.key} className="card">
            <div className="card-header">
              <span className="card-title">{cat.label}</span>
              {items.some(s => s.quantite <= s.seuil_alerte) && (
                <span className="badge badge-amber">Stock bas</span>
              )}
            </div>
            {items.length === 0 && <p className="empty-text">Aucun article.</p>}
            {items.map(s => (
              <div key={s.id} className="stock-item">
                <span className="stock-emoji">{s.emoji}</span>
                <span className="stock-name">{s.nom}</span>
                {s.quantite <= s.seuil_alerte && <AlertTriangle size={13} color="#c9853a" />}
                <div className="qty-controls">
                  <button className="qty-btn" onClick={() => updateQty(s.id, -1)}>−</button>
                  <span className={`qty-val ${s.quantite <= s.seuil_alerte ? 'low' : ''}`}>{s.quantite}</span>
                  <button className="qty-btn" onClick={() => updateQty(s.id, 1)}>+</button>
                </div>
                <button className="icon-btn-xs danger" onClick={() => window.confirm('Supprimer ?') && remove(s.id)}>
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        )
      })}

      <button className="btn-add-item" onClick={() => setShowAdd(true)}>
        <Plus size={14} /> Ajouter un article
      </button>

      {showAdd && (
        <AddStockModal
          onSave={async (form) => { await add(form); setShowAdd(false) }}
          onClose={() => setShowAdd(false)}
        />
      )}
    </div>
  )
}
