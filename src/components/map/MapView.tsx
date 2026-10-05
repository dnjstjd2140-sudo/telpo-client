import { useEffect, useRef, useState } from 'react'

import { DEFAULT_MAP_CENTER } from '@/lib/constants'
import { loadKakaoMapSdk } from '@/lib/kakaoMapLoader'
import type { LatLng } from '@/types/route'

export interface MapMarker {
  id: number | string
  position: LatLng
  label?: string
  /** 지도 위에 순번 뱃지로 표시할 방문 순서 (1부터) */
  order?: number
}

export interface RouteSegment {
  path: LatLng[]
  color: string
}

export interface MapViewProps {
  markers: MapMarker[]
  /** 구간별로 다른 색으로 그릴 경로선들 (이동수단에 따라 색이 달라짐) */
  routeSegments?: RouteSegment[]
  center?: LatLng
  className?: string
  /** 지도 이동/줌이 끝날 때마다 중심 좌표를 알려준다 (장소 검색 기준점 등에 사용) */
  onCenterChanged?: (center: LatLng) => void
}

/**
 * 카카오맵 SDK 호출은 이 컴포넌트 내부로 한정한다.
 * country_code에 따라 provider를 바꾸게 되면(3단계) 이 컴포넌트만 교체/분기한다.
 */
export function MapView({ markers, routeSegments, center, className, onCenterChanged }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<kakao.maps.Map | null>(null)
  const markerObjsRef = useRef<kakao.maps.Marker[]>([])
  const overlaysRef = useRef<kakao.maps.CustomOverlay[]>([])
  const polylinesRef = useRef<kakao.maps.Polyline[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    loadKakaoMapSdk()
      .then(() => {
        if (cancelled || !containerRef.current) return
        const { lat, lng } = center ?? DEFAULT_MAP_CENTER
        const map = new window.kakao.maps.Map(containerRef.current, {
          center: new window.kakao.maps.LatLng(lat, lng),
          level: 7,
        })
        mapRef.current = map

        if (onCenterChanged) {
          window.kakao.maps.event.addListener(map, 'idle', () => {
            const c = map.getCenter()
            onCenterChanged({ lat: c.getLat(), lng: c.getLng() })
          })
        }
      })
      .catch((err: Error) => setError(err.message))

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 마커 갱신 (마커가 늘어나면 새로 추가된 위치로 이동)
  const prevMarkerCountRef = useRef(0)
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    markerObjsRef.current.forEach((marker) => marker.setMap(null))
    overlaysRef.current.forEach((overlay) => overlay.setMap(null))

    markerObjsRef.current = markers.map(({ position, label }) => {
      const marker = new window.kakao.maps.Marker({
        position: new window.kakao.maps.LatLng(position.lat, position.lng),
        title: label,
      })
      marker.setMap(map)
      return marker
    })

    overlaysRef.current = markers
      .filter((m) => m.order != null)
      .map(({ position, order }) => {
        const overlay = new window.kakao.maps.CustomOverlay({
          position: new window.kakao.maps.LatLng(position.lat, position.lng),
          content: `<div class="map-marker-badge">${order}</div>`,
          yAnchor: 2.4,
        })
        overlay.setMap(map)
        return overlay
      })

    if (markers.length > prevMarkerCountRef.current) {
      const last = markers[markers.length - 1].position
      map.panTo(new window.kakao.maps.LatLng(last.lat, last.lng))
    }
    prevMarkerCountRef.current = markers.length
  }, [markers])

  // 경로선 갱신 (구간마다 다른 색)
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    polylinesRef.current.forEach((line) => line.setMap(null))
    polylinesRef.current = (routeSegments ?? [])
      .filter((segment) => segment.path.length >= 2)
      .map((segment) => {
        const line = new window.kakao.maps.Polyline({
          path: segment.path.map((p) => new window.kakao.maps.LatLng(p.lat, p.lng)),
          strokeWeight: 4,
          strokeColor: segment.color,
          strokeOpacity: 0.9,
        })
        line.setMap(map)
        return line
      })
  }, [routeSegments])

  if (error) {
    return <div className={className}>지도를 불러오지 못했습니다: {error}</div>
  }

  return <div ref={containerRef} className={className} style={{ width: '100%', height: '100%' }} />
}
