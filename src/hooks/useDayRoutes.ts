import { useEffect, useRef, useState } from 'react'

import { getRoute } from '@/api/routes'
import type { RouteSegment } from '@/components/map/MapView'
import { TRAVEL_MODE_COLOR } from '@/lib/constants'
import type { RouteResponse } from '@/types/route'
import type { TripStop } from '@/types/trip'

/**
 * 그날 정류지 목록(순서대로)에서 구간(이전 정류지 -> 이 정류지)별로 선택된 이동수단에 맞춰 경로를 따로 불러온다.
 * 수단마다 다른 색/선 모양의 경로선(routeSegments)과, dayStops[i]로 오는 구간의 경로 정보(segmentInfo[i])를 돌려준다.
 * 첫 정류지(index 0)는 이전 구간이 없어 segmentInfo에 없다.
 *
 * (출발좌표->도착좌표:수단) 단위 클라이언트 캐시를 둬서, 같은 두 지점 사이를 같은 수단으로 다시 볼 때는
 * 서버에 또 요청하지 않고 바로 재사용한다.
 */
export function useDayRoutes(dayStops: TripStop[]) {
  const [routeSegments, setRouteSegments] = useState<RouteSegment[]>([])
  const [segmentInfo, setSegmentInfo] = useState<Record<number, RouteResponse>>({})
  const routeCacheRef = useRef(new Map<string, RouteResponse>())
  const routeKey = dayStops.map((s) => `${s.lat},${s.lng},${s.travelMode}`).join('|')

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
        setSegmentInfo(Object.fromEntries(results.map(({ route }, i) => [i + 1, route])))
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

  return { routeSegments, segmentInfo }
}
