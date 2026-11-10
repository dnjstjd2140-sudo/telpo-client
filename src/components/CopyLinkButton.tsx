import { useEffect, useRef, useState } from 'react'

interface CopyLinkButtonProps {
  /** 현재 주소 뒤에 붙일 경로 (예: `/s/abc`) */
  path: string
  label: string
  /** 클립보드 복사가 막혔을 때 띄우는 안내 문구 */
  promptMessage: string
}

/** 현재 주소 기준 링크를 클립보드에 복사한다. 공유 링크(/s/...)와 편집 링크(/t/...)에 함께 쓴다. */
export function CopyLinkButton({ path, label, promptMessage }: CopyLinkButtonProps) {
  const [status, setStatus] = useState<'idle' | 'copied' | 'failed'>('idle')
  const timerRef = useRef<number | undefined>(undefined)
  const url = `${window.location.origin}${path}`

  useEffect(() => () => window.clearTimeout(timerRef.current), [])

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url)
      setStatus('copied')
    } catch {
      // 클립보드 접근이 막힌 환경(http 등)에서는 직접 복사할 수 있게 주소를 띄워준다
      window.prompt(promptMessage, url)
      setStatus('failed')
    }
    window.clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(() => setStatus('idle'), 2000)
  }

  return (
    <button type="button" className="share-link-button" onClick={handleCopy} title={url}>
      {status === 'copied' ? '링크 복사됨 ✓' : label}
    </button>
  )
}
