import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'

import { getTripByEditToken, saveTrip } from '@/api/trips'
import { getRoute } from '@/api/routes'
import { MapView, type RouteSegment } from '@/components/map/MapView'
import { PlaceSearch } from '@/components/PlaceSearch'
import { DEFAULT_MAP_CENTER, TRAVEL_MODE_COLOR, TRAVEL_MODE_LABEL, TRAVEL_MODES } from '@/lib/constants'
import { durationLabel, formatMonthDay, addDays, tripDayNumbers } from '@/lib/date'
import { useTripStore } from '@/store/tripStore'
import type { PlaceSearchResult } from '@/types/place'
import type { LatLng } from '@/types/route'
import { stopToUpdateRequest, type TripStop } from '@/types/trip'

export function TripEditPage() {
  const { editToken } = useParams<{ editToken: string }>()
  const trip = useTripStore((s) => s.trip)
  const isDirty = useTripStore((s) => s.isDirty)
  const setTrip = useTripStore((s) => s.setTrip)
  const addStop = useTripStore((s) => s.addStop)
  const removeStop = useTripStore((s) => s.removeStop)
  const moveStop = useTripStore((s) => s.moveStop)
  const setTravelMode = useTripStore((s) => s.setTravelMode)
  const markSaved = useTripStore((s) => s.markSaved)

  const [mapCenter, setMapCenter] = useState<LatLng>(DEFAULT_MAP_CENTER)
  const [isSaving, setIsSaving] = useState(false)
  const [selectedDay, setSelectedDay] = useState(1)
  const [routeSegments, setRouteSegments] = useState<RouteSegment[]>([])

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
  const routeKey = dayStops.map((s) => `${s.lat},${s.lng},${s.travelMode}`).join('|')

  // 구간(이전 정류지 -> 이 정류지)별로 선택된 이동수단에 맞춰 경로를 따로 불러오고, 수단마다 다른 색으로 그린다.
  useEffect(() => {
    if (dayStops.length < 2) {
      setRouteSegments([])
      return
    }
    let cancelled = false
    Promise.all(
      dayStops.slice(1).map((stop, i) =>
        getRoute({
          waypoints: [
            { lat: dayStops[i].lat, lng: dayStops[i].lng },
            { lat: stop.lat, lng: stop.lng },
          ],
          mode: stop.travelMode,
        }).then((res) => ({ path: res.path, color: TRAVEL_MODE_COLOR[stop.travelMode] })),
      ),
    )
      .then((segments) => {
        if (!cancelled) setRouteSegments(segments)
      })
      .catch(() => {
        if (!cancelled) setRouteSegments([])
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
    // 같은 날짜에 같은 장소를 두 번 추가하면 li의 key(provider:providerPlaceId:dayNo)가 겹쳐서
    // 순서 변경 시 React가 두 행을 혼동하는 버그가 있었다. 같은 날 중복 추가는 막는다.
    const alreadyAdded = trip.stops.some(
      (s) => s.dayNo === selectedDay && s.provider === place.provider && s.providerPlaceId === place.providerPlaceId,
    )
    if (alreadyAdded) return

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
      travelMode: 'CAR',
      memo: null,
      stayMinutes: null,
    })
  }

  function handleMove(stop: TripStop, direction: -1 | 1) {
    const currentIndex = dayStops.indexOf(stop)
    if (currentIndex === -1) return
    moveStop(stop, currentIndex + direction)
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
            <li key={`${stop.provider}:${stop.providerPlaceId}:${stop.dayNo}`}>
              {i > 0 && (
                <div className="travel-mode-row">
                  {TRAVEL_MODES.map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      className={stop.travelMode === mode ? 'mode-btn active' : 'mode-btn'}
                      style={stop.travelMode === mode ? { borderColor: TRAVEL_MODE_COLOR[mode], color: TRAVEL_MODE_COLOR[mode] } : undefined}
                      onClick={() => setTravelMode(stop, mode)}
                    >
                      {TRAVEL_MODE_LABEL[mode]}
                    </button>
                  ))}
                </div>
              )}
              <div className="trip-stop-row">
                <div className="order-controls">
                  <span className="order-badge">{i + 1}</span>
                  <div className="order-buttons">
                    <button
                      type="button"
                      aria-label="위로 이동"
                      disabled={i === 0}
                      onClick={() => handleMove(stop, -1)}
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      aria-label="아래로 이동"
                      disabled={i === dayStops.length - 1}
                      onClick={() => handleMove(stop, 1)}
                    >
                      ▼
                    </button>
                  </div>
                </div>
                <div className="place-info">
                  <strong>{stop.name}</strong>
                  {stop.address && <span>{stop.address}</span>}
                </div>
                <button type="button" onClick={() => removeStop(stop)}>
                  삭제
                </button>
              </div>
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
          routeSegments={routeSegments}
          center={mapCenter}
          onCenterChanged={setMapCenter}
          className="map-view"
        />
      </main>
    </div>
  )
}
