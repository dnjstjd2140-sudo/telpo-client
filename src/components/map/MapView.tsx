import { useEffect, useRef, useState } from 'react'

import { loadKakaoMapSdk } from '@/lib/kakaoMapLoader'
import type { LatLng } from '@/types/route'

export interface MapMarker {
  id: number | string
  position: LatLng
  label?: string
}

export interface MapViewProps {
  markers: MapMarker[]
  route?: LatLng[]
  center?: LatLng
  className?: string
}

const DEFAULT_CENTER: LatLng = { lat: 37.5665, lng: 126.978 } // 서울 시청

/**
 * 카카오맵 SDK 호출은 이 컴포넌트 내부로 한정한다.
 * country_code에 따라 provider를 바꾸게 되면(3단계) 이 컴포넌트만 교체/분기한다.
 */
export function MapView({ markers, route, center, className }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<kakao.maps.Map | null>(null)
  const markerObjsRef = useRef<kakao.maps.Marker[]>([])
  const polylineRef = useRef<kakao.maps.Polyline | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    loadKakaoMapSdk()
      .then(() => {
        if (cancelled || !containerRef.current) return
        const { lat, lng } = center ?? DEFAULT_CENTER
        mapRef.current = new window.kakao.maps.Map(containerRef.current, {
          center: new window.kakao.maps.LatLng(lat, lng),
          level: 7,
        })
      })
      .catch((err: Error) => setError(err.message))

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 마커 갱신
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    markerObjsRef.current.forEach((marker) => marker.setMap(null))
    markerObjsRef.current = markers.map(({ position }) => {
      const marker = new window.kakao.maps.Marker({
        position: new window.kakao.maps.LatLng(position.lat, position.lng),
      })
      marker.setMap(map)
      return marker
    })
  }, [markers])

  // 경로선 갱신
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    polylineRef.current?.setMap(null)
    if (!route || route.length < 2) return

    polylineRef.current = new window.kakao.maps.Polyline({
      path: route.map((p) => new window.kakao.maps.LatLng(p.lat, p.lng)),
      strokeWeight: 4,
      strokeColor: '#3B82F6',
      strokeOpacity: 0.9,
    })
    polylineRef.current.setMap(map)
  }, [route])

  if (error) {
    return <div className={className}>지도를 불러오지 못했습니다: {error}</div>
  }

  return <div ref={containerRef} className={className} style={{ width: '100%', height: '100%' }} />
}
