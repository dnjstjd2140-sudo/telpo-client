import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'

import { getTripByEditToken, saveTrip } from '@/api/trips'
import { getRoute } from '@/api/routes'
import { MapView } from '@/components/map/MapView'
import { PlaceSearch } from '@/components/PlaceSearch'
import { DEFAULT_MAP_CENTER } from '@/lib/constants'
import { durationLabel, formatMonthDay, addDays, tripDayNumbers } from '@/lib/date'
import { useTripStore } from '@/store/tripStore'
import type { PlaceSearchResult } from '@/types/place'
import type { LatLng } from '@/types/route'
import { stopToUpdateRequest } from '@/types/trip'

export function TripEditPage() {
  const { editToken } = useParams<{ editToken: string }>()
  const trip = useTripStore((s) => s.trip)
  const isDirty = useTripStore((s) => s.isDirty)
  const setTrip = useTripStore((s) => s.setTrip)
  const addStop = useTripStore((s) => s.addStop)
  const removeStop = useTripStore((s) => s.removeStop)
  const markSaved = useTripStore((s) => s.markSaved)

  const [mapCenter, setMapCenter] = useState<LatLng>(DEFAULT_MAP_CENTER)
  const [isSaving, setIsSaving] = useState(false)
  const [selectedDay, setSelectedDay] = useState(1)
  const [routePath, setRoutePath] = useState<LatLng[] | null>(null)

  useEffect(() => {
    if (!editToken) return
    getTripByEditToken(editToken).then((t) => {
      setTrip(t, { editToken })
      if (t.stops.length > 0) {
        setMapCenter({ lat: t.stops[0].lat, lng: t.stops[0].lng })
      }
    })
  }, [editToken, setTrip])

  const dayNumbers = trip && trip.startDate && trip.endDate ? tripDayNumbers(trip.startDate, trip.endDate) : [1]
  const dayStops =
    trip
      ?.stops.filter((s) => s.dayNo === selectedDay)
      .sort((a, b) => a.orderNo - b.orderNo) ?? []
  const routeKey = dayStops.map((s) => `${s.lat},${s.lng}`).join('|')

  useEffect(() => {
    if (dayStops.length < 2) {
      setRoutePath(null)
      return
    }
    let cancelled = false
    getRoute({ waypoints: dayStops.map((s) => ({ lat: s.lat, lng: s.lng })), mode: 'CAR' })
      .then((res) => {
        if (!cancelled) setRoutePath(res.path)
      })
      .catch(() => {
        if (!cancelled) setRoutePath(null)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeKey])

  if (!trip) return <div>불러오는 중...</div>

  const markers = dayStops.map((stop, i) => ({
    id: `${stop.provider}:${stop.providerPlaceId}:${stop.dayNo}:${stop.orderNo}`,
    position: { lat: stop.lat, lng: stop.lng },
    label: stop.name,
    order: i + 1,
  }))

  function handleAdd(place: PlaceSearchResult) {
    if (!trip) return
    const orderNo = trip.stops.filter((s) => s.dayNo === selectedDay).length
    addStop({
      // 저장 전까지 임시 값. 저장(PUT) 응답으로 실제 placeId가 채워진다.
      placeId: 0,
      name: place.name,
      address: place.address,
      lat: place.lat,
      lng: place.lng,
      provider: place.provider,
      providerPlaceId: place.providerPlaceId,
      dayNo: selectedDay,
      orderNo,
      memo: null,
      stayMinutes: null,
    })
  }

  async function handleSave() {
    if (!editToken || !trip) return
    setIsSaving(true)
    try {
      const saved = await saveTrip(editToken, {
        title: trip.title,
        startDate: trip.startDate,
        endDate: trip.endDate,
        stops: trip.stops.map(stopToUpdateRequest),
      })
      markSaved(saved)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="trip-layout">
      <aside className="trip-sidebar">
        <h1>{trip.title}</h1>
        <p className="subtitle">
          {trip.startDate && trip.endDate ? durationLabel(trip.startDate, trip.endDate) : ''}
          {isDirty ? ' · 저장 안 됨' : ''}
        </p>

        <div className="day-tabs">
          {dayNumbers.map((day) => (
            <button
              key={day}
              type="button"
              className={day === selectedDay ? 'day-tab active' : 'day-tab'}
              onClick={() => setSelectedDay(day)}
            >
              <span>Day {day}</span>
              {trip.startDate && <span className="day-tab-date">{formatMonthDay(addDays(trip.startDate, day - 1))}</span>}
            </button>
          ))}
        </div>

        <PlaceSearch center={mapCenter} onAdd={handleAdd} />

        <ul className="trip-stop-list">
          {dayStops.map((stop, i) => (
            <li key={`${stop.provider}:${stop.providerPlaceId}:${stop.dayNo}:${stop.orderNo}`}>
              <div className="place-info">
                <strong>
                  {i + 1}. {stop.name}
                </strong>
                {stop.address && <span>{stop.address}</span>}
              </div>
              <button type="button" onClick={() => removeStop(stop)}>
                삭제
              </button>
            </li>
          ))}
        </ul>

        <button type="button" className="save-button" onClick={handleSave} disabled={isSaving || !isDirty}>
          {isSaving ? '저장 중...' : '저장'}
        </button>
      </aside>
      <main className="trip-map">
        <MapView
          markers={markers}
          route={routePath ?? undefined}
          center={mapCenter}
          onCenterChanged={setMapCenter}
          className="map-view"
        />
      </main>
    </div>
  )
}
