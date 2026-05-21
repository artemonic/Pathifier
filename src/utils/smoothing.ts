import type { Point } from '../types'

/**
 * Applies a fast Moving Average filter to the path O(N).
 */
function movingAverage(path: Point[], windowSize: number): Point[] {
  if (path.length < 3 || windowSize <= 1) return path

  const n = path.length
  const result: Point[] = new Array(n)
  const halfWindow = Math.floor(windowSize / 2)

  // Use a sliding window sum for O(N) performance
  let sumX = 0
  let sumY = 0
  let count = 0

  // Initial window
  for (let i = 0; i <= halfWindow && i < n; i++) {
    sumX += path[i].x
    sumY += path[i].y
    count++
  }

  for (let i = 0; i < n; i++) {
    result[i] = { x: sumX / count, y: sumY / count }

    // Slide window: add next, remove old
    const nextIdx = i + halfWindow + 1
    const prevIdx = i - halfWindow

    if (nextIdx < n) {
      sumX += path[nextIdx].x
      sumY += path[nextIdx].y
      count++
    }
    if (prevIdx >= 0) {
      sumX -= path[prevIdx].x
      sumY -= path[prevIdx].y
      count--
    }
  }

  // Preserve endpoints
  result[0] = { ...path[0] }
  result[n - 1] = { ...path[n - 1] }

  return result
}

/**
 * Combined smoothing: Fast Moving Average + Chaikin.
 */
export function smoothPath(path: Point[], factor: number): Point[] {
  if (path.length < 3 || factor <= 0) return path

  // windowSize scales with factor: 0-10 -> 1-30
  const windowSize = 1 + Math.floor(factor * 3)
  let currentPath = movingAverage(path, windowSize)

  // Fixed Chaikin iterations for visual crispness
  const chaikinIterations = factor > 0 ? 2 : 0

  for (let iter = 0; iter < chaikinIterations; iter++) {
    const nextPath: Point[] = []
    nextPath.push(currentPath[0])

    for (let i = 0; i < currentPath.length - 1; i++) {
      const p1 = currentPath[i]
      const p2 = currentPath[i + 1]

      const q = {
        x: 0.75 * p1.x + 0.25 * p2.x,
        y: 0.75 * p1.y + 0.25 * p2.y
      }
      const r = {
        x: 0.25 * p1.x + 0.75 * p2.x,
        y: 0.25 * p1.y + 0.75 * p2.y
      }

      if (i === 0) {
        nextPath.push(r)
      } else if (i === currentPath.length - 2) {
        nextPath.push(q)
      } else {
        nextPath.push(q)
        nextPath.push(r)
      }
    }

    nextPath.push(currentPath[currentPath.length - 1])
    currentPath = nextPath
  }

  return currentPath
}

/**
 * Breaks a continuous path into segments if any segment is longer than maxLength.
 */
export function segmentPath(path: Point[], maxLength: number): Point[][] {
  if (path.length < 2) return [path]
  
  const segments: Point[][] = []
  let currentSegment: Point[] = [path[0]]

  for (let i = 1; i < path.length; i++) {
    const p1 = path[i - 1]
    const p2 = path[i]
    const distance = Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2)

    if (distance > maxLength) {
      if (currentSegment.length > 0) {
        segments.push(currentSegment)
      }
      currentSegment = [p2]
    } else {
      currentSegment.push(p2)
    }
  }

  if (currentSegment.length > 0) {
    segments.push(currentSegment)
  }

  return segments
}

export function generateSVG(pathSegments: Point[][] | Point[], width: number, height: number, lineWidth: number = 1): string {
  // Normalize input to Point[][]
  const segments: Point[][] = Array.isArray(pathSegments[0]) 
    ? (pathSegments as Point[][]) 
    : [pathSegments as Point[]]

  if (segments.length === 0 || segments[0].length === 0) return ''

  let d = ''
  for (const segment of segments) {
    if (segment.length < 1) continue
    d += `M ${segment[0].x.toFixed(2)} ${segment[0].y.toFixed(2)} `
    for (let i = 1; i < segment.length; i++) {
      d += `L ${segment[i].x.toFixed(2)} ${segment[i].y.toFixed(2)} `
    }
  }

  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
    <path d="${d}" stroke="black" fill="none" stroke-width="${lineWidth}" stroke-linejoin="round" stroke-linecap="round" />
  </svg>`
}

