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
    getTripByShareToken(shareToken).then((t) => setTrip(t))
  }, [shareToken, setTrip])

  if (!trip) return <div>불러오는 중...</div>

  const markers = trip.stops.map((stop, i) => ({
    id: i,
    position: { lat: stop.lat, lng: stop.lng },
    label: stop.name,
  }))

  return (
    <div className="trip-layout">
      <aside className="trip-sidebar">
        <h1>{trip.title}</h1>
        <p className="subtitle">읽기 전용 보기</p>
        <ul className="trip-stop-list">
          {trip.stops.map((stop, i) => (
            <li key={`${stop.provider}:${stop.providerPlaceId}:${i}`}>
              <div className="place-info">
                <strong>{stop.name}</strong>
                {stop.address && <span>{stop.address}</span>}
              </div>
            </li>
          ))}
        </ul>
      </aside>
      <main className="trip-map">
        <MapView markers={markers} className="map-view" />
      </main>
    </div>
  )
}
