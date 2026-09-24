export interface LatLng {
  lat: number
  lng: number
}

export type TravelMode = 'CAR'

export interface RouteRequest {
  waypoints: LatLng[]
  mode: TravelMode
}

export interface RouteResult {
  path: LatLng[]
  distanceMeters: number
  durationSeconds: number
}

export interface RouteOptimizeRequest {
  placeIds: number[]
  mode: TravelMode
}

export interface RouteOptimizeResponse {
  orderedPlaceIds: number[]
}
