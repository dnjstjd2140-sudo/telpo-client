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

export interface RouteResponse {
  path: LatLng[]
  distanceMeters: number
  durationSeconds: number
}

export interface OptimizeRequest {
  points: LatLng[]
}

/** order[i] = points 배열에서의 인덱스. 방문 순서대로 나열됨 */
export interface OptimizeResponse {
  order: number[]
  totalDurationSeconds: number
}
