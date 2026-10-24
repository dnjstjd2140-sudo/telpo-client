import { useEffect, useState } from 'react'

/** index.css의 모바일 미디어쿼리와 같은 기준. 바꿀 때는 두 곳을 함께 바꾼다. */
export const MOBILE_MEDIA_QUERY = '(max-width: 768px)'

export function isMobileViewport(): boolean {
  return typeof window !== 'undefined' && window.matchMedia(MOBILE_MEDIA_QUERY).matches
}

/** 폰 화면이면 true. 화면을 돌리거나 창 크기를 바꾸면 다시 계산된다. */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(isMobileViewport)

  useEffect(() => {
    const media = window.matchMedia(MOBILE_MEDIA_QUERY)
    const onChange = () => setIsMobile(media.matches)
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  return isMobile
}
