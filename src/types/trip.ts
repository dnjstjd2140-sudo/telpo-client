export interface TripStop {
  placeId: number
  name: string
  address: string | null
  lat: number
  lng: number
  provider: string
  providerPlaceId: string
  dayNo: number
  orderNo: number
  memo: string | null
  stayMinutes: number | null
}

export interface Trip {
  tripId: number
  title: string
  countryCode: string
  startDate: string | null
  endDate: string | null
  readOnly: boolean
  stops: TripStop[]
}

export interface TripCreateRequest {
  title: string
  countryCode: string
  startDate?: string | null
  endDate?: string | null
}

export interface TripCreateResponse {
  tripId: number
  editToken: string
  shareToken: string
}

export interface UpdateTripStopRequest {
  placeName: string
  placeAddress: string | null
  lat: number
  lng: number
  provider: string
  providerPlaceId: string
  dayNo: number
  orderNo: number
  memo: string | null
  stayMinutes: number | null
}

export interface UpdateTripRequest {
  title: string
  startDate: string | null
  endDate: string | null
  stops: UpdateTripStopRequest[]
}

/** localStorage에 캐시하는 "내가 만든 여행" 목록 항목 */
export interface LocalTripRef {
  tripId: number
  editToken: string
  title: string
}

export function stopToUpdateRequest(stop: TripStop): UpdateTripStopRequest {
  return {
    placeName: stop.name,
    placeAddress: stop.address,
    lat: stop.lat,
    lng: stop.lng,
    provider: stop.provider,
    providerPlaceId: stop.providerPlaceId,
    dayNo: stop.dayNo,
    orderNo: stop.orderNo,
    memo: stop.memo,
    stayMinutes: stop.stayMinutes,
  }
}
