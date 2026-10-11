import { useEffect, useRef, useState } from 'react'

import { DEFAULT_MAP_CENTER } from '@/lib/constants'
import { loadKakaoMapSdk } from '@/lib/kakaoMapLoader'
import { assignLanes, laneToSide, offsetPath, type Pixel } from '@/lib/offsetPaths'
import type { LatLng } from '@/types/route'

/** 평소엔 전부 연하게, 하나가 강조되면 그 구간만 진하게. 겹치는 곳은 앞 순서 구간이 위에 온다. */
function lineStyle(index: number, total: number, highlighted: number | null, weight: number) {
  const isHighlighted = index === highlighted
  return {
    strokeWeight: isHighlighted ? weight + 2 : weight,
    strokeOpacity: highlighted == null ? 0.75 : isHighlighted ? 0.95 : 0.3,
    zIndex: isHighlighted ? 500 : total - index,
  }
}

/** 경로를 실선/점선 조각으로 나눈다. 조각 사이가 끊겨 보이지 않도록 경계 좌표는 양쪽에 포함한다. */
function splitByDash<T>(
  path: T[],
  allDashed: boolean,
  ranges?: Array<[number, number]>,
): Array<{ path: T[]; dashed: boolean }> {
  if (allDashed || !ranges || ranges.length === 0) return [{ path, dashed: allDashed }]

  const isDashed = (i: number) => ranges.some(([start, end]) => i >= start && i <= end)
  const pieces: Array<{ path: T[]; dashed: boolean }> = []
  let from = 0
  for (let i = 1; i <= path.length; i++) {
    if (i === path.length || isDashed(i) !== isDashed(from)) {
      const end = Math.min(i, path.length - 1)
      if (end > from) pieces.push({ path: path.slice(from, end + 1), dashed: isDashed(from) })
      from = i
    }
  }
  return pieces.length > 0 ? pieces : [{ path, dashed: false }]
}

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
  /** 도보처럼 점선으로 그릴 구간 */
  dashed?: boolean
  /** path 안에서 점선으로 그릴 좌표 index 범위들 [시작, 끝] (포함). 대중교통의 도보 구간 등. */
  dashedRanges?: Array<[number, number]>
}

export interface MapViewProps {
  markers: MapMarker[]
  /** 구간별로 다른 색으로 그릴 경로선들 (이동수단에 따라 색이 달라짐) */
  routeSegments?: RouteSegment[]
  /** 강조할 구간의 index. 지정하면 그 구간만 굵고 진하게, 나머지는 더 흐리게 그린다. */
  highlightedSegment?: number | null
  /** 지도 위 경로선에 마우스를 올리거나 뗄 때 해당 구간 index(없으면 null)를 알려준다. */
  onSegmentHover?: (index: number | null) => void
  center?: LatLng
  className?: string
  /** 지도 이동/줌이 끝날 때마다 중심 좌표를 알려준다 (장소 검색 기준점 등에 사용) */
  onCenterChanged?: (center: LatLng) => void
}

/**
 * 카카오맵 SDK 호출은 이 컴포넌트 내부로 한정한다.
 * country_code에 따라 provider를 바꾸게 되면(3단계) 이 컴포넌트만 교체/분기한다.
 */
export function MapView({ markers, routeSegments, highlightedSegment, onSegmentHover, center, className, onCenterChanged }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<kakao.maps.Map | null>(null)
  const markerObjsRef = useRef<kakao.maps.Marker[]>([])
  const overlaysRef = useRef<kakao.maps.CustomOverlay[]>([])
  const polylinesRef = useRef<kakao.maps.Polyline[]>([])
  const visibleLinesRef = useRef<kakao.maps.Polyline[][]>([])
  const weightRef = useRef(3)
  const highlightRef = useRef<number | null>(null)
  const onSegmentHoverRef = useRef(onSegmentHover)
  onSegmentHoverRef.current = onSegmentHover
  const [error, setError] = useState<string | null>(null)
  const [zoomLevel, setZoomLevel] = useState(7)

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
        window.kakao.maps.event.addListener(map, 'zoom_changed', () => setZoomLevel(map.getLevel()))

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
    // 축소할수록 선을 얇게 그려 전체 일정을 볼 때 선끼리 뭉치지 않게 한다 (확대 시에는 굵게 + 방향 화살표)
    const weight = Math.max(1, Math.round(10 / 1.5 ** Math.max(0, zoomLevel - 2)))
    const segments = (routeSegments ?? []).filter((segment) => segment.path.length >= 2)
    // 같은 도로를 지나는 구간끼리 겹치면 화면상 평행하게 벌려서 그린다 (픽셀 단위라 줌과 상관없이 일정 간격)
    const projection = map.getProjection()
    const pixelPaths: Pixel[][] = segments.map((segment) =>
      segment.path.map((p) => {
        const pt = projection.containerPointFromCoords(new window.kakao.maps.LatLng(p.lat, p.lng))
        return { x: pt.x, y: pt.y }
      }),
    )
    const gap = Math.max(4, weight + 3)
    const lanes = assignLanes(pixelPaths, Math.max(gap, 8))
    weightRef.current = weight
    const total = segments.length
    const created: kakao.maps.Polyline[] = []
    visibleLinesRef.current = segments.map((segment, index) => {
      const path = offsetPath(pixelPaths[index], laneToSide(lanes[index]) * gap).map((pt) =>
        projection.coordsFromContainerPoint(new window.kakao.maps.Point(pt.x, pt.y)),
      )
      const lines = splitByDash(path, segment.dashed ?? false, segment.dashedRanges).map((piece) => {
        const line = new window.kakao.maps.Polyline({
          path: piece.path,
          strokeColor: segment.color,
          strokeStyle: piece.dashed ? 'shortdash' : 'solid',
          ...lineStyle(index, total, highlightRef.current, weight),
        })
        line.setMap(map)
        return line
      })

      // 가는 선은 마우스를 올리기 어려워서, 투명하고 굵은 선을 위에 덮어 hover를 받는다.
      // 겹치는 곳에서는 앞 순서 구간이 위에 오도록 zIndex를 준다.
      const hit = new window.kakao.maps.Polyline({
        path,
        strokeWeight: Math.max(10, weight),
        strokeColor: '#000000',
        strokeOpacity: 0.01,
        zIndex: 1000 + (total - index),
      })
      window.kakao.maps.event.addListener(hit, 'mouseover', () => onSegmentHoverRef.current?.(index))
      window.kakao.maps.event.addListener(hit, 'mouseout', () => onSegmentHoverRef.current?.(null))
      hit.setMap(map)
      created.push(...lines, hit)
      return lines
    })
    polylinesRef.current = created
  }, [routeSegments, zoomLevel])

  // 강조 구간이 바뀌면 선을 다시 만들지 않고 스타일만 바꾼다 (다시 만들면 hover가 깜빡인다)
  useEffect(() => {
    highlightRef.current = highlightedSegment ?? null
    const total = visibleLinesRef.current.length
    visibleLinesRef.current.forEach((lines, index) =>
      lines.forEach((line) => line.setOptions(lineStyle(index, total, highlightRef.current, weightRef.current))),
    )
  }, [highlightedSegment])

  if (error) {
    return <div className={className}>지도를 불러오지 못했습니다: {error}</div>
  }

  return <div ref={containerRef} className={className} style={{ width: '100%', height: '100%' }} />
}
