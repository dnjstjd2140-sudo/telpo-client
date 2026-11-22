import { create } from 'zustand'

import type { Trip, TripStop } from '@/types/trip'
import type { TravelMode } from '@/types/route'

/** dayNo가 같은 stop들의 orderNo를 배열 위치(0부터)로 다시 채운다. */
function renumber(stops: TripStop[], dayNo: number): TripStop[] {
  let i = 0
  return stops.map((s) => (s.dayNo === dayNo ? { ...s, orderNo: i++ } : s))
}

interface TripState {
  trip: Trip | null
  editToken: string | null
  isDirty: boolean
  setTrip: (trip: Trip, opts?: { editToken?: string }) => void
  addStop: (stop: TripStop) => void
  removeStop: (stop: TripStop) => void
  /** 같은 날짜 안에서 stop을 toIndex(0부터) 위치로 옮기고 orderNo를 다시 매긴다. */
  moveStop: (stop: TripStop, toIndex: number) => void
  /** stop을 다른 날짜(toDayNo)의 맨 끝으로 옮긴다. 메모 등 나머지 값은 그대로 두고, 두 날짜의 orderNo를 다시 매긴다. */
  moveStopToDay: (stop: TripStop, toDayNo: number) => void
  setTravelMode: (stop: TripStop, mode: TravelMode) => void
  setMemo: (stop: TripStop, memo: string | null) => void
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
        ? { trip: { ...state.trip, stops: renumber(state.trip.stops.filter((s) => s !== stop), stop.dayNo) }, isDirty: true }
        : state,
    ),
  moveStop: (stop, toIndex) =>
    set((state) => {
      if (!state.trip) return state
      const dayStops = state.trip.stops.filter((s) => s.dayNo === stop.dayNo).sort((a, b) => a.orderNo - b.orderNo)
      const otherStops = state.trip.stops.filter((s) => s.dayNo !== stop.dayNo)
      const fromIndex = dayStops.indexOf(stop)
      if (fromIndex === -1) return state

      const clampedTo = Math.max(0, Math.min(toIndex, dayStops.length - 1))
      if (clampedTo === fromIndex) return state

      const reordered = [...dayStops]
      reordered.splice(fromIndex, 1)
      reordered.splice(clampedTo, 0, stop)

      return { trip: { ...state.trip, stops: [...otherStops, ...renumber(reordered, stop.dayNo)] }, isDirty: true }
    }),
  moveStopToDay: (stop, toDayNo) =>
    set((state) => {
      if (!state.trip || stop.dayNo === toDayNo || !state.trip.stops.includes(stop)) return state
      const fromDayNo = stop.dayNo
      const byOrder = (a: TripStop, b: TripStop) => a.orderNo - b.orderNo
      const fromStops = state.trip.stops.filter((s) => s.dayNo === fromDayNo && s !== stop).sort(byOrder)
      const toStops = [...state.trip.stops.filter((s) => s.dayNo === toDayNo).sort(byOrder), { ...stop, dayNo: toDayNo }]
      const otherStops = state.trip.stops.filter((s) => s.dayNo !== fromDayNo && s.dayNo !== toDayNo)
      return {
        trip: {
          ...state.trip,
          stops: [...otherStops, ...renumber(fromStops, fromDayNo), ...renumber(toStops, toDayNo)],
        },
        isDirty: true,
      }
    }),
  setTravelMode: (stop, mode) =>
    set((state) =>
      state.trip
        ? {
            trip: {
              ...state.trip,
              stops: state.trip.stops.map((s) => (s === stop ? { ...s, travelMode: mode } : s)),
            },
            isDirty: true,
          }
        : state,
    ),
  setMemo: (stop, memo) =>
    set((state) =>
      state.trip
        ? {
            trip: { ...state.trip, stops: state.trip.stops.map((s) => (s === stop ? { ...s, memo } : s)) },
            isDirty: true,
          }
        : state,
    ),
  markSaved: (trip) => set({ trip, isDirty: false }),
}))
