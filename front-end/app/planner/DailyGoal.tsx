'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'

const PLANNER_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api').replace(/\/api$/, '')

type DailyGoalData = {
  id: number
  date: string
  content: string
  is_achieved: boolean
}

export default function DailyGoal() {
  const { data: session } = useSession()
  const [goal, setGoal] = useState<DailyGoalData | null>(null)
  const [input, setInput] = useState('')

  const token = session?.user?.access_token
  const authHeaders: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {}

  const fetchGoal = useCallback(async () => {
    if (!session) return
    try {
      const res = await fetch(`${PLANNER_BASE}/planner/api/daily-goal/`, {
        headers: authHeaders,
        credentials: 'include',
      })
      if (!res.ok) return
      const data = await res.json()
      setGoal(data.content ? (data as DailyGoalData) : null)
    } catch (e) {
      console.error(e)
    }
  }, [token, session])

  useEffect(() => { fetchGoal() }, [fetchGoal])

  const saveGoal = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return
    try {
      await fetch(`${PLANNER_BASE}/planner/api/daily-goal/`, {
        method: 'POST',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: input }),
        credentials: 'include',
      })
      setInput('')
      fetchGoal()
    } catch (e) {
      console.error(e)
    }
  }

  const toggleGoal = async () => {
    if (!goal) return
    try {
      await fetch(`${PLANNER_BASE}/planner/api/daily-goal/achieve/`, {
        method: 'POST',
        headers: authHeaders,
        credentials: 'include',
      })
      fetchGoal()
    } catch (e) {
      console.error(e)
    }
  }

  const deleteGoal = async () => {
    try {
      await fetch(`${PLANNER_BASE}/planner/api/daily-goal/delete/`, {
        method: 'POST',
        headers: authHeaders,
        credentials: 'include',
      })
      setGoal(null)
    } catch (e) {
      console.error(e)
    }
  }

  if (!session) return null

  if (goal) {
    return (
      <div style={{ marginBottom: 10, padding: '10px 14px', background: '#eff6ff', borderRadius: 10, border: '1px solid #bfdbfe', display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 13, color: '#6b7280', flexShrink: 0 }}>🎯</span>
        <span style={{ flex: 1, fontSize: 14, color: '#1e3a5f', ...(goal.is_achieved && { textDecoration: 'line-through', opacity: 0.5 }) }}>
          {goal.content}
        </span>
        <button type="button" onClick={toggleGoal} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 16, padding: 0 }}>
          {goal.is_achieved ? '✅' : '⬜'}
        </button>
        <button type="button" onClick={deleteGoal} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 14, color: '#94a3b8', padding: 0 }}>
          ✕
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={saveGoal} style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        maxLength={255}
        placeholder="🎯 오늘의 목표 입력"
        style={{ flex: 1, padding: '8px 12px', border: '1px solid #bfdbfe', borderRadius: 8, fontSize: 13, background: '#eff6ff', outline: 'none' }}
      />
      <button type="submit" style={{ padding: '8px 14px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
        등록
      </button>
    </form>
  )
}
