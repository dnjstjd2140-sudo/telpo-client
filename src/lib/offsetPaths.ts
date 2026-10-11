export interface Pixel {
  x: number
  y: number
}

function distToSegment(p: Pixel, a: Pixel, b: Pixel): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const lenSq = dx * dx + dy * dy
  const t = lenSq === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq))
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy))
}

function distToPath(p: Pixel, path: Pixel[]): number {
  let min = Infinity
  for (let i = 1; i < path.length; i++) min = Math.min(min, distToSegment(p, path[i - 1], path[i]))
  return min
}

/** a 경로의 상당 부분이 b 경로 위에 놓여 있으면(화면상 thresholdPx 이내) 겹친다고 본다. */
function overlaps(a: Pixel[], b: Pixel[], thresholdPx: number): boolean {
  const step = Math.max(1, Math.floor(a.length / 80))
  let total = 0
  let near = 0
  for (let i = 0; i < a.length; i += step) {
    total++
    if (distToPath(a[i], b) <= thresholdPx) near++
  }
  return total > 0 && near / total >= 0.15
}

/**
 * 구간마다 차선(lane) 번호를 매긴다. 앞선 구간과 겹치면 비어 있는 가장 작은 차선을 쓴다.
 * 차선 0은 원래 위치, 이후는 +1, -1, +2, -2 ... 순서로 양옆에 놓인다.
 */
export function assignLanes(paths: Pixel[][], thresholdPx: number): number[] {
  const lanes: number[] = []
  paths.forEach((path, i) => {
    const used = new Set<number>()
    for (let j = 0; j < i; j++) {
      if (overlaps(path, paths[j], thresholdPx)) used.add(lanes[j])
    }
    let lane = 0
    while (used.has(lane)) lane++
    lanes.push(lane)
  })
  return lanes
}

/** 차선 번호를 화면상 좌우 이동량(부호 있는 배수)으로 바꾼다: 0, +1, -1, +2, -2 ... */
export function laneToSide(lane: number): number {
  return lane === 0 ? 0 : lane % 2 === 1 ? (lane + 1) / 2 : -lane / 2
}

/** 진행 방향의 오른쪽(화면 기준)으로 offsetPx만큼 평행 이동한 경로를 돌려준다. */
export function offsetPath(path: Pixel[], offsetPx: number): Pixel[] {
  if (offsetPx === 0 || path.length < 2) return path
  return path.map((p, i) => {
    const prev = path[Math.max(0, i - 1)]
    const next = path[Math.min(path.length - 1, i + 1)]
    const dx = next.x - prev.x
    const dy = next.y - prev.y
    const len = Math.hypot(dx, dy)
    if (len === 0) return p
    return { x: p.x - (dy / len) * offsetPx, y: p.y + (dx / len) * offsetPx }
  })
}
