import { apiClient } from '@/api/client'
import type { PlaceSearchResult } from '@/types/place'

export interface PlaceSearchParams {
  q: string
  lat: number
  lng: number
}

export function searchPlaces(params: PlaceSearchParams) {
  return apiClient.get<PlaceSearchResult[]>('/places/search', { params }).then((res) => res.data)
}
