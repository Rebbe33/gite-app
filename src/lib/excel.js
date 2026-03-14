import * as XLSX from 'xlsx'

// Parse un fichier Excel de checklist ménage
// Colonnes attendues : Zone, Element, Tâche, Fréquence (passages)
export function parseTasksExcel(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'array' })
        const sheet = wb.Sheets[wb.SheetNames[0]]
        const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' })

        const tasks = []
        rows.forEach((row, i) => {
          // Cherche les colonnes de manière flexible (insensible à la casse/accents)
          const keys = Object.keys(row)
          const find = (patterns) => keys.find(k =>
            patterns.some(p => k.toLowerCase().replace(/[éèê]/g,'e').includes(p))
          )

          const zoneKey    = find(['zone'])
          const elemKey    = find(['element', 'élément'])
          const tacheKey   = find(['tache', 'tâche', 'tache'])
          const freqKey    = find(['freq', 'passage'])

          const zone    = String(row[zoneKey] || '').trim()
          const element = String(row[elemKey] || '').trim()
          const tache   = String(row[tacheKey] || '').trim()
          const freq    = parseInt(row[freqKey]) || 1

          if (zone && element && tache) {
            tasks.push({ zone, element, tache, freq, ordre: i })
          }
        })

        if (tasks.length === 0) {
          reject(new Error('Aucune tâche trouvée. Vérifiez que votre fichier a les colonnes : Zone, Element, Tâche, Fréquence'))
        } else {
          resolve(tasks)
        }
      } catch (err) {
        reject(new Error('Erreur de lecture du fichier Excel : ' + err.message))
      }
    }
    reader.onerror = () => reject(new Error('Impossible de lire le fichier'))
    reader.readAsArrayBuffer(file)
  })
}

export const FREQ_INFO = {
  1:  { label: 'Chaque passage',       color: '#4a7c59', bg: '#e8f0eb', short: '×1' },
  3:  { label: 'Tous les 3 passages',  color: '#c9853a', bg: '#fdf3e8', short: '×3' },
  5:  { label: 'Tous les 5 passages',  color: '#185fa5', bg: '#e6f1fb', short: '×5' },
  10: { label: 'Tous les 10 passages', color: '#7c4a7c', bg: '#f0e8f0', short: '×10' },
  20: { label: 'Tous les 20 passages', color: '#6b6560', bg: '#f5f3f0', short: '×20' },
}

export const ZONE_ICONS = {
  'Cuisine': '🍳', 'Salle à manger': '🍽️', 'Salon': '🛋️',
  'Chambres': '🛏️', 'Salle de bain': '🚿', 'WC': '🚽',
  'Général': '🏠', 'Extérieur': '🌿',
}
export const ZONE_ICON_DEFAULT = '📦'
