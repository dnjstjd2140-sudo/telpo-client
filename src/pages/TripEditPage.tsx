import { useEffect } from 'react'
import { useParams } from 'react-router-dom'

import { getTripByEditToken } from '@/api/trips'
import { MapView } from '@/components/map/MapView'
import { useTripStore } from '@/store/tripStore'

export function TripEditPage() {
  const { editToken } = useParams<{ editToken: string }>()
  const trip = useTripStore((s) => s.trip)
  const setTrip = useTripStore((s) => s.setTrip)

  useEffect(() => {
    if (!editToken) return
    getTripByEditToken(editToken).then((t) => setTrip(t, { editToken, isReadOnly: false }))
  }, [editToken, setTrip])

  if (!trip) return <div>불러오는 중...</div>

  const markers = trip.stops.map((stop) => ({
    id: stop.id,
    position: { lat: stop.place.lat, lng: stop.place.lng },
    label: stop.place.name,
  }))

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <aside style={{ width: 360, overflowY: 'auto' }}>
        <h1>{trip.title}</h1>
        {/* TODO: 일자별 장소 목록, 드래그 순서 변경, 장소 검색 */}
      </aside>
      <main style={{ flex: 1 }}>
        <MapView markers={markers} className="map-view" />
      </main>
    </div>
  )
}
