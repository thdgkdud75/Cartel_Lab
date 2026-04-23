'use client'

import { useState } from 'react'
import LabGoalPanel from './LabGoalPanel'
import DailyTodoPanel from './DailyTodoPanel'
import CalendarPanel from './CalendarPanel'
import GoogleCalendarBar from './GoogleCalendarBar'

export default function PlannerPage() {
  const [view, setView] = useState<'plan' | 'goal'>('plan')

  return (
    <div style={{ maxWidth: 1380, margin: '0 auto', padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <div style={{ display: 'inline-flex', gap: 6, border: '1px solid #ffd2b3', borderRadius: 10, padding: 4, background: '#fff8f3' }}>
          {(['plan', 'goal'] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              style={{
                fontSize: 14, fontWeight: 700, border: 0, borderRadius: 8, padding: '8px 14px', cursor: 'pointer',
                background: view === v ? '#ff6f0f' : 'transparent',
                color: view === v ? '#fff' : '#8a9099',
              }}
            >
              {v === 'plan' ? '계획' : '목표'}
            </button>
          ))}
        </div>

        <GoogleCalendarBar />
      </div>

      {view === 'goal' && <LabGoalPanel />}
      {view === 'plan' && (
        <>
          <DailyTodoPanel />
          <CalendarPanel />
        </>
      )}
    </div>
  )
}
