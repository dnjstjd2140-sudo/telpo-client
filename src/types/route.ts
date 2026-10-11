export interface LatLng {
  lat: number
  lng: number
}

/** 서버는 WALK/TRANSIT도 정의는 해뒀지만 KakaoMapProvider는 현재 CAR만 지원한다. */
export type TravelMode = 'CAR' | 'WALK' | 'TRANSIT'

export interface RouteRequest {
  waypoints: LatLng[]
  mode: TravelMode
}

/** 대중교통 경로의 한 구간. mode는 Tmap 값 그대로 (WALK, BUS, SUBWAY, EXPRESSBUS, TRAIN ...). */
export interface TransitLeg {
  mode: string
  /** 노선명 (예: "수도권2호선", "간선:146"). 도보 구간은 빈 문자열 */
  name: string
  /** 노선 색 (예: "33A5FF", '#' 없음). 없으면 빈 문자열 */
  color: string
  startName: string
  endName: string
  durationSeconds: number
  /** RouteResponse.path 안에서 이 구간이 차지하는 좌표 index 범위 (시작·끝 포함) */
  pathStart: number
  pathEnd: number
}

export interface RouteResponse {
  path: LatLng[]
  distanceMeters: number
  durationSeconds: number
  /** 자차: 택시 예상 요금(원) */
  taxiFare: number | null
  /** 자차: 통행료(원) */
  tollFare: number | null
  /** 대중교통: 총 요금(원) */
  transitFare: number | null
  /** 대중교통: 도보/버스/지하철 구간 */
  legs: TransitLeg[]
}

export interface OptimizeRequest {
  points: LatLng[]
}

/** order[i] = points 배열에서의 인덱스. 방문 순서대로 나열됨 */
export interface OptimizeResponse {
  order: number[]
  totalDurationSeconds: number
}
