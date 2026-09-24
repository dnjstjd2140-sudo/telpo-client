import { create } from 'zustand'

import type { Trip } from '@/types/trip'

interface TripState {
  trip: Trip | null
  editToken: string | null
  isReadOnly: boolean
  isDirty: boolean
  setTrip: (trip: Trip, opts: { editToken?: string; isReadOnly: boolean }) => void
  updateTrip: (updater: (trip: Trip) => Trip) => void
  markSaved: () => void
}

export const useTripStore = create<TripState>((set) => ({
  trip: null,
  editToken: null,
  isReadOnly: true,
  isDirty: false,
  setTrip: (trip, { editToken, isReadOnly }) =>
    set({ trip, editToken: editToken ?? null, isReadOnly, isDirty: false }),
  updateTrip: (updater) =>
    set((state) => (state.trip ? { trip: updater(state.trip), isDirty: true } : state)),
  markSaved: () => set({ isDirty: false }),
}))
