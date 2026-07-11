import type React from 'react'
import type { Bubble, VideoMetadata, ZoomPanState } from '../types/annotation'

type WorkspaceCanvasProps = {
  videoRef: React.RefObject<HTMLVideoElement | null>
  viewportRef: React.RefObject<HTMLDivElement | null>
  videoUrl: string
  currentTime: number
  transform: ZoomPanState
  bubbles: Bubble[]
  selectedBubbleId: string | null
  videoMetadata: VideoMetadata
  fitScale: number
  baseOffsetX: number
  baseOffsetY: number
  panModeEnabled: boolean
  onPanModeChange: (enabled: boolean) => void
  onWheel: (event: React.WheelEvent<HTMLDivElement>) => void
  onViewportPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void
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
  transform,
  bubbles,
  selectedBubbleId,
  videoMetadata,
  fitScale,
  baseOffsetX,
  baseOffsetY,
  panModeEnabled,
  onPanModeChange,
  onWheel,
  onViewportPointerDown,
  onTimelineSync,
  onLoadedMetadata,
  onSelectBubble,
  onDeselectBubble,
  onStartMoveBubble,
  onStartResizeBubble,
  onStartTailDrag,
}: WorkspaceCanvasProps) {
  const zoomPercentage = Math.round(transform.zoom * 100)
  const fittedWidth = videoMetadata.width * fitScale
  const fittedHeight = videoMetadata.height * fitScale
  const zoomLayerStyle: React.CSSProperties = panModeEnabled
    ? {
        width: `${fittedWidth}px`,
        height: `${fittedHeight}px`,
        left: `${baseOffsetX}px`,
        top: `${baseOffsetY}px`,
        transform: `translate(${transform.panX}px, ${transform.panY}px) scale(${transform.zoom})`,
      }
    : {
        width: `${fittedWidth}px`,
        height: `${fittedHeight}px`,
        left: `${baseOffsetX}px`,
        top: `${baseOffsetY}px`,
      }

  return (
    <div className="canvas-column">
      <div className="canvas-toolbar">
        <span>Time: {currentTime.toFixed(2)}s</span>
        <span>Zoom: {zoomPercentage}%</span>
        <span>Mode: {panModeEnabled ? 'Pan' : 'Seek'}</span>
        <label>
          <input
            type="checkbox"
            checked={panModeEnabled}
            onChange={(event) => onPanModeChange(event.target.checked)}
          />
          Pan mode
        </label>
      </div>

      <div
        className={`viewport ${panModeEnabled ? 'mode-pan' : 'mode-seek'}`}
        ref={viewportRef}
        onWheel={(event) => {
          if (!panModeEnabled) {
            return
          }

          onWheel(event)
        }}
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

          onViewportPointerDown(event)
        }}
      >
        <div
          className="zoom-layer"
          style={zoomLayerStyle}
        >
          <video
            ref={videoRef}
            className={`video-frame ${panModeEnabled ? 'pan-disabled' : ''}`}
            src={videoUrl}
            controls={!panModeEnabled}
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
