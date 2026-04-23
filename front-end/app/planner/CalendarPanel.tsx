'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'

const PLANNER_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api').replace(/\/api$/, '')

type Goal = {
  id: number
  content: string
  color: string
  planned_time: string | null
  is_completed: boolean
}

type ColorOption = { value: string; label: string; style: React.CSSProperties }

const COLOR_OPTIONS: ColorOption[] = [
  { value: 'red',    label: '빨강', style: { color: '#b44343', background: '#fff5f5' } },
  { value: 'blue',   label: '파랑', style: { color: '#2d63c7', background: '#f4f8ff' } },
  { value: 'yellow', label: '노랑', style: { color: '#b07d00', background: '#fffbea' } },
  { value: 'green',  label: '초록', style: { color: '#2e7d32', background: '#f1fdf2' } },
]

const COLOR_CELL_STYLE: Record<string, React.CSSProperties> = {
  red:    { background: '#ffe7e7', color: '#9c2e2e' },
  blue:   { background: '#e8f1ff', color: '#1f4f93' },
  yellow: { background: '#fff7d9', color: '#8a6400' },
  green:  { background: '#e6f7ea', color: '#1f6b39' },
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

function buildCalendar(year: number, month: number) {
  const firstDay = new Date(year, month, 1)
  const weeks: { date: Date; isCurrentMonth: boolean }[][] = []
  let week: { date: Date; isCurrentMonth: boolean }[] = []

  for (let i = 0; i < firstDay.getDay(); i++) {
    week.push({ date: new Date(year, month, 1 - (firstDay.getDay() - i)), isCurrentMonth: false })
  }
  const lastDate = new Date(year, month + 1, 0).getDate()
  for (let d = 1; d <= lastDate; d++) {
    week.push({ date: new Date(year, month, d), isCurrentMonth: true })
    if (week.length === 7) { weeks.push(week); week = [] }
  }
  if (week.length > 0) {
    let extra = 1
    while (week.length < 7) week.push({ date: new Date(year, month + 1, extra++), isCurrentMonth: false })
    weeks.push(week)
  }
  return weeks
}

function toYMD(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function adjacentYMD(ymd: string, offset: number): string {
  const d = new Date(ymd)
  d.setDate(d.getDate() + offset)
  return toYMD(d)
}

const MAX_PREVIEW = 2

export default function CalendarPanel() {
  const { data: session } = useSession()
  const todayDate = new Date()

  const [currentYear, setCurrentYear] = useState(todayDate.getFullYear())
  const [currentMonth, setCurrentMonth] = useState(todayDate.getMonth())
  const [selectedDate, setSelectedDate] = useState(toYMD(todayDate))
  const [goalsByDate, setGoalsByDate] = useState<Record<string, Goal[]>>({})
  const [detailGoals, setDetailGoals] = useState<Goal[]>([])
  const [pickedGoalId, setPickedGoalId] = useState<number | null>(null)

  const [addModalOpen, setAddModalOpen] = useState(false)
  const [addDate, setAddDate] = useState(selectedDate)
  const [addDuration, setAddDuration] = useState(1)
  const [addColor, setAddColor] = useState('red')
  const [addContent, setAddContent] = useState('')

  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editContent, setEditContent] = useState('')
  const [editDate, setEditDate] = useState('')
  const [editDuration, setEditDuration] = useState(1)
  const [editColor, setEditColor] = useState('red')
  const [editGoalId, setEditGoalId] = useState<number | null>(null)

  const [loading, setLoading] = useState(false)

  const token = session?.user?.access_token
  const authHeaders: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {}

  const monthLabel = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`
  const weeks = buildCalendar(currentYear, currentMonth)

  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentYear((y) => y - 1); setCurrentMonth(11) }
    else setCurrentMonth((m) => m - 1)
  }
  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentYear((y) => y + 1); setCurrentMonth(0) }
    else setCurrentMonth((m) => m + 1)
  }

  const fetchCalendar = useCallback(async () => {
    if (!session) return
    try {
      const res = await fetch(`${PLANNER_BASE}/planner/api/calendar/?month=${monthLabel}`, {
        headers: authHeaders, credentials: 'include',
      })
      if (!res.ok) return
      const data = await res.json()
      setGoalsByDate(data.goals_by_date || {})
    } catch (e) { console.error(e) }
  }, [monthLabel, token, session])

  const fetchDetailGoals = useCallback(async () => {
    if (!session) return
    try {
      const res = await fetch(`${PLANNER_BASE}/planner/api/goals/?date=${selectedDate}`, {
        headers: authHeaders, credentials: 'include',
      })
      if (!res.ok) return
      const data = await res.json()
      setDetailGoals(data.goals || [])
    } catch { setDetailGoals([]) }
  }, [selectedDate, token, session])

  useEffect(() => { fetchCalendar() }, [fetchCalendar])
  useEffect(() => { fetchDetailGoals(); setPickedGoalId(null) }, [fetchDetailGoals])

  const addGoal = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!addContent.trim()) return
    setLoading(true)
    try {
      const fd = new FormData()
      fd.append('start_date', addDate)
      fd.append('duration_days', String(addDuration))
      fd.append('color', addColor)
      fd.append('content', addContent)
      await fetch(`${PLANNER_BASE}/planner/goals/add/`, { method: 'POST', headers: authHeaders, body: fd, credentials: 'include' })
      setAddModalOpen(false)
      setAddContent('')
      fetchCalendar()
      fetchDetailGoals()
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  const deleteGoal = async (id: number) => {
    try {
      await fetch(`${PLANNER_BASE}/planner/goals/${id}/delete/`, { method: 'POST', headers: authHeaders, credentials: 'include' })
      fetchCalendar(); fetchDetailGoals(); setPickedGoalId(null)
    } catch (e) { console.error(e) }
  }

  const toggleGoal = async (id: number) => {
    try {
      await fetch(`${PLANNER_BASE}/planner/goals/${id}/toggle/`, { method: 'POST', headers: authHeaders, credentials: 'include' })
      fetchDetailGoals()
    } catch (e) { console.error(e) }
  }

  const openEditModal = (goal: Goal) => {
    setEditGoalId(goal.id)
    setEditContent(goal.content)
    setEditDate(selectedDate)
    setEditDuration(1)
    setEditColor(goal.color || 'red')
    setEditModalOpen(true)
  }

  const updateGoal = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editGoalId) return
    setLoading(true)
    try {
      const fd = new FormData()
      fd.append('start_date', editDate)
      fd.append('duration_days', String(editDuration))
      fd.append('color', editColor)
      fd.append('content', editContent)
      await fetch(`${PLANNER_BASE}/planner/goals/${editGoalId}/update/`, { method: 'POST', headers: authHeaders, body: fd, credentials: 'include' })
      setEditModalOpen(false)
      fetchCalendar(); fetchDetailGoals()
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  const pickedGoal = detailGoals.find((g) => g.id === pickedGoalId)

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.35fr) minmax(310px, 1fr)', gap: 16 }}>
      {/* 캘린더 */}
      <section style={{ border: '1px solid #eceef2', borderRadius: 14, background: '#fff', overflow: 'hidden', position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, borderBottom: '1px solid #eceef2', padding: 12, background: '#fff9f5' }}>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>{monthLabel}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button type="button" onClick={prevMonth} style={{ color: '#e15c00', border: '1px solid #ffd2b3', background: '#fff1e8', borderRadius: 8, padding: '7px 10px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>이전 달</button>
            <button type="button" onClick={nextMonth} style={{ color: '#e15c00', border: '1px solid #ffd2b3', background: '#fff1e8', borderRadius: 8, padding: '7px 10px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>다음 달</button>
          </div>
        </div>

        <div style={{ borderBottom: '1px solid #eceef2', background: '#fff', padding: '10px 12px', display: 'flex', justifyContent: 'flex-end', position: 'relative', zIndex: 40 }}>
          {session && (
            <button type="button" onClick={() => { setAddDate(selectedDate); setAddModalOpen(true) }} style={{ border: 0, borderRadius: 8, padding: '8px 12px', background: '#ff6f0f', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              추가
            </button>
          )}
          {addModalOpen && (
            <div style={{ position: 'absolute', left: 12, right: 12, top: 52, zIndex: 60, border: '1px solid #ffd2b3', borderRadius: 12, background: '#fff', boxShadow: '0 12px 28px rgba(0,0,0,0.12)', padding: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#e15c00' }}>일정 추가</p>
                <button type="button" onClick={() => setAddModalOpen(false)} style={{ border: 0, background: 'transparent', color: '#8a9099', fontSize: 20, lineHeight: 1, cursor: 'pointer' }}>×</button>
              </div>
              <form onSubmit={addGoal}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 8, marginBottom: 8 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <span style={{ fontSize: 11, color: '#8b9098', fontWeight: 700 }}>날짜</span>
                    <input type="date" value={addDate} onChange={(e) => setAddDate(e.target.value)} required style={{ border: '1px solid #dfe3ea', borderRadius: 8, padding: '8px 10px', fontSize: 14 }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <span style={{ fontSize: 11, color: '#8b9098', fontWeight: 700 }}>기간(일)</span>
                    <input type="number" value={addDuration} min={1} max={60} onChange={(e) => setAddDuration(Number(e.target.value))} required style={{ border: '1px solid #dfe3ea', borderRadius: 8, padding: '8px 10px', fontSize: 14 }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3, gridColumn: '1 / -1' }}>
                    <span style={{ fontSize: 11, color: '#8b9098', fontWeight: 700 }}>색상</span>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                      {COLOR_OPTIONS.map((c) => (
                        <label key={c.value} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5, border: addColor === c.value ? '2px solid #ff6f0f' : '1px solid #dfe3ea', borderRadius: 999, minHeight: 42, padding: '10px 18px', fontSize: 14, cursor: 'pointer', ...c.style }}>
                          <input type="radio" name="add-goal-color" value={c.value} checked={addColor === c.value} onChange={() => setAddColor(c.value)} style={{ display: 'none' }} />
                          {c.label}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3, gridColumn: '1 / -1' }}>
                    <input type="text" value={addContent} onChange={(e) => setAddContent(e.target.value)} maxLength={255} placeholder="목표 입력" required style={{ border: '1px solid #dfe3ea', borderRadius: 8, padding: '8px 10px', fontSize: 14 }} />
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button type="submit" disabled={loading} style={{ border: 0, borderRadius: 8, padding: '8px 12px', background: '#ff6f0f', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>추가하기</button>
                </div>
              </form>
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', background: '#fafafb', borderBottom: '1px solid #eceef2' }}>
          {WEEKDAYS.map((d) => (
            <div key={d} style={{ textAlign: 'center', padding: '10px 4px', fontSize: 12, fontWeight: 700, color: '#8b9098' }}>{d}</div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
          {weeks.flat().map(({ date, isCurrentMonth }, idx) => {
            const ymd = toYMD(date)
            const isSelected = ymd === selectedDate
            const isToday = ymd === toYMD(todayDate)
            const cellGoals = goalsByDate[ymd] || []
            const previewGoals = cellGoals.slice(0, MAX_PREVIEW)
            const moreCount = cellGoals.length - MAX_PREVIEW
            const prevGoalIds = new Set((goalsByDate[adjacentYMD(ymd, -1)] || []).map((g) => g.id))
            const nextGoalIds = new Set((goalsByDate[adjacentYMD(ymd, 1)] || []).map((g) => g.id))

            return (
              <button
                key={idx}
                type="button"
                onClick={() => setSelectedDate(ymd)}
                style={{
                  border: 'none',
                  borderTop: '1px solid #eceef2',
                  borderRight: idx % 7 !== 6 ? '1px solid #eceef2' : 'none',
                  borderBottom: '1px solid #eceef2',
                  background: isSelected ? '#fff5ee' : isCurrentMonth ? '#fff' : '#fcfcfd',
                  boxShadow: isSelected ? 'inset 0 0 0 1px #ffd2b3' : 'none',
                  padding: '6px 6px 4px',
                  minHeight: 108,
                  cursor: 'pointer',
                  textAlign: 'left',
                  color: isCurrentMonth ? 'inherit' : '#bdc2cb',
                }}
              >
                <span style={{ display: 'inline-flex', width: 24, height: 24, alignItems: 'center', justifyContent: 'center', borderRadius: '50%', fontSize: 12, fontWeight: 700, background: isToday ? '#ff6f0f' : 'transparent', color: isToday ? '#fff' : 'inherit' }}>
                  {date.getDate()}
                </span>
                <div style={{ marginTop: 6, display: 'grid', gap: 3 }}>
                  {previewGoals.map((g) => {
                    const continuedPrev = prevGoalIds.has(g.id)
                    const continuedNext = nextGoalIds.has(g.id)
                    return (
                      <div
                        key={g.id}
                        style={{
                          fontSize: 11, lineHeight: 1.25,
                          padding: '2px 5px',
                          borderRadius: continuedPrev && continuedNext ? 0 : continuedPrev ? '0 6px 6px 0' : continuedNext ? '6px 0 0 6px' : 6,
                          marginLeft: continuedPrev ? -7 : 0,
                          marginRight: continuedNext ? -7 : 0,
                          paddingLeft: continuedPrev ? 12 : 5,
                          paddingRight: continuedNext ? 12 : 5,
                          overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                          ...(COLOR_CELL_STYLE[g.color] || COLOR_CELL_STYLE.red),
                        }}
                      >
                        {g.planned_time && <span style={{ fontWeight: 700, marginRight: 3 }}>{g.planned_time}</span>}
                        {g.content}
                      </div>
                    )
                  })}
                  {moreCount > 0 && <div style={{ fontSize: 11, color: '#7a7f88' }}>+{moreCount}개 더</div>}
                </div>
              </button>
            )
          })}
        </div>
      </section>

      {/* 상세 패널 */}
      <aside style={{ border: '1px solid #eceef2', borderRadius: 14, background: '#fff', overflow: 'visible', position: 'relative', zIndex: 35 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eceef2', padding: '14px 14px 12px', background: '#fff9f5' }}>
          <div>
            <h2 style={{ margin: '0 0 4px', fontSize: 18, letterSpacing: '-0.01em' }}>오늘의 계획</h2>
            <p style={{ margin: 0, fontSize: 13, color: '#737984' }}>{selectedDate}</p>
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <button type="button" disabled={!pickedGoalId} onClick={() => pickedGoal && openEditModal(pickedGoal)} style={{ border: 0, borderRadius: 8, padding: '8px 12px', background: pickedGoalId ? '#ffe8d6' : '#f2f3f6', color: pickedGoalId ? '#e15c00' : '#a8adb6', fontSize: 13, fontWeight: 700, cursor: pickedGoalId ? 'pointer' : 'not-allowed' }}>수정</button>
            <button type="button" disabled={!pickedGoalId} onClick={() => pickedGoalId && deleteGoal(pickedGoalId)} style={{ border: '1px solid #ffd2b3', borderRadius: 8, padding: '8px 12px', background: '#fff', color: pickedGoalId ? '#9f3f10' : '#a8adb6', fontSize: 13, fontWeight: 700, cursor: pickedGoalId ? 'pointer' : 'not-allowed' }}>삭제</button>
          </div>
        </div>

        {editModalOpen && (
          <div style={{ position: 'absolute', left: 12, right: 12, top: 12, zIndex: 70, border: '1px solid #ffd2b3', borderRadius: 12, background: '#fff', boxShadow: '0 12px 28px rgba(0,0,0,0.12)', padding: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#e15c00' }}>계획 수정</p>
              <button type="button" onClick={() => setEditModalOpen(false)} style={{ border: 0, background: 'transparent', color: '#8a9099', fontSize: 20, lineHeight: 1, cursor: 'pointer' }}>×</button>
            </div>
            <form onSubmit={updateGoal}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8, marginBottom: 8 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <span style={{ fontSize: 11, color: '#8b9098', fontWeight: 700 }}>날짜</span>
                  <input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} required style={{ border: '1px solid #dfe3ea', borderRadius: 8, padding: '8px 10px', fontSize: 14 }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <span style={{ fontSize: 11, color: '#8b9098', fontWeight: 700 }}>기간(일)</span>
                  <input type="number" value={editDuration} min={1} max={60} onChange={(e) => setEditDuration(Number(e.target.value))} required style={{ border: '1px solid #dfe3ea', borderRadius: 8, padding: '8px 10px', fontSize: 14 }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3, gridColumn: '1 / -1' }}>
                  <span style={{ fontSize: 11, color: '#8b9098', fontWeight: 700 }}>색상</span>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                    {COLOR_OPTIONS.map((c) => (
                      <label key={c.value} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5, border: editColor === c.value ? '2px solid #ff6f0f' : '1px solid #dfe3ea', borderRadius: 999, minHeight: 36, padding: '6px 8px', fontSize: 13, cursor: 'pointer', ...c.style }}>
                        <input type="radio" name="edit-goal-color" value={c.value} checked={editColor === c.value} onChange={() => setEditColor(c.value)} style={{ display: 'none' }} />
                        {c.label}
                      </label>
                    ))}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3, gridColumn: '1 / -1' }}>
                  <input type="text" value={editContent} onChange={(e) => setEditContent(e.target.value)} maxLength={255} required style={{ border: '1px solid #dfe3ea', borderRadius: 8, padding: '8px 10px', fontSize: 14 }} />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button type="submit" disabled={loading} style={{ border: 0, borderRadius: 8, padding: '8px 12px', background: '#ff6f0f', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>저장</button>
              </div>
            </form>
          </div>
        )}

        <div style={{ padding: 12 }}>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: 8 }}>
            {detailGoals.length === 0 ? (
              <li style={{ color: '#8b9098', fontSize: 14, border: '1px dashed #d9dce3', borderRadius: 10, padding: 12, background: '#fcfcfd' }}>
                이 날짜에 등록된 계획이 없습니다. 추가 버튼으로 등록하세요.
              </li>
            ) : (
              detailGoals.map((goal) => (
                <li
                  key={goal.id}
                  onClick={() => setPickedGoalId(pickedGoalId === goal.id ? null : goal.id)}
                  style={{ border: '1px solid #ebedf2', borderRadius: 10, padding: 8, display: 'grid', gap: 7, background: '#fff', cursor: 'pointer', transition: 'border-color .15s ease', ...(pickedGoalId === goal.id && { borderColor: '#ffbe8f', boxShadow: '0 0 0 1px #ffd7bc inset' }) }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: '1 1 auto' }}>
                      {goal.planned_time && <span style={{ fontSize: 12, color: '#a05a26', fontWeight: 700, minWidth: 42, flexShrink: 0 }}>{goal.planned_time}</span>}
                      <span style={{ fontSize: 14, minWidth: 0, wordBreak: 'break-word', ...(goal.is_completed && { textDecoration: 'line-through', color: '#8b9098' }) }}>
                        {goal.content}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); toggleGoal(goal.id) }}
                      style={{ padding: '6px 10px', border: 0, borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', background: goal.is_completed ? '#e15c00' : '#fff4ea', color: goal.is_completed ? '#fff' : '#e15c00' }}
                    >
                      {goal.is_completed ? '완료취소' : '완료'}
                    </button>
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>
      </aside>
    </div>
  )
}
