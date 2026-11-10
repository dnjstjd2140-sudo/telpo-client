interface PlaceLinkProps {
  provider: string
  providerPlaceId: string
  name: string
}

/** 장소 이름 옆에 붙는 카카오맵 장소 페이지 바로가기. 카카오 장소가 아니면 아무것도 그리지 않는다. */
export function PlaceLink({ provider, providerPlaceId, name }: PlaceLinkProps) {
  if (provider !== 'KAKAO' || !providerPlaceId) return null

  return (
    <a
      className="place-link"
      href={`https://place.map.kakao.com/${encodeURIComponent(providerPlaceId)}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${name} 카카오맵에서 보기`}
      title="카카오맵에서 보기"
      // 일정 목록 행은 클릭 시 지도 이동/선택을 하므로 링크 클릭이 행까지 전달되지 않게 한다
      onClick={(e) => e.stopPropagation()}
    >
      <svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true">
        <path
          d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </a>
  )
}
