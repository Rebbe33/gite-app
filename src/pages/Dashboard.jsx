import { useState } from 'react'
import { useGites } from '../hooks/useGites'
import { useReservations } from '../hooks/useReservations'
import { useStocks } from '../hooks/useStocks'
import { useFinances } from '../hooks/useFinances'
import { useHeures, formatMinutes } from '../hooks/useHeures'
import { AlertTriangle, Clock, Euro, Calendar } from 'lucide-react'

const GITE_COLORS = ['#4a7c59', '#185fa5', '#c9853a', '#7c4a7c', '#b33030']
const MONTHS_FR = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']
const DAYS_FR   = ['L','M','M','J','V','S','D']

function useAllReservations(gites) {
  // On appelle useReservations pour chaque gîte — hook multi
  // Simplifié : on charge tout depuis Supabase directement
  const [all, setAll] = useState([])
  const { supabase } = { supabase: null } // placeholder
  return all
}

function CalendarMulti({ gites }) {
  const today     = new Date()
  const [year, setYear]   = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const { reservations: r0 } = useReservations(gites[0]?.id)
  const { reservations: r1 } = useReservations(gites[1]?.id)
  const { reservations: r2 } = useReservations(gites[2]?.id)
  const { reservations: r3 } = useReservations(gites[3]?.id)

  const allResas = [
    ...(r0 || []).map((r,_) => ({ ...r, colorIdx: 0 })),
    ...(r1 || []).map((r,_) => ({ ...r, colorIdx: 1 })),
    ...(r2 || []).map((r,_) => ({ ...r, colorIdx: 2 })),
    ...(r3 || []).map((r,_) => ({ ...r, colorIdx: 3 })),
  ].filter(r => r.statut !== 'annule')

  // Map jour → liste de gîtes occupés
  const dayMap = {}
  allResas.forEach(r => {
    const start = new Date(r.date_arrivee)
    const end   = new Date(r.date_depart)
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      if (d.getFullYear() === year && d.getMonth() === month) {
        const key = d.getDate()
        if (!dayMap[key]) dayMap[key] = []
        if (!dayMap[key].includes(r.colorIdx)) dayMap[key].push(r.colorIdx)
      }
    }
  })

  const daysInMonth  = new Date(year, month + 1, 0).getDate()
  const firstDayOfWeek = (new Date(year, month, 1).getDay() + 6) % 7
  const todayDay = today.getFullYear() === year && today.getMonth() === month ? today.getDate() : -1

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">{MONTHS_FR[month]} {year}</span>
        <div style={{ display:'flex', gap:6 }}>
          <button className="btn-outline-sm" onClick={() => { if (month===0){setMonth(11);setYear(y=>y-1)}else setMonth(m=>m-1) }}>◀</button>
          <button className="btn-outline-sm" onClick={() => { if (month===11){setMonth(0);setYear(y=>y+1)}else setMonth(m=>m+1) }}>▶</button>
        </div>
      </div>

      {/* Légende gîtes */}
      <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:10 }}>
        {gites.map((g, i) => (
          <div key={g.id} style={{ display:'flex', alignItems:'center', gap:4, fontSize:12, color:'var(--text-2)' }}>
            <span style={{ width:10, height:10, borderRadius:3, background: GITE_COLORS[i], display:'inline-block' }} />
            {g.nom}
          </div>
        ))}
      </div>

      <div className="cal-grid">
        {DAYS_FR.map(d => <div key={d} className="cal-day-name">{d}</div>)}
        {Array.from({ length: firstDayOfWeek }).map((_, i) => <div key={`e${i}`} />)}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1
          const colors = dayMap[day] || []
          const isToday = day === todayDay
          return (
            <div key={day} className={`cal-day ${isToday ? 'today' : ''}`}
              style={{ position:'relative', padding: colors.length ? '4px 2px 8px' : undefined }}>
              <span style={{ fontSize:13 }}>{day}</span>
              {colors.length > 0 && (
                <div style={{ display:'flex', gap:2, justifyContent:'center', position:'absolute', bottom:3, left:0, right:0 }}>
                  {colors.map(c => (
                    <span key={c} style={{ width:5, height:5, borderRadius:'50%', background: GITE_COLORS[c] }} />
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function StocksAlert({ gites }) {
  const { stocks: s0 } = useStocks(gites[0]?.id)
  const { stocks: s1 } = useStocks(gites[1]?.id)
  const { stocks: s2 } = useStocks(gites[2]?.id)
  const { stocks: s3 } = useStocks(gites[3]?.id)

  const allLow = [
    ...(s0||[]).filter(s => s.quantite <= s.seuil_alerte).map(s => ({ ...s, giteNom: gites[0]?.nom })),
    ...(s1||[]).filter(s => s.quantite <= s.seuil_alerte).map(s => ({ ...s, giteNom: gites[1]?.nom })),
    ...(s2||[]).filter(s => s.quantite <= s.seuil_alerte).map(s => ({ ...s, giteNom: gites[2]?.nom })),
    ...(s3||[]).filter(s => s.quantite <= s.seuil_alerte).map(s => ({ ...s, giteNom: gites[3]?.nom })),
  ]

  if (allLow.length === 0) return (
    <div className="card">
      <div className="card-header"><span className="card-title">Stocks</span><span className="badge badge-green">Tout OK</span></div>
    </div>
  )

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">Stocks bas</span>
        <span className="badge badge-amber">{allLow.length} article{allLow.length>1?'s':''}</span>
      </div>
      {allLow.map(s => (
        <div key={s.id} className="stock-item">
          <span className="stock-emoji">{s.emoji}</span>
          <span className="stock-name">{s.nom}</span>
          <span style={{ fontSize:11, color:'var(--text-3)', background:'var(--bg)', padding:'2px 6px', borderRadius:8 }}>{s.giteNom}</span>
          <span className="qty-val low" style={{ marginLeft:'auto' }}>{s.quantite}</span>
        </div>
      ))}
    </div>
  )
}

export default function Dashboard() {
  const { gites } = useGites()
  const { soldeGlobal, totalDu, totalRecu, soldeByGite } = useFinances()
  const { sessions } = useHeures()
  const totalHeures = sessions.reduce((s, h) => s + h.duree_minutes, 0)
  const soldes = soldeByGite()

  function fmt(n) { return Number(n).toFixed(2).replace('.', ',') + ' €' }

  return (
    <div>
      {/* Résumé financier */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', marginBottom:10 }}>
        <div className="stat-card">
          <div className="stat-num" style={{ color:'var(--warm)', fontSize:'1.3rem' }}>{fmt(totalDu)}</div>
          <div className="stat-label">Total dû</div>
        </div>
        <div className="stat-card">
          <div className="stat-num" style={{ color:'var(--sage)', fontSize:'1.3rem' }}>{fmt(totalRecu)}</div>
          <div className="stat-label">Total reçu</div>
        </div>
        <div className="stat-card">
          <div className="stat-num" style={{ color: soldeGlobal>0?'var(--warm)':soldeGlobal<0?'var(--sage)':'var(--text)', fontSize:'1.3rem' }}>
            {soldeGlobal>0?'+':''}{fmt(soldeGlobal)}
          </div>
          <div className="stat-label">Solde</div>
        </div>
      </div>

      {/* Solde par gîte */}
      {soldes.length > 0 && (
        <div className="card" style={{ marginBottom:10 }}>
          <div className="card-title" style={{ marginBottom:'0.75rem' }}>Soldes par gîte</div>
          {soldes.map(g => (
            <div key={g.gite_id} className="fin-detail-row">
              <span className="fin-detail-label">{g.nom}</span>
              <span className={`fin-solde-badge ${g.solde>0?'positif':g.solde<0?'negatif':'zero'}`} style={{ fontSize:12 }}>
                {g.solde>0?'Doit '+fmt(g.solde):g.solde<0?'Avance '+fmt(Math.abs(g.solde)):'Soldé'}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Heures */}
      {totalHeures > 0 && (
        <div className="fin-heures-row" style={{ marginBottom:10 }}>
          <Clock size={14} color="var(--text-2)" />
          <span>{formatMinutes(totalHeures)} travaillées en attente (tous gîtes)</span>
        </div>
      )}

      {/* Calendrier multi-gîtes */}
      {gites.length > 0 && <CalendarMulti gites={gites} />}

      {/* Stocks bas */}
      {gites.length > 0 && <StocksAlert gites={gites} />}
    </div>
  )
}
