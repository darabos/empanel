import type { Bubble } from '../types/annotation'

type RenderPanelRasterInput = {
  video?: HTMLVideoElement | null
  bubbles: Bubble[]
  width: number
  height: number
  transparent?: boolean
  mimeType?: string
  quality?: number
}

function drawRoundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const r = Math.min(radius, width / 2, height / 2)
  context.beginPath()
  context.moveTo(x + r, y)
  context.lineTo(x + width - r, y)
  context.quadraticCurveTo(x + width, y, x + width, y + r)
  context.lineTo(x + width, y + height - r)
  context.quadraticCurveTo(x + width, y + height, x + width - r, y + height)
  context.lineTo(x + r, y + height)
  context.quadraticCurveTo(x, y + height, x, y + height - r)
  context.lineTo(x, y + r)
  context.quadraticCurveTo(x, y, x + r, y)
  context.closePath()
}

function getWrappedLines(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) {
    return ['']
  }

  const lines: string[] = []
  let current = words[0]

  for (let index = 1; index < words.length; index += 1) {
    const testLine = `${current} ${words[index]}`
    if (context.measureText(testLine).width <= maxWidth) {
      current = testLine
    } else {
      lines.push(current)
      current = words[index]
    }
  }

  lines.push(current)
  return lines
}

function drawTail(context: CanvasRenderingContext2D, bubble: Bubble, width: number, height: number) {
  if (bubble.type === 'thought') {
    drawThoughtBubbleTail(context, bubble, width, height)
  } else {
    drawSpeechBubbleTail(context, bubble, width, height)
  }
}

function drawSpeechBubbleTail(context: CanvasRenderingContext2D, bubble: Bubble, width: number, height: number) {
  const bubbleWidth = bubble.right - bubble.left
  const bubbleHeight = bubble.bottom - bubble.top
  const centerX = (bubble.left + bubbleWidth / 2) * width
  const centerY = (bubble.top + bubbleHeight / 2) * height
  const tipX = bubble.tailX * width
  const tipY = bubble.tailY * height

  const vectorX = tipX - centerX
  const vectorY = tipY - centerY
  const vectorLength = Math.hypot(vectorX, vectorY) || 1
  const perpX = -vectorY / vectorLength
  const perpY = vectorX / vectorLength

  const tailHalfWidth = Math.min(width, height) * 0.03
  const base1X = centerX + perpX * tailHalfWidth
  const base1Y = centerY + perpY * tailHalfWidth
  const base2X = centerX - perpX * tailHalfWidth
  const base2Y = centerY - perpY * tailHalfWidth

  context.fillStyle = '#ffffff'
  context.beginPath()
  context.moveTo(tipX, tipY)
  context.lineTo(base1X, base1Y)
  context.lineTo(base2X, base2Y)
  context.closePath()
  context.fill()
}

function drawThoughtBubbleTail(context: CanvasRenderingContext2D, bubble: Bubble, width: number, height: number) {
  const bubbleWidth = bubble.right - bubble.left
  const bubbleHeight = bubble.bottom - bubble.top
  const centerX = (bubble.left + bubbleWidth / 2) * width
  const centerY = (bubble.top + bubbleHeight / 2) * height
  const tipX = bubble.tailX * width
  const tipY = bubble.tailY * height

  const circles = 3
  const offset = Math.min(bubbleWidth * width, bubbleHeight * height) * 0.5
  const minRadius = Math.min(width, height) * 0.015
  const radiusStep = minRadius * 0.7
  const radiuses = Array.from({ length: circles }, (_, i) => minRadius + radiusStep * (circles - i - 1))
  const filledTotal = radiuses.reduce((sum, r) => sum + r * 2, offset)
  const dist = Math.hypot(tipX - centerX, tipY - centerY)
  for (let i = 0; i < circles; i += 1) {
    const radius = minRadius + radiusStep * (circles - i - 1)
    const filledSoFar = radiuses.slice(0, i).reduce((sum, r) => sum + r * 2, radius + offset)
    const t = filledSoFar + (dist - filledTotal) * (i + 1) / (circles + 1)
    const x = centerX + (tipX - centerX) * t / dist
    const y = centerY + (tipY - centerY) * t / dist

    context.fillStyle = '#ffffff'
    context.beginPath()
    context.arc(x, y, radius, 0, Math.PI * 2)
    context.fill()
  }
}

function drawBubble(context: CanvasRenderingContext2D, bubble: Bubble, width: number, height: number) {
  const x = bubble.left * width
  const y = bubble.top * height
  const bubbleWidth = (bubble.right - bubble.left) * width
  const bubbleHeight = (bubble.bottom - bubble.top) * height

  drawRoundedRect(context, x, y, bubbleWidth, bubbleHeight, 200)
  context.fillStyle = '#ffffff'
  context.fill()
  context.lineWidth = Math.max(2, Math.min(width, height) * 0.003)
  context.strokeStyle = '#ffffff'
  context.stroke()

  const text = bubble.text || '...'
  const padding = Math.max(8, Math.min(width, height) * 0.01)
  const maxWidth = Math.max(20, bubbleWidth - padding * 2)
  const fontSize = 50
  const lineHeight = fontSize * 1.2

  context.fillStyle = '#111111'
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.font = `${fontSize}px Grandstander, "Avenir Next", "Segoe UI", sans-serif`

  const lines = getWrappedLines(context, text, maxWidth)
  const totalHeight = lines.length * lineHeight
  const startY = y + bubbleHeight / 2 - totalHeight / 2 + lineHeight / 2

  lines.forEach((line, index) => {
    context.fillText(line, x + bubbleWidth / 2, startY + index * lineHeight, maxWidth)
  })
}

export async function renderPanelRasterBlob({
  video,
  bubbles,
  width,
  height,
  transparent = false,
  mimeType,
  quality = 0.92,
}: RenderPanelRasterInput): Promise<Blob | null> {
  if (!width || !height || !Number.isFinite(width) || !Number.isFinite(height)) {
    return null
  }

  const resolvedMimeType = mimeType ?? (transparent ? 'image/png' : 'image/webp')

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const context = canvas.getContext('2d')
  if (!context) {
    return null
  }

  if (!transparent) {
    if (!video) {
      return null
    }

    try {
      context.drawImage(video, 0, 0, width, height)
    } catch {
      return null
    }
  }

  bubbles.forEach((bubble) => {
    drawTail(context, bubble, width, height)
    drawBubble(context, bubble, width, height)
  })

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), resolvedMimeType, quality)
  })
}
