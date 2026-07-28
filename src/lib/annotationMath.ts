import type { Bubble } from '../types/annotation'

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function cloneBubble(bubble: Bubble): Bubble {
  return {
    id: bubble.id,
    left: bubble.left,
    top: bubble.top,
    right: bubble.right,
    bottom: bubble.bottom,
    tailX: bubble.tailX,
    tailY: bubble.tailY,
    text: bubble.text,
  }
}

export function cloneBubbles(bubbles: Bubble[]): Bubble[] {
  return bubbles.map(cloneBubble)
}

export function generateBubbleId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `bubble-${Date.now()}-${Math.floor(Math.random() * 1000)}`
}
