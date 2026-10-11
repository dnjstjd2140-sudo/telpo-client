import { formatDuration } from '@/lib/format'
import type { RouteResponse, TransitLeg, TravelMode } from '@/types/route'

const LEG_LABEL: Record<string, string> = {
  WALK: '도보',
  BUS: '버스',
  EXPRESSBUS: '고속버스',
  SUBWAY: '지하철',
  TRAIN: '기차',
  AIRPLANE: '항공',
  FERRY: '배',
}

function legColor(leg: TransitLeg): string | undefined {
  return /^[0-9a-fA-F]{6}$/.test(leg.color) ? `#${leg.color}` : undefined
}

function formatWon(amount: number): string {
  return `${amount.toLocaleString('ko-KR')}원`
}

interface RouteDetailProps {
  route: RouteResponse
  mode: TravelMode
}

/** 구간 소요시간 아래에 이동수단별 부가 정보(택시 요금 / 탈 것과 요금)를 보여준다. */
export function RouteDetail({ route, mode }: RouteDetailProps) {
  if (mode === 'CAR') {
    if (route.taxiFare == null && !route.tollFare) return null
    return (
      <div className="route-detail">
        {route.taxiFare != null && <span>택시 약 {formatWon(route.taxiFare)}</span>}
        {route.tollFare ? <span>통행료 {formatWon(route.tollFare)}</span> : null}
      </div>
    )
  }

  if (mode === 'TRANSIT' && route.legs.length > 0) {
    return (
      <div className="route-detail">
        <div className="transit-legs">
          {route.legs.map((leg, i) => (
            <span
              key={i}
              className={leg.mode === 'WALK' ? 'transit-leg walk' : 'transit-leg'}
              style={leg.mode === 'WALK' ? undefined : { background: legColor(leg) }}
              title={leg.startName && leg.endName ? `${leg.startName} → ${leg.endName}` : undefined}
            >
              {leg.mode === 'WALK' ? '도보' : leg.name || LEG_LABEL[leg.mode] || leg.mode}
              <small>{formatDuration(leg.durationSeconds)}</small>
            </span>
          ))}
        </div>
        {route.transitFare ? <span>요금 {formatWon(route.transitFare)}</span> : null}
      </div>
    )
  }

  return null
}
