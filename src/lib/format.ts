export function formatDuration(seconds: number): string {
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes}분`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest === 0 ? `${hours}시간` : `${hours}시간 ${rest}분`
}

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)}m`
  return `${(meters / 1000).toFixed(1)}km`
}
