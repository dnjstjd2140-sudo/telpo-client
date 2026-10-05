import { useState } from 'react'

import { searchPlaces } from '@/api/places'
import type { PlaceSearchResult } from '@/types/place'
import type { LatLng } from '@/types/route'

export interface PlaceSearchProps {
  /** 검색 기준 좌표 (보통 지도 중심) */
  center: LatLng
  onAdd: (place: PlaceSearchResult) => void
}

export function PlaceSearch({ center, onAdd }: PlaceSearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<PlaceSearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!query.trim()) return

    setIsSearching(true)
    setError(null)
    try {
      const data = await searchPlaces({ q: query, lat: center.lat, lng: center.lng })
      setResults(data)
    } catch {
      setError('검색에 실패했습니다')
    } finally {
      setIsSearching(false)
    }
  }

  return (
    <div className="place-search">
      <form className="home-form" onSubmit={handleSearch}>
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="장소, 주소 검색" />
        <button type="submit" disabled={isSearching}>
          {isSearching ? '검색 중...' : '검색'}
        </button>
      </form>

      {error && <p className="error-text">{error}</p>}

      {results.length > 0 && (
        <ul className="place-search-results">
          {results.map((place) => (
            <li key={`${place.provider}:${place.providerPlaceId}`}>
              <div className="place-info">
                <strong>{place.name}</strong>
                {place.address && <span>{place.address}</span>}
              </div>
              <button type="button" onClick={() => onAdd(place)}>
                추가
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
