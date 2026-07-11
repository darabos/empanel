import type React from 'react'
import type { Bubble, VideoMetadata, ZoomPanState } from '../types/annotation'

type WorkspaceCanvasProps = {
  videoRef: React.RefObject<HTMLVideoElement | null>
  viewportRef: React.RefObject<HTMLDivElement | null>
  videoUrl: string
  videoName: string
  currentTime: number
  transform: ZoomPanState
  bubbles: Bubble[]
  selectedBubbleId: string | null
  videoMetadata: VideoMetadata
  panModeEnabled: boolean
  onPanModeChange: (enabled: boolean) => void
  onWheel: (event: React.WheelEvent<HTMLDivElement>) => void
  onViewportPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void
  onTimelineSync: () => void
  onLoadedMetadata: (event: React.SyntheticEvent<HTMLVideoElement>) => void
  onSelectBubble: (bubbleId: string) => void
  onStartMoveBubble: (event: React.PointerEvent<HTMLDivElement>, bubble: Bubble) => void
  onStartResizeBubble: (event: React.PointerEvent<HTMLButtonElement>, bubble: Bubble) => void
  onStartTailDrag: (event: React.PointerEvent<HTMLButtonElement>, bubble: Bubble) => void
}

export function WorkspaceCanvas({
  videoRef,
  viewportRef,
  videoUrl,
  videoName,
  currentTime,
  transform,
  bubbles,
  selectedBubbleId,
  videoMetadata,
  panModeEnabled,
  onPanModeChange,
  onWheel,
  onViewportPointerDown,
  onTimelineSync,
  onLoadedMetadata,
  onSelectBubble,
  onStartMoveBubble,
  onStartResizeBubble,
  onStartTailDrag,
}: WorkspaceCanvasProps) {
  const zoomPercentage = Math.round(transform.zoom * 100)

  return (
    <div className="canvas-column">
      <div className="canvas-toolbar">
        <span>{videoName}</span>
        <span>Time: {currentTime.toFixed(2)}s</span>
        <span>Zoom: {zoomPercentage}%</span>
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
        className="viewport"
        ref={viewportRef}
        onWheel={onWheel}
        onPointerDown={onViewportPointerDown}
      >
        <div
          className="zoom-layer"
          style={{
            width: `${videoMetadata.width}px`,
            height: `${videoMetadata.height}px`,
            transform: `translate(${transform.panX}px, ${transform.panY}px) scale(${transform.zoom})`,
          }}
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

              return (
                <div key={bubble.id}>
                  <svg className="tail-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <line
                      x1={centerX * 100}
                      y1={centerY * 100}
                      x2={bubble.tailX * 100}
                      y2={bubble.tailY * 100}
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
                    <button
                      type="button"
                      className="resize-handle"
                      onPointerDown={(event) => onStartResizeBubble(event, bubble)}
                      aria-label="Resize bubble"
                    />
                  </div>

                  <button
                    type="button"
                    className={`tail-handle ${isSelected ? 'selected' : ''}`}
                    style={{
                      left: `${bubble.tailX * 100}%`,
                      top: `${bubble.tailY * 100}%`,
                    }}
                    onPointerDown={(event) => onStartTailDrag(event, bubble)}
                    aria-label="Move tail point"
                  />
                </div>
              )
            })}

            {panModeEnabled && <div className="pan-overlay">Pan mode enabled</div>}
          </div>
        </div>
      </div>
    </div>
  )
}
