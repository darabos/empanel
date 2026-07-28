import type React from 'react'
import type { Bubble, VideoMetadata } from '../types/annotation'

type WorkspaceCanvasProps = {
  videoRef: React.RefObject<HTMLVideoElement | null>
  viewportRef: React.RefObject<HTMLDivElement | null>
  videoUrl: string
  currentTime: number
  bubbles: Bubble[]
  selectedBubbleId: string | null
  videoMetadata: VideoMetadata
  fitScale: number
  baseOffsetX: number
  baseOffsetY: number
  onTimelineSync: () => void
  onLoadedMetadata: (event: React.SyntheticEvent<HTMLVideoElement>) => void
  onSelectBubble: (bubbleId: string) => void
  onDeselectBubble: () => void
  onStartMoveBubble: (event: React.PointerEvent<HTMLDivElement>, bubble: Bubble) => void
  onStartResizeBubble: (event: React.PointerEvent<HTMLButtonElement>, bubble: Bubble) => void
  onStartTailDrag: (event: React.PointerEvent<HTMLButtonElement>, bubble: Bubble) => void
}

export function WorkspaceCanvas({
  videoRef,
  viewportRef,
  videoUrl,
  currentTime,
  bubbles,
  selectedBubbleId,
  videoMetadata,
  fitScale,
  baseOffsetX,
  baseOffsetY,
  onTimelineSync,
  onLoadedMetadata,
  onSelectBubble,
  onDeselectBubble,
  onStartMoveBubble,
  onStartResizeBubble,
  onStartTailDrag,
}: WorkspaceCanvasProps) {
  const fittedWidth = videoMetadata.width * fitScale
  const fittedHeight = videoMetadata.height * fitScale
  const layerStyle: React.CSSProperties = {
    width: `${fittedWidth}px`,
    height: `${fittedHeight}px`,
    left: `${baseOffsetX}px`,
    top: `${baseOffsetY}px`,
  }

  return (
    <div className="canvas-column">
      <div className="canvas-toolbar">
        <span>Time: {currentTime.toFixed(2)}s</span>
      </div>

      <div
        className="viewport"
        ref={viewportRef}
        onPointerDown={(event) => {
          const target = event.target as HTMLElement
          const clickedOnBubble = Boolean(
            target.closest('.bubble-card') ||
              target.closest('.resize-handle') ||
              target.closest('.tail-handle'),
          )

          if (!clickedOnBubble) {
            onDeselectBubble()
          }
        }}
      >
        <div
          className="zoom-layer"
          style={layerStyle}
        >
          <video
            ref={videoRef}
            className="video-frame"
            src={videoUrl}
            controls
            onTimeUpdate={onTimelineSync}
            onSeeked={onTimelineSync}
            onLoadedMetadata={onLoadedMetadata}
          />

          <div className="bubble-layer">
            {bubbles.map((bubble) => {
              const isSelected = bubble.id === selectedBubbleId
              const width = bubble.right - bubble.left
              const height = bubble.bottom - bubble.top
              const centerX = bubble.left + width / 2
              const centerY = bubble.top + height / 2
              const baseX = centerX * 100
              const baseY = centerY * 100
              const tipX = bubble.tailX * 100
              const tipY = bubble.tailY * 100
              const vectorX = tipX - baseX
              const vectorY = tipY - baseY
              const vectorLength = Math.hypot(vectorX, vectorY) || 1
              const perpX = -vectorY / vectorLength
              const perpY = vectorX / vectorLength
              const tailHalfWidth = 3
              const base1X = baseX + perpX * tailHalfWidth
              const base1Y = baseY + perpY * tailHalfWidth
              const base2X = baseX - perpX * tailHalfWidth
              const base2Y = baseY - perpY * tailHalfWidth

              return (
                <div key={bubble.id}>
                  <svg className="tail-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <polygon
                      points={`${tipX},${tipY} ${base1X},${base1Y} ${base2X},${base2Y}`}
                    />
                  </svg>

                  <div
                    className={`bubble-card ${isSelected ? 'selected' : ''}`}
                    style={{
                      left: `${bubble.left * 100}%`,
                      top: `${bubble.top * 100}%`,
                      width: `${width * 100}%`,
                      height: `${height * 100}%`,
                    }}
                    onPointerDown={(event) => onStartMoveBubble(event, bubble)}
                    onClick={() => onSelectBubble(bubble.id)}
                  >
                    <span>{bubble.text || '...'}</span>
                    {isSelected && (
                      <button
                        type="button"
                        className="resize-handle"
                        onPointerDown={(event) => onStartResizeBubble(event, bubble)}
                        aria-label="Resize bubble"
                      />
                    )}
                  </div>

                  {isSelected && (
                    <button
                      type="button"
                      className="tail-handle selected"
                      style={{
                        left: `${bubble.tailX * 100}%`,
                        top: `${bubble.tailY * 100}%`,
                      }}
                      onPointerDown={(event) => onStartTailDrag(event, bubble)}
                      aria-label="Move tail point"
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
