import type { LocalTripRef } from '@/types/trip'

const STORAGE_KEY = 'telpo:trips'

export function getLocalTrips(): LocalTripRef[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as LocalTripRef[]) : []
  } catch {
    return []
  }
}

export function addLocalTrip(trip: LocalTripRef): void {
  const trips = getLocalTrips().filter((t) => t.tripId !== trip.tripId)
  trips.unshift(trip)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trips))
}

export function removeLocalTrip(tripId: number): void {
  const trips = getLocalTrips().filter((t) => t.tripId !== tripId)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trips))
}
