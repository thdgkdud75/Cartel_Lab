'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'

const PLANNER_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api').replace(/\/api$/, '')

type Goal = {
  id: number
  content: string
  created_by: string
}

type PreviousWeek = {
  week_start: string
  week_end: string
  goals: Goal[]
}

function GoalItem({ goal, showDelete, onDelete }: { goal: Goal; showDelete: boolean; onDelete: (id: number) => void }) {
  return (
    <li style={{ padding: 10, border: '1px solid #f2e3d7', background: '#fffaf5', borderRadius: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: '1 1 auto' }}>
          <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#1d4ed8', flexShrink: 0 }}>
            {(goal.created_by || '?').charAt(0)}
          </div>
          <div>
            <span style={{ color: '#8b9098', fontSize: 12, display: 'block', marginBottom: 4 }}>{goal.created_by}</span>
            <span style={{ display: 'block', fontSize: 14, lineHeight: 1.35, wordBreak: 'break-word' }}>{goal.content}</span>
          </div>
        </div>
        {showDelete && (
          <button
            type="button"
            onClick={() => onDelete(goal.id)}
            style={{ border: '1px solid #ffd2b3', borderRadius: 8, background: '#fff', color: '#9f3f10', fontSize: 12, fontWeight: 700, padding: '6px 10px', cursor: 'pointer', flexShrink: 0 }}
          >
            삭제
          </button>
        )}
      </div>
    </li>
  )
}

export default function LabGoalPanel() {
  const { data: session } = useSession()
  const [goals, setGoals] = useState<Goal[]>([])
  const [weekStart, setWeekStart] = useState('')
  const [previousWeeks, setPreviousWeeks] = useState<PreviousWeek[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)

  const token = session?.user?.access_token
  const authHeaders: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {}

  const fetchGoals = useCallback(async () => {
    try {
      const res = await fetch(`${PLANNER_BASE}/planner/api/lab-goals/`, {
        headers: authHeaders,
        credentials: 'include',
      })
      if (!res.ok) return
      const data = await res.json()
      setGoals(data.goals || [])
      setWeekStart(data.week_start || '')
      setPreviousWeeks(data.previous_weeks || [])
    } catch (e) {
      console.error(e)
    }
  }, [token])

  useEffect(() => { fetchGoals() }, [fetchGoals])

  const addGoal = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim()) return
    setLoading(true)
    try {
      const fd = new FormData()
      fd.append('content', content)
      await fetch(`${PLANNER_BASE}/planner/lab-goals/add/`, {
        method: 'POST',
        headers: authHeaders,
        body: fd,
        credentials: 'include',
      })
      setContent('')
      setModalOpen(false)
      fetchGoals()
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  const deleteGoal = async (id: number) => {
    try {
      await fetch(`${PLANNER_BASE}/planner/lab-goals/${id}/delete/`, {
        method: 'POST',
        headers: authHeaders,
        credentials: 'include',
      })
      fetchGoals()
    } catch (e) {
      console.error(e)
    }
  }

  const weekEnd = weekStart
    ? (() => {
        const d = new Date(weekStart)
        d.setDate(d.getDate() + 6)
        return d.toISOString().slice(0, 10)
      })()
    : ''

  return (
    <section style={{ border: '1px solid #eceef2', borderRadius: 14, background: '#fff', marginBottom: 14, padding: 12, position: 'relative', overflow: 'visible' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#e15c00', whiteSpace: 'nowrap' }}>이번주 목표</h2>
        {session ? (
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            style={{ border: 0, borderRadius: 8, padding: '8px 12px', background: '#ff6f0f', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
          >
            추가
          </button>
        ) : (
          <p style={{ margin: 0, fontSize: 12, color: '#8b9098' }}>로그인하면 이번주 목표를 추가할 수 있습니다.</p>
        )}
      </div>

      {weekStart && (
        <p style={{ margin: '0 0 10px', fontSize: 13, color: '#7f858e' }}>
          {weekStart} ~ {weekEnd} (월요일 ~ 일요일)
        </p>
      )}

      {modalOpen && (
        <div style={{ position: 'absolute', left: 12, right: 12, top: 56, zIndex: 35, border: '1px solid #ffd2b3', borderRadius: 12, background: '#fff', boxShadow: '0 12px 28px rgba(0,0,0,0.12)', padding: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#e15c00' }}>이번주 목표 추가</p>
            <button type="button" onClick={() => setModalOpen(false)} style={{ border: 0, background: 'transparent', color: '#8a9099', fontSize: 20, lineHeight: 1, cursor: 'pointer' }}>×</button>
          </div>
          <form onSubmit={addGoal} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8 }}>
            <input
              type="text"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              maxLength={255}
              placeholder="이번주 공용 목표 입력"
              required
              style={{ width: '100%', border: '1px solid #dfe3ea', borderRadius: 8, padding: '8px 10px', fontSize: 14, boxSizing: 'border-box' }}
            />
            <button type="submit" disabled={loading} style={{ border: 0, borderRadius: 8, padding: '8px 12px', background: '#ff6f0f', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              추가하기
            </button>
          </form>
        </div>
      )}

      <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: 6 }}>
        {goals.length === 0 ? (
          <li style={{ color: '#8b9098', fontSize: 14, border: '1px dashed #d9dce3', borderRadius: 10, padding: 12, background: '#fcfcfd' }}>
            이번 주에 등록된 목표가 없습니다.
          </li>
        ) : (
          goals.map((goal) => (
            <GoalItem key={goal.id} goal={goal} showDelete={!!session} onDelete={deleteGoal} />
          ))
        )}
      </ul>

      {previousWeeks.length > 0 && (
        <div style={{ marginTop: 16, borderTop: '1px solid #f1e1d5', paddingTop: 14, display: 'grid', gap: 12 }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#e15c00' }}>이전 4주 목표</h3>
          {previousWeeks.map((week) => (
            <div key={week.week_start} style={{ display: 'grid', gap: 6 }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#8a4f1f' }}>
                {week.week_start} ~ {week.week_end}
              </p>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: 6 }}>
                {week.goals.map((goal) => (
                  <GoalItem key={goal.id} goal={goal} showDelete={false} onDelete={() => {}} />
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
