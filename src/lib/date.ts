function parseDate(value: string): Date {
  return new Date(`${value}T00:00:00`)
}

export function addDays(dateStr: string, days: number): string {
  const d = parseDate(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

export function nightsBetween(start: string, end: string): number {
  const ms = parseDate(end).getTime() - parseDate(start).getTime()
  return Math.max(0, Math.round(ms / 86_400_000))
}

export function durationLabel(start: string, end: string): string {
  const nights = nightsBetween(start, end)
  return nights === 0 ? '당일치기' : `${nights}박 ${nights + 1}일`
}

/** 여행 기간의 일차 번호 목록 (1부터 시작) */
export function tripDayNumbers(start: string, end: string): number[] {
  const nights = nightsBetween(start, end)
  return Array.from({ length: nights + 1 }, (_, i) => i + 1)
}

export function formatMonthDay(dateStr: string): string {
  const d = parseDate(dateStr)
  return `${d.getMonth() + 1}.${d.getDate()}`
}
