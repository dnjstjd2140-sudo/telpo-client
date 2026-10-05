export interface PlaceSearchResult {
  name: string
  address: string | null
  lat: number
  lng: number
  provider: string
  providerPlaceId: string
}
