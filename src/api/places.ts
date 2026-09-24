import { apiClient } from '@/api/client'
import type { Place } from '@/types/trip'

export interface PlaceSearchParams {
  q: string
  lat?: number
  lng?: number
}

export function searchPlaces(params: PlaceSearchParams) {
  return apiClient.get<Place[]>('/places/search', { params }).then((res) => res.data)
}
