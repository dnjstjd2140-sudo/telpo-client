import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'

import { getTripByShareToken } from '@/api/trips'
import { MapView } from '@/components/map/MapView'
import { RouteDetail } from '@/components/RouteDetail'
import { useDayRoutes } from '@/hooks/useDayRoutes'
import { DEFAULT_MAP_CENTER, TRAVEL_MODE_COLOR, TRAVEL_MODE_LABEL } from '@/lib/constants'
import { addDays, durationLabel, formatMonthDay, tripDayNumbers } from '@/lib/date'
import { formatDistance, formatDuration } from '@/lib/format'
import { useTripStore } from '@/store/tripStore'
import type { LatLng } from '@/types/route'
import type { TripStop } from '@/types/trip'

/** 공유 링크로 열리는 읽기 전용 화면. 편집 화면과 같은 지도/경로/이동 상세를 보여주되 수정은 못 한다. */
export function TripSharePage() {
  const { shareToken } = useParams<{ shareToken: string }>()
  const trip = useTripStore((s) => s.trip)
  const setTrip = useTripStore((s) => s.setTrip)

  const [error, setError] = useState(false)
  const [selectedDay, setSelectedDay] = useState(1)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [panelOpen, setPanelOpen] = useState(true)
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [hoveredSegment, setHoveredSegment] = useState<number | null>(null)
  const [mapCenter, setMapCenter] = useState<LatLng>(DEFAULT_MAP_CENTER)
  const [panTarget, setPanTarget] = useState<LatLng | null>(null)
  const stopItemRefs = useRef<(HTMLLIElement | null)[]>([])

  useEffect(() => {
    if (!shareToken) return
    getTripByShareToken(shareToken)
      .then((t) => {
        setTrip(t)
        if (t.stops.length > 0) setMapCenter({ lat: t.stops[0].lat, lng: t.stops[0].lng })
      })
      .catch(() => setError(true))
  }, [shareToken, setTrip])

  const dayStops: TripStop[] =
    trip?.stops.filter((s) => s.dayNo === selectedDay).sort((a, b) => a.orderNo - b.orderNo) ?? []
  const { routeSegments, segmentInfo } = useDayRoutes(dayStops)

  useEffect(() => {
    if (selectedIndex == null) return
    stopItemRefs.current[selectedIndex]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [selectedIndex])

  if (error) return <div>여행을 찾을 수 없습니다. 링크를 다시 확인해 주세요.</div>
  if (!trip) return <div>불러오는 중...</div>

  const dayNumbers = trip.startDate && trip.endDate ? tripDayNumbers(trip.startDate, trip.endDate) : [1]
  const markers = dayStops.map((stop, i) => ({
    id: `${stop.provider}:${stop.providerPlaceId}:${stop.dayNo}:${stop.orderNo}`,
    position: { lat: stop.lat, lng: stop.lng },
    label: stop.name,
    order: i + 1,
  }))

  return (
    <div className="trip-layout">
      <div className={sidebarOpen ? 'trip-sidebar-wrap' : 'trip-sidebar-wrap collapsed'}>
        <aside className="trip-sidebar">
          <h1>{trip.title}</h1>
          <p className="subtitle">
            {trip.startDate && trip.endDate ? `${durationLabel(trip.startDate, trip.endDate)} · ` : ''}읽기 전용 보기
          </p>

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
        </aside>
        <button
          type="button"
          className="sidebar-toggle"
          aria-expanded={sidebarOpen}
          aria-label={sidebarOpen ? '패널 접기' : '패널 펼치기'}
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

          {panelOpen &&
            (dayStops.length === 0 ? (
              <p className="share-empty">이 날은 등록된 일정이 없어요.</p>
            ) : (
              <ul className="trip-stop-list">
                {dayStops.map((stop, i) => (
                  <li
                    key={`${stop.provider}:${stop.providerPlaceId}:${stop.dayNo}:${stop.orderNo}`}
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
                        <span className="mode-label" style={{ color: TRAVEL_MODE_COLOR[stop.travelMode] }}>
                          {TRAVEL_MODE_LABEL[stop.travelMode]}
                        </span>
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
                      onClick={() => {
                        setSelectedIndex(i)
                        setPanTarget({ lat: stop.lat, lng: stop.lng })
                      }}
                    >
                      <div className="order-controls">
                        <span className="order-badge">{i + 1}</span>
                      </div>
                      <div className="place-info">
                        <strong>{stop.name}</strong>
                        {stop.address && <span>{stop.address}</span>}
                      </div>
                    </div>
                    {stop.memo && <p className="stop-memo-readonly">{stop.memo}</p>}
                  </li>
                ))}
              </ul>
            ))}
        </div>
      </main>
    </div>
  )
}
