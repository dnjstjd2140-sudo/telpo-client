import { create } from 'zustand'

import type { Trip, TripStop } from '@/types/trip'

interface TripState {
  trip: Trip | null
  editToken: string | null
  isDirty: boolean
  setTrip: (trip: Trip, opts?: { editToken?: string }) => void
  addStop: (stop: TripStop) => void
  removeStop: (stop: TripStop) => void
  markSaved: (trip: Trip) => void
}

export const useTripStore = create<TripState>((set) => ({
  trip: null,
  editToken: null,
  isDirty: false,
  setTrip: (trip, opts) => set({ trip, editToken: opts?.editToken ?? null, isDirty: false }),
  addStop: (stop) =>
    set((state) => (state.trip ? { trip: { ...state.trip, stops: [...state.trip.stops, stop] }, isDirty: true } : state)),
  removeStop: (stop) =>
    set((state) =>
      state.trip
        ? { trip: { ...state.trip, stops: state.trip.stops.filter((s) => s !== stop) }, isDirty: true }
        : state,
    ),
  markSaved: (trip) => set({ trip, isDirty: false }),
}))
