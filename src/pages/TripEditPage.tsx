import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'

import { getTripByEditToken, saveTrip } from '@/api/trips'
import { getRoute } from '@/api/routes'
import { MapView, type RouteSegment } from '@/components/map/MapView'
import { PlaceSearch } from '@/components/PlaceSearch'
import { RouteDetail } from '@/components/RouteDetail'
import { DEFAULT_MAP_CENTER, TRAVEL_MODE_COLOR, TRAVEL_MODE_LABEL, TRAVEL_MODES } from '@/lib/constants'
import { durationLabel, formatMonthDay, addDays, tripDayNumbers } from '@/lib/date'
import { formatDuration, formatDistance } from '@/lib/format'
import { useTripStore } from '@/store/tripStore'
import type { PlaceSearchResult } from '@/types/place'
import type { LatLng, RouteResponse } from '@/types/route'
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
  // 일정 목록의 이동 구간이나 지도 위 경로선에 마우스를 올리면 양쪽 모두에서 그 구간을 강조한다.
  const [hoveredSegment, setHoveredSegment] = useState<number | null>(null)
  const [routeSegments, setRouteSegments] = useState<RouteSegment[]>([])
  // dayStops[i]로 오는 구간의 소요시간/거리. 첫 정류지(index 0)는 이전 구간이 없어 항상 undefined.
  const [segmentInfo, setSegmentInfo] = useState<Record<number, RouteResponse>>({})
  // (출발좌표->도착좌표:수단) 단위 클라이언트 캐시. 같은 두 지점 사이를 같은 수단으로 다시 보면
  // 서버에 또 요청하지 않고 바로 재사용한다 (자차<->도보 왔다갔다 토글해도 이미 본 조합은 재요청 없음).
  const routeCacheRef = useRef(new Map<string, RouteResponse>())

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
  // 서버 응답의 durationSeconds/distanceMeters도 같이 받아서 각 구간 줄에 표시한다.
  useEffect(() => {
    if (dayStops.length < 2) {
      setRouteSegments([])
      setSegmentInfo({})
      return
    }
    let cancelled = false
    Promise.all(
      dayStops.slice(1).map((stop, i) => {
        const from = dayStops[i]
        const cacheKey = `${from.lat},${from.lng}->${stop.lat},${stop.lng}:${stop.travelMode}`
        const cached = routeCacheRef.current.get(cacheKey)
        const result = cached
          ? Promise.resolve(cached)
          : getRoute({
              waypoints: [
                { lat: from.lat, lng: from.lng },
                { lat: stop.lat, lng: stop.lng },
              ],
              mode: stop.travelMode,
            }).then((res) => {
              routeCacheRef.current.set(cacheKey, res)
              return res
            })

        return result.then((res) => ({
          path: res.path,
          color: TRAVEL_MODE_COLOR[stop.travelMode],
          dashed: stop.travelMode === 'WALK',
          // 대중교통은 환승 사이의 도보 구간만 점선으로 그린다
          dashedRanges: res.legs
            .filter((leg) => leg.mode === 'WALK' && leg.pathEnd > leg.pathStart)
            .map((leg): [number, number] => [leg.pathStart, leg.pathEnd]),
          route: res,
        }))
      }),
    )
      .then((results) => {
        if (cancelled) return
        setRouteSegments(results.map(({ path, color, dashed, dashedRanges }) => ({ path, color, dashed, dashedRanges })))
        setSegmentInfo(
          Object.fromEntries(
            results.map(({ route }, i) => [i + 1, route]),
          ),
        )
      })
      .catch(() => {
        if (!cancelled) {
          setRouteSegments([])
          setSegmentInfo({})
        }
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

  /** 같은 장소가 여러 번 나올 때 li key가 겹치지 않도록, 그 장소의 몇 번째 방문인지 센다. */
  function visitIndex(i: number) {
    const { provider, providerPlaceId } = dayStops[i]
    return dayStops.slice(0, i).filter((s) => s.provider === provider && s.providerPlaceId === providerPlaceId).length
  }

  function handleAdd(place: PlaceSearchResult) {
    if (!trip) return
    // A→B→A처럼 나중에 같은 장소로 돌아오는 건 허용하되, 바로 직전 정류지와 같은 장소를
    // 또 추가하는 건(더블클릭 등 실수) 막는다.
    const last = dayStops[dayStops.length - 1]
    if (last && last.provider === place.provider && last.providerPlaceId === place.providerPlaceId) return

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
      </aside>
      <main className="trip-map">
        <MapView
          markers={markers}
          routeSegments={routeSegments}
          highlightedSegment={hoveredSegment}
          onSegmentHover={setHoveredSegment}
          center={mapCenter}
          onCenterChanged={setMapCenter}
          className="map-view"
        />

        {dayStops.length > 0 && (
          <div className="map-overlay-panel">
            <h2 className="trip-panel-title">이번 일정 ({dayStops.length})</h2>
            <ul className="trip-stop-list">
              {dayStops.map((stop, i) => (
                <li key={`${stop.provider}:${stop.providerPlaceId}:${stop.dayNo}:${visitIndex(i)}`}>
                  {i > 0 && (
                    <div
                      className={hoveredSegment === i - 1 ? 'travel-mode-row hovered' : 'travel-mode-row'}
                      onMouseEnter={() => setHoveredSegment(i - 1)}
                      onMouseLeave={() => setHoveredSegment(null)}
                    >
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
                      <span className="travel-mode-info">
                        {segmentInfo[i]
                          ? `${formatDuration(segmentInfo[i].durationSeconds)} · ${formatDistance(segmentInfo[i].distanceMeters)}`
                          : '계산 중...'}
                      </span>
                      {segmentInfo[i] && <RouteDetail route={segmentInfo[i]} mode={stop.travelMode} />}
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
          </div>
        )}
      </main>
    </div>
  )
}
