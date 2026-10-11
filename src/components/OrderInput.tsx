import { useEffect, useState } from 'react'

interface OrderInputProps {
  /** 현재 순서 (1부터) */
  value: number
  /** 마지막 순서 (= 정류지 개수) */
  max: number
  /** 사용자가 직접 입력해 확정한 새 순서 (0부터). 범위를 벗어난 값은 1~max로 보정된다. */
  onCommit: (toIndex: number) => void
}

/** 순서 뱃지를 숫자 입력칸으로 바꿔서, 원하는 순서를 직접 쳐서 옮길 수 있게 한다. Enter/포커스 해제 시 확정. */
export function OrderInput({ value, max, onCommit }: OrderInputProps) {
  const [draft, setDraft] = useState(String(value))

  useEffect(() => {
    setDraft(String(value))
  }, [value])

  function commit() {
    const parsed = parseInt(draft, 10)
    if (Number.isNaN(parsed)) {
      setDraft(String(value))
      return
    }
    const clamped = Math.max(1, Math.min(max, parsed))
    setDraft(String(clamped))
    if (clamped !== value) onCommit(clamped - 1)
  }

  return (
    <input
      className="order-input"
      type="text"
      inputMode="numeric"
      aria-label="순서"
      title="숫자를 입력하고 Enter를 누르면 그 순서로 이동"
      value={draft}
      onChange={(e) => setDraft(e.target.value.replace(/[^0-9]/g, ''))}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur()
        if (e.key === 'Escape') {
          setDraft(String(value))
          e.currentTarget.blur()
        }
      }}
    />
  )
}
