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

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

function buildCalendar(year, month) {
  // month: 0-indexed
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const weeks = []
  let week = []

  // 앞 빈칸 채우기 (일요일 시작)
  for (let i = 0; i < firstDay.getDay(); i++) {
    const d = new Date(year, month, 1 - (firstDay.getDay() - i))
    week.push({ date: d, isCurrentMonth: false })
  }

  for (let d = 1; d <= lastDay.getDate(); d++) {
    week.push({ date: new Date(year, month, d), isCurrentMonth: true })
    if (week.length === 7) {
      weeks.push(week)
      week = []
    }
  }

  // 뒷 빈칸 채우기
  if (week.length > 0) {
    let extra = 1
    while (week.length < 7) {
      week.push({ date: new Date(year, month + 1, extra++), isCurrentMonth: false })
    }
    weeks.push(week)
  }

  return weeks
}

function toYMD(date) {
  return date.toISOString().slice(0, 10)
}

export default function CalendarPanel() {
  const { data: session } = useSession()
  const todayDate = new Date()
  const [currentYear, setCurrentYear] = useState(todayDate.getFullYear())
  const [currentMonth, setCurrentMonth] = useState(todayDate.getMonth())
  const [selectedDate, setSelectedDate] = useState(toYMD(todayDate))
  const [goals, setGoals] = useState([]) // 선택된 날짜의 계획 목록
  const [pickedGoalId, setPickedGoalId] = useState(null)

  // 일정 추가 모달
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [addDate, setAddDate] = useState(selectedDate)
  const [addDuration, setAddDuration] = useState(1)
  const [addColor, setAddColor] = useState('red')
  const [addContent, setAddContent] = useState('')

  // 일정 수정 모달
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editContent, setEditContent] = useState('')
  const [editDate, setEditDate] = useState('')
  const [editDuration, setEditDuration] = useState(1)
  const [editColor, setEditColor] = useState('red')
  const [editGoalId, setEditGoalId] = useState(null)

  const [loading, setLoading] = useState(false)

  const token = session?.user?.access_token
  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {}

  const weeks = buildCalendar(currentYear, currentMonth)
  const monthLabel = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`

  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentYear((y) => y - 1); setCurrentMonth(11) }
    else setCurrentMonth((m) => m - 1)
  }
  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentYear((y) => y + 1); setCurrentMonth(0) }
    else setCurrentMonth((m) => m + 1)
  }

  const fetchGoals = useCallback(async () => {
    if (!session) return
    try {
      const res = await fetch(
        `${PLANNER_BASE}/planner/goals/?date=${selectedDate}`,
        { headers: authHeaders, credentials: 'include' }
      )
      if (!res.ok) return
      // TODO: 백엔드에서 /planner/api/goals/?date=YYYY-MM-DD API 추가 필요
      // 현재는 빈 배열로 처리
      const data = await res.json().catch(() => ({ goals: [] }))
      setGoals(data.goals || [])
    } catch {
      setGoals([])
    }
  }, [selectedDate, token, session])

  useEffect(() => {
    fetchGoals()
    setPickedGoalId(null)
  }, [fetchGoals])

  const addGoal = async (e) => {
    e.preventDefault()
    if (!addContent.trim()) return
    setLoading(true)
    try {
      const fd = new FormData()
      fd.append('start_date', addDate)
      fd.append('duration_days', addDuration)
      fd.append('color', addColor)
      fd.append('content', addContent)
      await fetch(`${PLANNER_BASE}/planner/goals/add/`, {
        method: 'POST',
        headers: authHeaders,
        body: fd,
        credentials: 'include',
      })
      setAddModalOpen(false)
      setAddContent('')
      fetchGoals()
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  const deleteGoal = async (id) => {
    try {
      await fetch(`${PLANNER_BASE}/planner/goals/${id}/delete/`, {
        method: 'POST',
        headers: authHeaders,
        credentials: 'include',
      })
      fetchGoals()
      setPickedGoalId(null)
    } catch (e) {
      console.error(e)
    }
  }

  const toggleGoal = async (id) => {
    try {
      await fetch(`${PLANNER_BASE}/planner/goals/${id}/toggle/`, {
        method: 'POST',
        headers: authHeaders,
        credentials: 'include',
      })
      fetchGoals()
    } catch (e) {
      console.error(e)
    }
  }

  const openEditModal = (goal) => {
    setEditGoalId(goal.id)
    setEditContent(goal.content)
    setEditDate(selectedDate)
    setEditDuration(1)
    setEditColor(goal.color || 'red')
    setEditModalOpen(true)
  }

  const updateGoal = async (e) => {
    e.preventDefault()
    if (!editGoalId) return
    setLoading(true)
    try {
      const fd = new FormData()
      fd.append('start_date', editDate)
      fd.append('duration_days', editDuration)
      fd.append('color', editColor)
      fd.append('content', editContent)
      await fetch(`${PLANNER_BASE}/planner/goals/${editGoalId}/update/`, {
        method: 'POST',
        headers: authHeaders,
        body: fd,
        credentials: 'include',
      })
      setEditModalOpen(false)
      fetchGoals()
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  const pickedGoal = goals.find((g) => g.id === pickedGoalId)

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.35fr) minmax(310px, 1fr)', gap: 16 }}>
      {/* 캘린더 패널 */}
      <section style={{ border: '1px solid #eceef2', borderRadius: 14, background: '#fff', overflow: 'hidden', position: 'relative' }}>
        {/* 헤더 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, borderBottom: '1px solid #eceef2', padding: 12, background: '#fff9f5' }}>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800, letterSpacing: '-0.01em' }}>{monthLabel}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button type="button" onClick={prevMonth} style={{ textDecoration: 'none', color: '#e15c00', border: '1px solid #ffd2b3', background: '#fff1e8', borderRadius: 8, padding: '7px 10px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>이전 달</button>
            <button type="button" onClick={nextMonth} style={{ textDecoration: 'none', color: '#e15c00', border: '1px solid #ffd2b3', background: '#fff1e8', borderRadius: 8, padding: '7px 10px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>다음 달</button>
          </div>
        </div>

        {/* 일정 추가 버튼 */}
        <div style={{ borderBottom: '1px solid #eceef2', background: '#fff', padding: '10px 12px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 10, position: 'relative', zIndex: 40 }}>
          {session && (
            <button
              type="button"
              onClick={() => { setAddDate(selectedDate); setAddModalOpen(true) }}
              style={{ border: 0, borderRadius: 8, padding: '8px 12px', background: '#ff6f0f', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
            >
              추가
            </button>
          )}

          {/* 일정 추가 모달 */}
          {addModalOpen && (
            <div style={{ position: 'absolute', left: 12, right: 12, top: 52, zIndex: 60, border: '1px solid #ffd2b3', borderRadius: 12, background: '#fff', boxShadow: '0 12px 28px rgba(0,0,0,0.12)', padding: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#e15c00' }}>일정 추가</p>
                <button type="button" onClick={() => setAddModalOpen(false)} style={{ border: 0, background: 'transparent', color: '#8a9099', fontSize: 20, lineHeight: 1, cursor: 'pointer' }}>×</button>
              </div>
              <form onSubmit={addGoal}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 8, alignItems: 'start', marginBottom: 8 }}>
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

        {/* 요일 헤더 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid #eceef2' }}>
          {WEEKDAYS.map((d) => (
            <div key={d} style={{ textAlign: 'center', padding: '6px 0', fontSize: 12, fontWeight: 700, color: '#8b9098' }}>{d}</div>
          ))}
        </div>

        {/* 달력 그리드 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
          {weeks.flat().map(({ date, isCurrentMonth }, idx) => {
            const ymd = toYMD(date)
            const isSelected = ymd === selectedDate
            const isToday = ymd === toYMD(todayDate)
            return (
              <button
                key={idx}
                type="button"
                onClick={() => setSelectedDate(ymd)}
                style={{
                  border: 'none', borderTop: '1px solid #eceef2', borderRight: idx % 7 !== 6 ? '1px solid #eceef2' : 'none',
                  background: isSelected ? '#fff1e8' : '#fff',
                  padding: '6px 4px', minHeight: 80, cursor: 'pointer', textAlign: 'left', verticalAlign: 'top',
                  opacity: isCurrentMonth ? 1 : 0.35,
                }}
              >
                <span style={{
                  display: 'inline-flex', width: 24, height: 24, alignItems: 'center', justifyContent: 'center',
                  borderRadius: '50%', fontSize: 13, fontWeight: isToday ? 800 : 400,
                  background: isToday ? '#ff6f0f' : 'transparent',
                  color: isToday ? '#fff' : '#333',
                }}>
                  {date.getDate()}
                </span>
              </button>
            )
          })}
        </div>
      </section>

      {/* 상세 패널 (오늘의 계획) */}
      <aside style={{ border: '1px solid #eceef2', borderRadius: 14, background: '#fff', overflow: 'visible', position: 'relative', zIndex: 35 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eceef2', padding: '12px 12px 10px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#1a1a1a' }}>오늘의 계획</h2>
            <p style={{ margin: '2px 0 0', fontSize: 13, color: '#737984' }}>{selectedDate}</p>
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <button
              type="button"
              disabled={!pickedGoalId}
              onClick={() => pickedGoal && openEditModal(pickedGoal)}
              style={{ border: 0, borderRadius: 8, padding: '8px 12px', background: pickedGoalId ? '#ffe8d6' : '#f2f3f6', color: pickedGoalId ? '#e15c00' : '#a8adb6', fontSize: 13, fontWeight: 700, cursor: pickedGoalId ? 'pointer' : 'not-allowed' }}
            >
              수정
            </button>
            <button
              type="button"
              disabled={!pickedGoalId}
              onClick={() => pickedGoalId && deleteGoal(pickedGoalId)}
              style={{ border: '1px solid #ffd2b3', borderRadius: 8, padding: '8px 12px', background: '#fff', color: pickedGoalId ? '#9f3f10' : '#a8adb6', fontSize: 13, fontWeight: 700, cursor: pickedGoalId ? 'pointer' : 'not-allowed' }}
            >
              삭제
            </button>
          </div>
        </div>

        {/* 수정 모달 */}
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
            {goals.length === 0 ? (
              <li style={{ color: '#8b9098', fontSize: 14, border: '1px dashed #d9dce3', borderRadius: 10, padding: 12, background: '#fcfcfd' }}>
                이 날짜에 등록된 계획이 없습니다. 캘린더의 추가 버튼으로 등록하세요.
              </li>
            ) : (
              goals.map((goal) => (
                <li
                  key={goal.id}
                  onClick={() => setPickedGoalId(pickedGoalId === goal.id ? null : goal.id)}
                  style={{ border: '1px solid #ebedf2', borderRadius: 10, padding: 8, display: 'grid', gap: 7, background: '#fff', cursor: 'pointer', transition: 'border-color .15s ease', ...(pickedGoalId === goal.id && { borderColor: '#ffbe8f', boxShadow: '0 0 0 1px #ffd7bc inset' }) }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: '1 1 auto' }}>
                      <span style={{ fontSize: 14, ...(goal.is_completed && { textDecoration: 'line-through', color: '#8b9098' }) }}>
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
