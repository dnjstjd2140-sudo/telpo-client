import { useEffect } from 'react'
import { useParams } from 'react-router-dom'

import { getTripByShareToken } from '@/api/trips'
import { MapView } from '@/components/map/MapView'
import { useTripStore } from '@/store/tripStore'

export function TripSharePage() {
  const { shareToken } = useParams<{ shareToken: string }>()
  const trip = useTripStore((s) => s.trip)
  const setTrip = useTripStore((s) => s.setTrip)

  useEffect(() => {
    if (!shareToken) return
    getTripByShareToken(shareToken).then((t) => setTrip(t, { isReadOnly: true }))
  }, [shareToken, setTrip])

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
        <p>읽기 전용 보기</p>
      </aside>
      <main style={{ flex: 1 }}>
        <MapView markers={markers} className="map-view" />
      </main>
    </div>
  )
}
