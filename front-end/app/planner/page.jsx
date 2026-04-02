'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import LabGoalPanel from '@/components/planner/LabGoalPanel'
import DailyTodoPanel from '@/components/planner/DailyTodoPanel'
import CalendarPanel from '@/components/planner/CalendarPanel'

const PLANNER_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api').replace(/\/api$/, '')

export default function PlannerPage() {
  const [view, setView] = useState('plan')
  const { data: session } = useSession()
  const [gcal, setGcal] = useState(null) // { enabled, connected, email, connect_url, disconnect_url, sync_url }

  const token = session?.user?.access_token
  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {}

  const fetchGcalStatus = useCallback(async () => {
    if (!session) return
    try {
      const res = await fetch(`${PLANNER_BASE}/planner/api/google-calendar/status/`, {
        headers: authHeaders,
        credentials: 'include',
      })
      if (!res.ok) return
      setGcal(await res.json())
    } catch (e) {
      console.error(e)
    }
  }, [token, session])

  useEffect(() => { fetchGcalStatus() }, [fetchGcalStatus])

  return (
    <div style={{ maxWidth: 1380, margin: '0 auto', padding: 16 }}>
      {/* 탭 + 구글 캘린더 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        {/* 탭 스위처 */}
        <div style={{ display: 'inline-flex', gap: 6, border: '1px solid #ffd2b3', borderRadius: 10, padding: 4, background: '#fff8f3' }}>
          {['plan', 'goal'].map((v) => (
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

        {/* 구글 캘린더 상태 */}
        {session && gcal?.enabled && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <p style={{ margin: 0, fontSize: 12, color: '#7b4b24', whiteSpace: 'nowrap' }}>
              {gcal.connected
                ? `Google Calendar 연결됨${gcal.email ? ` (${gcal.email})` : ''}`
                : 'Google Calendar 미연결'}
            </p>
            {gcal.connected ? (
              <>
                <form method="post" action={`${PLANNER_BASE}${gcal.sync_url}`} style={{ margin: 0 }}>
                  <button type="submit" style={{ border: 0, borderRadius: 8, padding: '6px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer', background: '#ffe8d6', color: '#e15c00' }}>
                    캘린더 동기화
                  </button>
                </form>
                <form method="post" action={`${PLANNER_BASE}${gcal.disconnect_url}`} style={{ margin: 0 }}>
                  <button type="submit" style={{ border: 0, borderRadius: 8, padding: '6px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer', background: '#ffe8d6', color: '#e15c00' }}>
                    연결 해제
                  </button>
                </form>
              </>
            ) : (
              <a
                href={`${PLANNER_BASE}${gcal.connect_url}`}
                style={{ border: 0, borderRadius: 8, padding: '6px 10px', fontSize: 12, fontWeight: 700, textDecoration: 'none', background: '#ff6f0f', color: '#fff' }}
              >
                구글 연결
              </a>
            )}
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
