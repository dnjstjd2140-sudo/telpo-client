export interface Place {
  id: number
  name: string
  address: string
  lat: number
  lng: number
  countryCode: string
  provider: 'KAKAO'
  providerPlaceId: string
}

export interface TripStop {
  id: number
  tripId: number
  place: Place
  dayNo: number
  orderNo: number
  memo: string | null
  stayMinutes: number | null
}

export interface Trip {
  id: number
  title: string
  countryCode: string
  startDate: string
  endDate: string
  stops: TripStop[]
  createdAt: string
  updatedAt: string
}

export interface TripCreateRequest {
  title: string
  countryCode: string
  startDate: string
  endDate: string
}

export interface TripCreateResponse {
  tripId: number
  editToken: string
  shareToken: string
}

/** localStorage에 캐시하는 "내가 만든 여행" 목록 항목 */
export interface LocalTripRef {
  tripId: number
  editToken: string
  title: string
}
