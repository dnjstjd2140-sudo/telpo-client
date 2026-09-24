import { apiClient } from '@/api/client'
import type { Trip, TripCreateRequest, TripCreateResponse } from '@/types/trip'

export function createTrip(payload: TripCreateRequest) {
  return apiClient.post<TripCreateResponse>('/trips', payload).then((res) => res.data)
}

export function getTripByEditToken(editToken: string) {
  return apiClient.get<Trip>(`/trips/edit/${editToken}`).then((res) => res.data)
}

export function getTripByShareToken(shareToken: string) {
  return apiClient.get<Trip>(`/trips/share/${shareToken}`).then((res) => res.data)
}

export function saveTrip(editToken: string, payload: Trip) {
  return apiClient.put<Trip>(`/trips/edit/${editToken}`, payload).then((res) => res.data)
}
