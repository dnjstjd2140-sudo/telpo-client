import { useState } from 'react'

const MAX_MEMO_LENGTH = 200

interface StopMemoProps {
  memo: string | null
  onChange: (memo: string | null) => void
}

/** 정류지 하나에 붙이는 짧은 메모. 이미 내용이 있으면 펼친 채로 시작한다. */
export function StopMemo({ memo, onChange }: StopMemoProps) {
  const [open, setOpen] = useState(Boolean(memo))

  if (!open) {
    return (
      <button type="button" className="memo-toggle" onClick={() => setOpen(true)}>
        + 메모
      </button>
    )
  }

  return (
    <textarea
      className="stop-memo"
      rows={2}
      maxLength={MAX_MEMO_LENGTH}
      placeholder="메모 (예약 번호, 주의사항 등)"
      value={memo ?? ''}
      autoFocus={!memo}
      onChange={(e) => onChange(e.target.value === '' ? null : e.target.value)}
    />
  )
}
