'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'

const PLANNER_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api').replace(/\/api$/, '')

export default function GoogleCalendarBar() {
  const { data: session } = useSession()
  const [gcal, setGcal] = useState(null)

  const token = session?.user?.access_token
  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {}

  const fetchStatus = useCallback(async () => {
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

  useEffect(() => { fetchStatus() }, [fetchStatus])

  if (!session || !gcal?.enabled) return null

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      <p style={{ margin: 0, fontSize: 12, color: '#7b4b24', whiteSpace: 'nowrap' }}>
        {gcal.connected
          ? `Google Calendar 연결됨${gcal.email ? ` (${gcal.email})` : ''}`
          : 'Google Calendar 미연결'}
      </p>

      {gcal.connected ? (
        <>
          <form method="post" action={`${PLANNER_BASE}${gcal.sync_url}`} style={{ margin: 0 }}>
            <button
              type="submit"
              style={{ border: 0, borderRadius: 8, padding: '6px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer', background: '#ffe8d6', color: '#e15c00' }}
            >
              캘린더 동기화
            </button>
          </form>
          <form method="post" action={`${PLANNER_BASE}${gcal.disconnect_url}`} style={{ margin: 0 }}>
            <button
              type="submit"
              style={{ border: 0, borderRadius: 8, padding: '6px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer', background: '#ffe8d6', color: '#e15c00' }}
            >
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
  )
}
