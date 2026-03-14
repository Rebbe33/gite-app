import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Notes({ giteId, giteName }) {
  const [notes, setNotes] = useState('')
  const [saved, setSaved] = useState(true)

  useEffect(() => {
    supabase.from('gite_gites').select('notes').eq('id', giteId).single()
      .then(({ data }) => { if (data?.notes) setNotes(data.notes) })
  }, [giteId])

  useEffect(() => {
    setSaved(false)
    const t = setTimeout(async () => {
      await supabase.from('gite_gites').update({ notes }).eq('id', giteId)
      setSaved(true)
    }, 800)
    return () => clearTimeout(t)
  }, [notes, giteId])

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <span className="card-title">Notes — {giteName}</span>
          <span className="save-hint">{saved ? '✓ Sauvegardé' : 'Modification...'}</span>
        </div>
        <textarea
          className="notes-area"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder={`Notes pour ${giteName} : état du gîte, dégâts, améliorations, instructions entretien...`}
        />
      </div>

      <div className="card">
        <div className="card-title" style={{ marginBottom:'0.75rem' }}>Guide rapide</div>
        <div className="guide-content">
          <div className="guide-section">
            <div className="guide-label">Vue "Tâches dues"</div>
            <div className="guide-text">Affiche uniquement les tâches dont la fréquence est atteinte au prochain passage. C'est la vue normale pour une intervention.</div>
          </div>
          <div className="guide-section">
            <div className="guide-label">Vue "Toutes les tâches"</div>
            <div className="guide-text">Affiche toutes les tâches, y compris celles pas encore dues. Les tâches non dues sont grisées. Vous pouvez les cocher en avance si besoin.</div>
          </div>
          <div className="guide-section">
            <div className="guide-label">Clôturer un passage</div>
            <div className="guide-text">Enregistre les tâches faites et incrémente le compteur. Les fréquences sont recalculées pour le prochain passage.</div>
          </div>
          <div className="guide-section">
            <div className="guide-label">Import Excel</div>
            <div className="guide-text">Colonnes requises : Zone · Element · Tâche · Fréquence (passages). Remplace les tâches existantes.</div>
          </div>
        </div>
      </div>
    </div>
  )
}
