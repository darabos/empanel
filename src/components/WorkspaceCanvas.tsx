import type React from 'react'
import { useEffect, useRef } from 'react'
import type { Bubble, VideoMetadata } from '../types/annotation'
import { drawBubblesOnContext } from '../lib/panelRaster'

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
  onPreviousFrame: () => void
  onNextFrame: () => void
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
  onPreviousFrame,
  onNextFrame,
}: WorkspaceCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  // Draw bubbles directly onto canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) {
      return
    }

    const ctx = canvas.getContext('2d')
    if (!ctx) {
      return
    }

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    
    // Draw bubbles
    drawBubblesOnContext(ctx, bubbles, videoMetadata.width, videoMetadata.height)
  }, [bubbles, videoMetadata.width, videoMetadata.height])
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
        <button onClick={onPreviousFrame} title="Previous frame (Left arrow)">
          ← Frame
        </button>
        <span>Time: {currentTime.toFixed(2)}s</span>
        <button onClick={onNextFrame} title="Next frame (Right arrow)">
          Frame →
        </button>
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

          {bubbles.length > 0 && (
            <canvas
              ref={canvasRef}
              width={videoMetadata.width}
              height={videoMetadata.height}
              className="raster-overlay"
            />
          )}

          <div className="bubble-layer">
            {bubbles.map((bubble) => {
              const isSelected = bubble.id === selectedBubbleId
              const width = bubble.right - bubble.left
              const height = bubble.bottom - bubble.top

              return (
                <div key={bubble.id}>

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
