type TopBarProps = {
  hasVideo: boolean
  onOpenVideo: () => void
  onAddBubble: () => void
  onResetView: () => void
}

export function TopBar({ hasVideo, onOpenVideo, onAddBubble, onResetView }: TopBarProps) {
  return (
    <header className="topbar">
      <div>
        <h1>Unboarding</h1>
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
      </div>
    </header>
  )
}
