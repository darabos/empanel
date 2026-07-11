type TopBarProps = {
  hasVideo: boolean
  onOpenVideo: () => void
  onAddBubble: () => void
  onResetView: () => void
  onClearAll: () => void
}

export function TopBar({ hasVideo, onOpenVideo, onAddBubble, onResetView, onClearAll }: TopBarProps) {
  return (
    <header className="topbar">
      <div>
        <h1>Frame Bubble Studio</h1>
        <p>Drop a local video, seek with native controls, zoom in, and annotate with speech bubbles.</p>
      </div>
      <div className="topbar-actions">
        <button type="button" onClick={onOpenVideo}>
          Open Video
        </button>
        <button type="button" onClick={onAddBubble} disabled={!hasVideo}>
          Add Bubble
        </button>
        <button type="button" onClick={onResetView} disabled={!hasVideo}>
          Reset View
        </button>
        <button type="button" onClick={onClearAll}>
          Clear localStorage
        </button>
      </div>
    </header>
  )
}
