import { useEffect, useRef, useState } from 'react'

interface ShareLinkButtonProps {
  shareToken: string
}

/** 읽기 전용 공유 링크(/s/:shareToken)를 클립보드에 복사한다. */
export function ShareLinkButton({ shareToken }: ShareLinkButtonProps) {
  const [status, setStatus] = useState<'idle' | 'copied' | 'failed'>('idle')
  const timerRef = useRef<number | undefined>(undefined)
  const url = `${window.location.origin}/s/${shareToken}`

  useEffect(() => () => window.clearTimeout(timerRef.current), [])

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url)
      setStatus('copied')
    } catch {
      // 클립보드 접근이 막힌 환경(http 등)에서는 직접 복사할 수 있게 주소를 띄워준다
      window.prompt('아래 링크를 복사해서 공유하세요', url)
      setStatus('failed')
    }
    window.clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(() => setStatus('idle'), 2000)
  }

  return (
    <button type="button" className="share-link-button" onClick={handleCopy} title={url}>
      {status === 'copied' ? '링크 복사됨 ✓' : '공유 링크 복사'}
    </button>
  )
}
