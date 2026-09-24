import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { createTrip } from '@/api/trips'
import { addLocalTrip, getLocalTrips } from '@/lib/localTrips'

export function HomePage() {
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const localTrips = getLocalTrips()

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return

    setIsSubmitting(true)
    try {
      const today = new Date().toISOString().slice(0, 10)
      const res = await createTrip({
        title,
        countryCode: 'KR',
        startDate: today,
        endDate: today,
      })
      addLocalTrip({ tripId: res.tripId, editToken: res.editToken, title })
      navigate(`/t/${res.editToken}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div>
      <h1>여행 계획 만들기</h1>
      <form onSubmit={handleCreate}>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="여행 제목 (예: 제주 3박4일)"
        />
        <button type="submit" disabled={isSubmitting}>
          만들기
        </button>
      </form>

      {localTrips.length > 0 && (
        <section>
          <h2>내 여행</h2>
          <ul>
            {localTrips.map((t) => (
              <li key={t.tripId}>
                <a href={`/t/${t.editToken}`}>{t.title}</a>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
