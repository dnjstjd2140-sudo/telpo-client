import { apiClient } from '@/api/client'
import type { RouteOptimizeRequest, RouteOptimizeResponse, RouteRequest, RouteResult } from '@/types/route'

export function getRoute(payload: RouteRequest) {
  return apiClient.post<RouteResult>('/routes', payload).then((res) => res.data)
}

export function optimizeRoute(payload: RouteOptimizeRequest) {
  return apiClient.post<RouteOptimizeResponse>('/routes/optimize', payload).then((res) => res.data)
}
