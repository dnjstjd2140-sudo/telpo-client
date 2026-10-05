import { apiClient } from '@/api/client'
import type { OptimizeRequest, OptimizeResponse, RouteRequest, RouteResponse } from '@/types/route'

export function getRoute(payload: RouteRequest) {
  return apiClient.post<RouteResponse>('/routes', payload).then((res) => res.data)
}

export function optimizeRoute(payload: OptimizeRequest) {
  return apiClient.post<OptimizeResponse>('/routes/optimize', payload).then((res) => res.data)
}
