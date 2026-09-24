declare global {
  interface Window {
    kakao: typeof kakao
  }
}

let loadPromise: Promise<void> | null = null

/**
 * 카카오맵 JavaScript SDK를 1회만 로드한다.
 * 여러 컴포넌트가 동시에 호출해도 스크립트 태그는 하나만 생성된다.
 */
export function loadKakaoMapSdk(): Promise<void> {
  if (window.kakao?.maps) {
    return Promise.resolve()
  }

  if (loadPromise) {
    return loadPromise
  }

  const appKey = import.meta.env.VITE_KAKAO_JS_KEY
  if (!appKey) {
    return Promise.reject(new Error('VITE_KAKAO_JS_KEY가 설정되지 않았습니다 (.env 확인)'))
  }

  loadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${appKey}&autoload=false&libraries=services`
    script.async = true
    script.onload = () => window.kakao.maps.load(() => resolve())
    script.onerror = () => {
      loadPromise = null
      reject(new Error('카카오맵 SDK 로드 실패'))
    }
    document.head.appendChild(script)
  })

  return loadPromise
}
