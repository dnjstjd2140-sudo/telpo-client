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

/**
 * 지도를 "한눈에 보기"로 맞출 때 패널에 가려지는 쪽에 둘 여백(px).
 * 값은 index.css의 패널 크기에 맞춘다: 왼쪽 검색 패널 360px, 오른쪽 일정 패널 300px(+여백 16px), 폰 아래 시트 45%.
 */
export function mapFitPadding(opts: { isMobile: boolean; sidebarOpen: boolean; panelOpen: boolean }) {
  const base = 50
  if (opts.isMobile) {
    const sheet = opts.panelOpen ? Math.round(window.innerHeight * 0.45) : 60
    return { top: base, right: 30, bottom: sheet + 20, left: 30 }
  }
  return {
    top: base,
    right: opts.panelOpen ? 316 + 30 : base,
    bottom: base,
    left: opts.sidebarOpen ? 360 + 30 : base,
  }
}
