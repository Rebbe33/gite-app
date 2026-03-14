import { useState } from 'react'
import { Plus, Pencil, Trash2, X, Check, Users, Calendar } from 'lucide-react'
import { useReservations } from '../hooks/useReservations'

const STATUT = {
  confirme:   { label: 'Confirmé',   cls: 'badge-green' },
  en_attente: { label: 'En attente', cls: 'badge-amber' },
  annule:     { label: 'Annulé',     cls: 'badge-red' },
}

const MONTHS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']
const DAYS   = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim']

function daysInMonth(y, m) { return new Date(y, m + 1, 0).getDate() }
function firstDayOfWeek(y, m) { return (new Date(y, m, 1).getDay() + 6) % 7 }

function ResaForm({ initial, giteId, onSave, onClose }) {
  const [form, setForm] = useState(initial || {
    nom_locataire: '', date_arrivee: '', date_depart: '',
    nb_personnes: 2, statut: 'confirme', notes: ''
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{initial ? 'Modifier la réservation' : 'Nouvelle réservation'}</h2>
          <button className="icon-btn" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="form-grid">
          <div className="form-field full">
            <label>Nom du locataire</label>
            <input value={form.nom_locataire} onChange={e => set('nom_locataire', e.target.value)} placeholder="Famille Dupont" />
          </div>
          <div className="form-field">
            <label>Arrivée</label>
            <input type="date" value={form.date_arrivee} onChange={e => set('date_arrivee', e.target.value)} />
          </div>
          <div className="form-field">
            <label>Départ</label>
            <input type="date" value={form.date_depart} onChange={e => set('date_depart', e.target.value)} />
          </div>
          <div className="form-field">
            <label>Personnes</label>
            <input type="number" min="1" max="20" value={form.nb_personnes} onChange={e => set('nb_personnes', parseInt(e.target.value))} />
          </div>
          <div className="form-field">
            <label>Statut</label>
            <select value={form.statut} onChange={e => set('statut', e.target.value)}>
              <option value="confirme">Confirmé</option>
              <option value="en_attente">En attente</option>
              <option value="annule">Annulé</option>
            </select>
          </div>
          <div className="form-field full">
            <label>Notes</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} placeholder="Lit bébé, arrivée tardive..." />
          </div>
        </div>
        <div className="modal-actions">
          <button className="btn-gray" onClick={onClose}>Annuler</button>
          <button className="btn-primary" onClick={() => onSave(form)}>
            <Check size={14} /> Enregistrer
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Planning({ giteId }) {
  const { reservations, add, update, remove } = useReservations(giteId)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const today = new Date()
  const [calYear, setCalYear] = useState(today.getFullYear())
  const [calMonth, setCalMonth] = useState(today.getMonth())

  const upcoming = reservations
    .filter(r => r.statut !== 'annule' && new Date(r.date_depart) >= today)
    .sort((a, b) => new Date(a.date_arrivee) - new Date(b.date_arrivee))

  // Jours occupés ce mois
  const occupiedDays = new Set()
  reservations.filter(r => r.statut !== 'annule').forEach(r => {
    const start = new Date(r.date_arrivee)
    const end   = new Date(r.date_depart)
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      if (d.getFullYear() === calYear && d.getMonth() === calMonth)
        occupiedDays.add(d.getDate())
    }
  })

  const handleSave = async (form) => {
    if (editing) { await update(editing.id, form) }
    else { await add(form) }
    setShowForm(false); setEditing(null)
  }

  const days = daysInMonth(calYear, calMonth)
  const firstDay = firstDayOfWeek(calYear, calMonth)
  const todayDay = today.getFullYear() === calYear && today.getMonth() === calMonth ? today.getDate() : -1

  return (
    <div>
      {/* Calendrier */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">{MONTHS[calMonth]} {calYear}</span>
          <div style={{ display:'flex', gap:6 }}>
            <button className="btn-outline-sm" onClick={() => {
              if (calMonth === 0) { setCalMonth(11); setCalYear(y => y-1) } else setCalMonth(m => m-1)
            }}>◀</button>
            <button className="btn-outline-sm" onClick={() => {
              if (calMonth === 11) { setCalMonth(0); setCalYear(y => y+1) } else setCalMonth(m => m+1)
            }}>▶</button>
          </div>
        </div>
        <div className="cal-grid">
          {DAYS.map(d => <div key={d} className="cal-day-name">{d}</div>)}
          {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
          {Array.from({ length: days }).map((_, i) => {
            const day = i + 1
            const isToday = day === todayDay
            const isOccupied = occupiedDays.has(day)
            return (
              <div key={day} className={`cal-day ${isToday ? 'today' : ''} ${isOccupied ? 'occupied' : ''}`}>
                {day}
              </div>
            )
          })}
        </div>
        <div className="cal-legend">
          <span className="legend-item"><span className="legend-dot occupied" />Occupé</span>
          <span className="legend-item"><span className="legend-dot today-dot" />Aujourd'hui</span>
        </div>
      </div>

      {/* Réservations */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Séjours</span>
          <button className="btn-primary-sm" onClick={() => { setEditing(null); setShowForm(true) }}>
            <Plus size={13} /> Ajouter
          </button>
        </div>
        {reservations.length === 0 && <p className="empty-text">Aucune réservation enregistrée.</p>}
        {reservations
          .sort((a, b) => new Date(a.date_arrivee) - new Date(b.date_arrivee))
          .map(r => {
            const nights = Math.round((new Date(r.date_depart) - new Date(r.date_arrivee)) / 86400000)
            const isPast = new Date(r.date_depart) < today
            return (
              <div key={r.id} className={`resa-item ${isPast ? 'past' : ''}`}>
                <div className="resa-left">
                  <div className="resa-name">{r.nom_locataire}</div>
                  <div className="resa-meta">
                    <Calendar size={11} />
                    {new Date(r.date_arrivee).toLocaleDateString('fr-FR', { day:'numeric', month:'short' })} →{' '}
                    {new Date(r.date_depart).toLocaleDateString('fr-FR', { day:'numeric', month:'short', year:'numeric' })}
                    {' · '}{nights} nuit{nights > 1 ? 's' : ''}
                    {' · '}<Users size={11} style={{ display:'inline' }} /> {r.nb_personnes}
                  </div>
                  {r.notes && <div className="resa-notes">{r.notes}</div>}
                </div>
                <div className="resa-right">
                  <span className={`badge ${STATUT[r.statut]?.cls}`}>{STATUT[r.statut]?.label}</span>
                  <div className="resa-actions">
                    <button className="icon-btn" onClick={() => { setEditing(r); setShowForm(true) }}><Pencil size={14} /></button>
                    <button className="icon-btn danger" onClick={() => window.confirm('Supprimer ?') && remove(r.id)}><Trash2 size={14} /></button>
                  </div>
                </div>
              </div>
            )
          })}
      </div>

      {showForm && (
        <ResaForm
          initial={editing}
          giteId={giteId}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditing(null) }}
        />
      )}
    </div>
  )
}
