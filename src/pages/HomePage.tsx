import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { createTrip } from '@/api/trips'
import { durationLabel } from '@/lib/date'
import { addLocalTrip, getLocalTrips, removeLocalTrip } from '@/lib/localTrips'
import type { LocalTripRef } from '@/types/trip'

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

export function HomePage() {
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [startDate, setStartDate] = useState(today())
  const [endDate, setEndDate] = useState(today())
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [localTrips, setLocalTrips] = useState(getLocalTrips)

  // "내 여행"은 브라우저 바로가기일 뿐이라 목록에서만 빠지고, 서버의 여행 데이터는 그대로 남는다.
  function handleRemove(trip: LocalTripRef) {
    if (!window.confirm(`"${trip.title}"을(를) 내 여행 목록에서 지울까요?`)) return
    removeLocalTrip(trip.tripId)
    setLocalTrips(getLocalTrips())
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return

    setIsSubmitting(true)
    try {
      const res = await createTrip({
        title,
        countryCode: 'KR',
        startDate,
        endDate: endDate < startDate ? startDate : endDate,
      })
      addLocalTrip({ tripId: res.tripId, editToken: res.editToken, title })
      navigate(`/t/${res.editToken}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="home-hero">
      <div className="home-card">
        <h1 className="brand">TELPO</h1>
        <p className="tagline">계획만 짜, 이동은 텔포처럼</p>

        <form className="home-form-full" onSubmit={handleCreate}>
          <label className="field">
            <span>여행 이름</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 제주 여행"
              required
            />
          </label>

          <label className="field">
            <span>기간</span>
            <div className="date-range">
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value)
                  if (endDate < e.target.value) setEndDate(e.target.value)
                }}
              />
              <span className="date-range-sep">~</span>
              <input type="date" value={endDate} min={startDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
            <span className="duration-badge">{durationLabel(startDate, endDate)}</span>
          </label>

          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? '만드는 중...' : '여행 만들기'}
          </button>
        </form>

        {localTrips.length > 0 && (
          <div className="home-trip-list">
            <h2>내 여행</h2>
            <ul>
              {localTrips.map((t) => (
                <li key={t.tripId}>
                  <Link to={`/t/${t.editToken}`}>{t.title}</Link>
                  <button
                    type="button"
                    className="home-trip-remove"
                    aria-label={`${t.title} 지우기`}
                    onClick={() => handleRemove(t)}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
