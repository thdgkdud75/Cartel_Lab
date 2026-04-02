'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import LabGoalPanel from '@/components/planner/LabGoalPanel'
import DailyTodoPanel from '@/components/planner/DailyTodoPanel'
import CalendarPanel from '@/components/planner/CalendarPanel'

const PLANNER_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api').replace(/\/api$/, '')

export default function PlannerPage() {
  const [view, setView] = useState('plan')
  const { data: session } = useSession()

  return (
    <div style={{ maxWidth: 1380, margin: '0 auto', padding: 16 }}>
      {/* 상단 탭 + 구글 캘린더 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div style={{ display: 'inline-flex', gap: 6, border: '1px solid #ffd2b3', borderRadius: 10, padding: 4, background: '#fff8f3' }}>
          <button
            type="button"
            onClick={() => setView('plan')}
            style={{
              fontSize: 14, fontWeight: 700, border: 0, borderRadius: 8, padding: '8px 14px', cursor: 'pointer',
              background: view === 'plan' ? '#ff6f0f' : 'transparent',
              color: view === 'plan' ? '#fff' : '#8a9099',
            }}
          >
            계획
          </button>
          <button
            type="button"
            onClick={() => setView('goal')}
            style={{
              fontSize: 14, fontWeight: 700, border: 0, borderRadius: 8, padding: '8px 14px', cursor: 'pointer',
              background: view === 'goal' ? '#ff6f0f' : 'transparent',
              color: view === 'goal' ? '#fff' : '#8a9099',
            }}
          >
            목표
          </button>
        </div>

        {session && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <p style={{ margin: 0, fontSize: 12, color: '#7b4b24', whiteSpace: 'nowrap' }}>
              Google Calendar 미연결
            </p>
            <a
              href={`${PLANNER_BASE}/planner/google/connect/`}
              style={{ border: 0, borderRadius: 8, padding: '6px 10px', fontSize: 12, fontWeight: 700, textDecoration: 'none', background: '#ff6f0f', color: '#fff' }}
            >
              구글 연결
            </a>
          </div>
        )}
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
