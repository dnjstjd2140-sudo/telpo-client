import type { LatLng, TravelMode } from '@/types/route'

export const DEFAULT_MAP_CENTER: LatLng = { lat: 37.5665, lng: 126.978 } // 서울 시청

export const TRAVEL_MODE_LABEL: Record<TravelMode, string> = {
  CAR: '자차',
  WALK: '도보',
  TRANSIT: '대중교통',
}

export const TRAVEL_MODE_COLOR: Record<TravelMode, string> = {
  CAR: '#7c3aed',
  WALK: '#16a34a',
  TRANSIT: '#2563eb',
}

export const TRAVEL_MODES: TravelMode[] = ['CAR', 'WALK', 'TRANSIT']
