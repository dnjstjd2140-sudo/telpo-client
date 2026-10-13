import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'

import { getTripByEditToken, saveTrip } from '@/api/trips'
import { MapView } from '@/components/map/MapView'
import { OrderInput } from '@/components/OrderInput'
import { PlaceSearch } from '@/components/PlaceSearch'
import { ShareLinkButton } from '@/components/ShareLinkButton'
import { RouteDetail } from '@/components/RouteDetail'
import { StopMemo } from '@/components/StopMemo'
import { useDayRoutes } from '@/hooks/useDayRoutes'
import { DEFAULT_MAP_CENTER, TRAVEL_MODE_COLOR, TRAVEL_MODE_LABEL, TRAVEL_MODES } from '@/lib/constants'
import { durationLabel, formatMonthDay, addDays, tripDayNumbers } from '@/lib/date'
import { formatDuration, formatDistance } from '@/lib/format'
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
  const setMemo = useTripStore((s) => s.setMemo)
  const markSaved = useTripStore((s) => s.markSaved)

  const [mapCenter, setMapCenter] = useState<LatLng>(DEFAULT_MAP_CENTER)
  const [isSaving, setIsSaving] = useState(false)
  const [selectedDay, setSelectedDay] = useState(1)
  // 일정 목록의 이동 구간이나 지도 위 경로선에 마우스를 올리면 양쪽 모두에서 그 구간을 강조한다.
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [panelOpen, setPanelOpen] = useState(true)
  // 선택된 정류지(dayStops 기준 index). 마커를 누르거나 목록 행을 누르면 바뀌고, 둘 다에 강조 표시된다.
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  // 목록 행을 눌렀을 때 지도를 그 마커로 옮기기 위한 요청 (새 객체를 넣을 때마다 이동)
  const [panTarget, setPanTarget] = useState<LatLng | null>(null)
  const stopItemRefs = useRef<(HTMLLIElement | null)[]>([])
  const [hoveredSegment, setHoveredSegment] = useState<number | null>(null)
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
  const { routeSegments, segmentInfo } = useDayRoutes(dayStops)

  // 마커를 눌렀을 때 목록에서 해당 행이 보이도록 스크롤 (훅은 early return보다 위에 있어야 한다)
  useEffect(() => {
    if (selectedIndex == null) return
    stopItemRefs.current[selectedIndex]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [selectedIndex])

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
    setSelectedIndex(currentIndex + direction)
  }

  function handleReorder(stop: TripStop, toIndex: number) {
    moveStop(stop, toIndex)
    setSelectedIndex(toIndex)
  }

  function handleSelectStop(stop: TripStop, index: number, target: EventTarget) {
    // 행 안의 버튼/입력칸을 누른 경우는 선택·이동을 하지 않는다
    if ((target as HTMLElement).closest('button, input, textarea')) return
    setSelectedIndex(index)
    setPanTarget({ lat: stop.lat, lng: stop.lng })
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
      <div className={sidebarOpen ? 'trip-sidebar-wrap' : 'trip-sidebar-wrap collapsed'}>
      <aside className="trip-sidebar">
        <h1>{trip.title}</h1>
        <p className="subtitle">
          {trip.startDate && trip.endDate ? durationLabel(trip.startDate, trip.endDate) : ''}
          {isDirty ? ' · 저장 안 됨' : ''}
        </p>
        <ShareLinkButton shareToken={trip.shareToken} />

        <div className="day-tabs">
          {dayNumbers.map((day) => (
            <button
              key={day}
              type="button"
              className={day === selectedDay ? 'day-tab active' : 'day-tab'}
              onClick={() => {
                setSelectedDay(day)
                setSelectedIndex(null)
              }}
            >
              <span>Day {day}</span>
              {trip.startDate && <span className="day-tab-date">{formatMonthDay(addDays(trip.startDate, day - 1))}</span>}
            </button>
          ))}
        </div>

        <PlaceSearch center={mapCenter} onAdd={handleAdd} />
      </aside>
        <button
          type="button"
          className="sidebar-toggle"
          aria-expanded={sidebarOpen}
          aria-label={sidebarOpen ? '검색 패널 접기' : '검색 패널 펼치기'}
          onClick={() => setSidebarOpen((open) => !open)}
        >
          {sidebarOpen ? '◀' : '▶'}
        </button>
      </div>
      <main className="trip-map">
        <MapView
          markers={markers}
          routeSegments={routeSegments}
          highlightedSegment={hoveredSegment}
          onSegmentHover={setHoveredSegment}
          onMarkerClick={setSelectedIndex}
          selectedMarker={selectedIndex}
          panTo={panTarget}
          center={mapCenter}
          onCenterChanged={setMapCenter}
          className="map-view"
        />

        {dayStops.length > 0 && (
          <div className="map-overlay-panel">
            <div className="trip-panel-header">
              <h2 className="trip-panel-title">이번 일정 ({dayStops.length})</h2>
              <div className="trip-panel-actions">
                <button
                  type="button"
                  className="summary-toggle"
                  aria-expanded={panelOpen}
                  aria-label={panelOpen ? '일정 패널 접기' : '일정 패널 펼치기'}
                  onClick={() => setPanelOpen((open) => !open)}
                >
                  {panelOpen ? '접기 ▴' : '펼치기 ▾'}
                </button>
              </div>
            </div>
            {panelOpen && (
              <>
            <ul className="trip-stop-list">
              {dayStops.map((stop, i) => (
                <li
                  key={`${stop.provider}:${stop.providerPlaceId}:${stop.dayNo}:${visitIndex(i)}`}
                  ref={(el) => {
                    stopItemRefs.current[i] = el
                  }}
                >
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
                  <div
                    className={selectedIndex === i ? 'trip-stop-row selected' : 'trip-stop-row'}
                    onClick={(e) => handleSelectStop(stop, i, e.target)}
                  >
                    <div className="order-controls">
                      <OrderInput value={i + 1} max={dayStops.length} onCommit={(to) => handleReorder(stop, to)} />
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
                    <button
                      type="button"
                      onClick={() => {
                        removeStop(stop)
                        setSelectedIndex(null)
                      }}
                    >
                      삭제
                    </button>
                  </div>
                  <StopMemo memo={stop.memo} onChange={(memo) => setMemo(stop, memo)} />
                </li>
              ))}
            </ul>

            <button type="button" className="save-button" onClick={handleSave} disabled={isSaving || !isDirty}>
              {isSaving ? '저장 중...' : '저장'}
            </button>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
