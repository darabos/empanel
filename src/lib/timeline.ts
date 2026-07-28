import { clamp, cloneBubbles } from './annotationMath'
import type { Bubble, PersistedState, TimelineSnapshot } from '../types/annotation'

export const STORAGE_KEY = 'video-annotator.timeline.v1'
export const TIMESTAMP_EPSILON = 0.05

export function sortSnapshots(snapshots: TimelineSnapshot[]): TimelineSnapshot[] {
  return [...snapshots].sort((a, b) => a.timestamp - b.timestamp)
}

export function getStateAtTime(snapshots: TimelineSnapshot[], timestamp: number) {
  if (snapshots.length === 0) {
    return {
      bubbles: [] as Bubble[],
    }
  }

  let selected = snapshots[0]
  for (const snapshot of snapshots) {
    if (snapshot.timestamp <= timestamp + TIMESTAMP_EPSILON) {
      selected = snapshot
      continue
    }
    break
  }

  return {
    bubbles: cloneBubbles(selected.bubbles),
  }
}

export function upsertSnapshot(
  snapshots: TimelineSnapshot[],
  timestamp: number,
  bubbles: Bubble[],
) {
  const nextSnapshot: TimelineSnapshot = {
    timestamp,
    bubbles: cloneBubbles(bubbles),
  }

  const next = [...snapshots]
  const existingIndex = next.findIndex(
    (snapshot) => Math.abs(snapshot.timestamp - timestamp) <= TIMESTAMP_EPSILON,
  )

  if (existingIndex >= 0) {
    next[existingIndex] = nextSnapshot
  } else {
    next.push(nextSnapshot)
  }

  return sortSnapshots(next)
}

export function safeParsePersistedState(rawValue: string | null): PersistedState | null {
  if (!rawValue) {
    return null
  }

  try {
    const parsed = JSON.parse(rawValue) as PersistedState
    if (parsed.version !== 1 || !Array.isArray(parsed.snapshots)) {
      return null
    }

    const snapshots = parsed.snapshots
      .filter((snapshot) => {
        return (
          typeof snapshot.timestamp === 'number' &&
          Array.isArray(snapshot.bubbles)
        )
      })
      .map((snapshot) => ({
        timestamp: snapshot.timestamp,
        bubbles: snapshot.bubbles
          .filter((bubble) => {
            return (
              typeof bubble.id === 'string' &&
              typeof bubble.left === 'number' &&
              typeof bubble.top === 'number' &&
              typeof bubble.right === 'number' &&
              typeof bubble.bottom === 'number' &&
              typeof bubble.tailX === 'number' &&
              typeof bubble.tailY === 'number' &&
              typeof bubble.text === 'string'
            )
          })
          .map((bubble) => ({
            id: bubble.id,
            left: clamp(bubble.left, 0, 1),
            top: clamp(bubble.top, 0, 1),
            right: clamp(bubble.right, 0, 1),
            bottom: clamp(bubble.bottom, 0, 1),
            tailX: clamp(bubble.tailX, 0, 1),
            tailY: clamp(bubble.tailY, 0, 1),
            text: bubble.text,
          })),
      }))

    return {
      version: 1,
      snapshots: sortSnapshots(snapshots),
    }
  } catch {
    return null
  }
}
