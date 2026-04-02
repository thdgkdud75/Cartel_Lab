'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'

const PLANNER_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api').replace(/\/api$/, '')

const COLOR_OPTIONS = [
  { value: 'red', label: '빨강', style: { color: '#b44343', background: '#fff5f5' } },
  { value: 'blue', label: '파랑', style: { color: '#2d63c7', background: '#f4f8ff' } },
  { value: 'yellow', label: '노랑', style: { color: '#b07d00', background: '#fffbea' } },
  { value: 'green', label: '초록', style: { color: '#2e7d32', background: '#f1fdf2' } },
]

export default function DailyTodoPanel({ selectedDate }) {
  const { data: session } = useSession()
  const today = selectedDate || new Date().toISOString().slice(0, 10)

  const [todos, setTodos] = useState([])
  const [dailyGoal, setDailyGoal] = useState(null)
  const [goalInput, setGoalInput] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [addDate, setAddDate] = useState(today)
  const [addDuration, setAddDuration] = useState(1)
  const [addColor, setAddColor] = useState('red')
  const [addContents, setAddContents] = useState([''])
  const [loading, setLoading] = useState(false)

  const token = session?.user?.access_token
  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {}

  const fetchTodos = useCallback(async () => {
    if (!session) return
    try {
      const res = await fetch(`${PLANNER_BASE}/planner/api/daily-todos/`, {
        headers: authHeaders,
        credentials: 'include',
      })
      if (!res.ok) return
      const data = await res.json()
      setTodos(data.todos || [])
    } catch (e) {
      console.error(e)
    }
  }, [token, session])

  const fetchDailyGoal = useCallback(async () => {
    if (!session) return
    try {
      const res = await fetch(`${PLANNER_BASE}/planner/api/daily-goal/`, {
        headers: authHeaders,
        credentials: 'include',
      })
      if (!res.ok) return
      const data = await res.json()
      setDailyGoal(data.content ? data : null)
    } catch (e) {
      console.error(e)
    }
  }, [token, session])

  useEffect(() => {
    fetchTodos()
    fetchDailyGoal()
  }, [fetchTodos, fetchDailyGoal])

  const toggleTodo = async (id) => {
    try {
      await fetch(`${PLANNER_BASE}/planner/api/daily-todos/${id}/toggle/`, {
        method: 'POST',
        headers: authHeaders,
        credentials: 'include',
      })
      fetchTodos()
    } catch (e) {
      console.error(e)
    }
  }

  const deleteTodo = async (id) => {
    try {
      await fetch(`${PLANNER_BASE}/planner/api/daily-todos/${id}/delete/`, {
        method: 'POST',
        headers: authHeaders,
        credentials: 'include',
      })
      fetchTodos()
    } catch (e) {
      console.error(e)
    }
  }

  const addTodos = async (e) => {
    e.preventDefault()
    const validContents = addContents.filter((c) => c.trim())
    if (validContents.length === 0) return
    setLoading(true)
    try {
      // API POST: 각 항목을 개별 추가
      for (const c of validContents) {
        const body = JSON.stringify({ content: c, target_date: addDate, duration_days: addDuration, color: addColor })
        await fetch(`${PLANNER_BASE}/planner/api/daily-todos/`, {
          method: 'POST',
          headers: { ...authHeaders, 'Content-Type': 'application/json' },
          body,
          credentials: 'include',
        })
      }
      setModalOpen(false)
      setAddContents([''])
      fetchTodos()
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  const saveGoal = async (e) => {
    e.preventDefault()
    if (!goalInput.trim()) return
    try {
      await fetch(`${PLANNER_BASE}/planner/api/daily-goal/`, {
        method: 'POST',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: goalInput }),
        credentials: 'include',
      })
      setGoalInput('')
      fetchDailyGoal()
    } catch (e) {
      console.error(e)
    }
  }

  const toggleGoal = async () => {
    if (!dailyGoal) return
    try {
      await fetch(`${PLANNER_BASE}/planner/api/daily-goal/achieve/`, {
        method: 'POST',
        headers: authHeaders,
        credentials: 'include',
      })
      fetchDailyGoal()
    } catch (e) {
      console.error(e)
    }
  }

  const addContentRow = () => setAddContents((prev) => [...prev, ''])
  const removeContentRow = (idx) => setAddContents((prev) => prev.filter((_, i) => i !== idx))
  const updateContent = (idx, val) => setAddContents((prev) => prev.map((c, i) => (i === idx ? val : c)))

  const allChecked = todos.length > 0 && todos.every((t) => t.is_checked)
  const checkedCount = todos.filter((t) => t.is_checked).length

  return (
    <section style={{ border: '1px solid #eceef2', borderRadius: 14, background: '#fff', marginBottom: 14, padding: 12, position: 'relative', overflow: 'visible' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#e15c00' }}>To-Do-List</h2>
          <p style={{ margin: '0 0 10px', color: '#737984', fontSize: 13 }}>{today} 할 일을 입력해주세요</p>
        </div>

        {session && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, position: 'relative' }}>
            {/* 전체선택 */}
            <button
              type="button"
              disabled={todos.length === 0}
              onClick={async () => {
                const fd = new FormData()
                fd.append('target_date', today)
                fd.append('checked', allChecked ? '0' : '1')
                await fetch(`${PLANNER_BASE}/planner/daily-todos/set-checked/`, {
                  method: 'POST', headers: authHeaders, body: fd, credentials: 'include',
                })
                fetchTodos()
              }}
              style={{ border: 0, borderRadius: 8, padding: '8px 12px', fontSize: 13, fontWeight: 700, cursor: 'pointer', background: '#fff4ea', color: '#e15c00', opacity: todos.length === 0 ? 0.5 : 1 }}
            >
              {allChecked ? '선택해제' : '전체선택'}
            </button>
            {/* 등록 */}
            <button
              type="button"
              disabled={checkedCount === 0}
              onClick={async () => {
                const fd = new FormData()
                fd.append('target_date', today)
                await fetch(`${PLANNER_BASE}/planner/daily-todos/register/`, {
                  method: 'POST', headers: authHeaders, body: fd, credentials: 'include',
                })
                fetchTodos()
              }}
              style={{ border: 0, borderRadius: 8, padding: '8px 12px', fontSize: 13, fontWeight: 700, cursor: 'pointer', background: '#fff4ea', color: '#e15c00', opacity: checkedCount === 0 ? 0.5 : 1 }}
            >
              등록
            </button>
            {/* 삭제 */}
            <button
              type="button"
              disabled={checkedCount === 0}
              onClick={async () => {
                for (const t of todos.filter((t) => t.is_checked)) {
                  await deleteTodo(t.id)
                }
              }}
              style={{ border: '1px solid #ffd2b3', borderRadius: 8, padding: '8px 12px', fontSize: 13, fontWeight: 700, cursor: 'pointer', background: '#fff', color: '#9f3f10', opacity: checkedCount === 0 ? 0.5 : 1 }}
            >
              삭제
            </button>
            {/* 추가 버튼 */}
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              style={{ border: 0, borderRadius: 8, padding: '8px 12px', fontSize: 13, fontWeight: 700, cursor: 'pointer', background: '#ff6f0f', color: '#fff', whiteSpace: 'nowrap' }}
            >
              추가
            </button>

            {/* 투두 추가 모달 */}
            {modalOpen && (
              <div style={{ position: 'absolute', right: 0, width: 'min(760px, calc(100vw - 48px))', top: 'calc(100% + 10px)', zIndex: 45, border: '1px solid #ffd2b3', borderRadius: 12, background: '#fff', boxShadow: '0 12px 28px rgba(0,0,0,0.12)', padding: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#e15c00' }}>투두 추가</p>
                  <button type="button" onClick={() => setModalOpen(false)} style={{ border: 0, background: 'transparent', color: '#8a9099', fontSize: 20, lineHeight: 1, cursor: 'pointer' }}>×</button>
                </div>
                <form onSubmit={addTodos}>
                  <div style={{ display: 'grid', gridTemplateColumns: '120px 120px 1fr', gap: 8, marginBottom: 8, alignItems: 'end' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <span style={{ fontSize: 11, color: '#8b9098', fontWeight: 700 }}>날짜</span>
                      <input type="date" value={addDate} onChange={(e) => setAddDate(e.target.value)} required style={{ border: '1px solid #dfe3ea', borderRadius: 8, padding: '8px 10px', fontSize: 14 }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <span style={{ fontSize: 11, color: '#8b9098', fontWeight: 700 }}>기간(일)</span>
                      <input type="number" value={addDuration} min={1} max={60} onChange={(e) => setAddDuration(Number(e.target.value))} required style={{ border: '1px solid #dfe3ea', borderRadius: 8, padding: '8px 10px', fontSize: 14 }} />
                    </div>
                  </div>
                  {/* 색상 */}
                  <div style={{ marginBottom: 8 }}>
                    <span style={{ fontSize: 11, color: '#8b9098', fontWeight: 700, display: 'block', marginBottom: 6 }}>색상</span>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                      {COLOR_OPTIONS.map((c) => (
                        <label key={c.value} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5, border: addColor === c.value ? '2px solid #ff6f0f' : '1px solid #dfe3ea', borderRadius: 999, minHeight: 42, padding: '10px 18px', fontSize: 14, cursor: 'pointer', ...c.style }}>
                          <input type="radio" name="add-color" value={c.value} checked={addColor === c.value} onChange={() => setAddColor(c.value)} style={{ display: 'none' }} />
                          {c.label}
                        </label>
                      ))}
                    </div>
                  </div>
                  {/* 항목 입력 */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
                    {addContents.map((c, i) => (
                      <div key={i} style={{ display: 'flex', gap: 6 }}>
                        <input
                          type="text"
                          value={c}
                          onChange={(e) => updateContent(i, e.target.value)}
                          maxLength={255}
                          placeholder="투두 입력"
                          required={i === 0}
                          style={{ flex: 1, border: '1px solid #dfe3ea', borderRadius: 8, padding: '8px 10px', fontSize: 14 }}
                        />
                        {i > 0 && (
                          <button type="button" onClick={() => removeContentRow(i)} style={{ border: 'none', background: '#f1f5f9', borderRadius: 6, padding: '0 10px', cursor: 'pointer', color: '#9ca3af', fontSize: 16 }}>✕</button>
                        )}
                      </div>
                    ))}
                  </div>
                  <button type="button" onClick={addContentRow} style={{ background: 'none', border: '1px dashed #94a3b8', borderRadius: 6, width: '100%', padding: 7, fontSize: 13, color: '#64748b', cursor: 'pointer', marginBottom: 10 }}>+ 항목 추가</button>
                  <button type="submit" disabled={loading} style={{ border: 0, borderRadius: 8, padding: '8px 12px', background: '#ff6f0f', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>추가하기</button>
                </form>
              </div>
            )}
          </div>
        )}
      </div>

      {session && (
        <>
          <p style={{ margin: '0 0 10px', fontSize: 12, color: '#8a9099' }}>
            추가 버튼을 눌러 투두를 추가한 후 체크하고 등록 버튼을 눌러야 캘린더, 오늘의 계획, Google Calendar에 반영됩니다.
          </p>

          {/* 오늘의 목표 */}
          {dailyGoal ? (
            <div style={{ marginBottom: 10, padding: '10px 14px', background: '#eff6ff', borderRadius: 10, border: '1px solid #bfdbfe', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 13, color: '#6b7280', flexShrink: 0 }}>🎯</span>
              <span style={{ flex: 1, fontSize: 14, color: '#1e3a5f', ...(dailyGoal.is_achieved && { textDecoration: 'line-through', opacity: 0.5 }) }}>{dailyGoal.content}</span>
              <button type="button" onClick={toggleGoal} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 16, padding: 0 }}>
                {dailyGoal.is_achieved ? '✅' : '⬜'}
              </button>
            </div>
          ) : (
            <form onSubmit={saveGoal} style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <input
                type="text"
                value={goalInput}
                onChange={(e) => setGoalInput(e.target.value)}
                maxLength={255}
                placeholder="🎯 오늘의 목표 입력"
                style={{ flex: 1, padding: '8px 12px', border: '1px solid #bfdbfe', borderRadius: 8, fontSize: 13, background: '#eff6ff', outline: 'none' }}
              />
              <button type="submit" style={{ padding: '8px 14px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>등록</button>
            </form>
          )}

          {/* 투두 목록 */}
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: 6 }}>
            {todos.length === 0 ? (
              <li style={{ color: '#8b9098', fontSize: 14, border: '1px dashed #d9dce3', borderRadius: 10, padding: 12, background: '#fcfcfd' }}>
                해당 날짜의 투두가 없습니다. 추가 버튼을 눌러 입력해보세요.
              </li>
            ) : (
              todos.map((todo) => (
                <li
                  key={todo.id}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, border: '1px solid #eceef2', borderRadius: 10, background: '#fff', padding: 8, cursor: 'pointer', transition: 'border-color .15s ease', ...(todo.is_checked && { borderColor: '#ffbe8f', boxShadow: '0 0 0 1px #ffd7bc inset' }) }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
                    <button
                      type="button"
                      onClick={() => toggleTodo(todo.id)}
                      style={{ width: 20, height: 20, border: todo.is_checked ? 'none' : '1.5px solid #d9dde5', borderRadius: 6, background: todo.is_checked ? '#e15c00' : '#fff', color: todo.is_checked ? '#fff' : 'transparent', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, cursor: 'pointer', padding: 0, flexShrink: 0 }}
                    >
                      {todo.is_checked && '✓'}
                    </button>
                    <span style={{ fontSize: 14, ...(todo.is_checked && { textDecoration: 'line-through', color: '#8b9098' }) }}>
                      {todo.content}
                    </span>
                  </span>
                </li>
              ))
            )}
          </ul>
        </>
      )}

      {!session && (
        <p style={{ color: '#8b9098', fontSize: 14, border: '1px dashed #d9dce3', borderRadius: 10, padding: 12, background: '#fcfcfd' }}>
          투두리스트를 사용하려면 로그인하세요.
        </p>
      )}
    </section>
  )
}
