import { clamp } from '../lib/annotationMath'
import type { Bubble } from '../types/annotation'

type SidebarProps = {
  selectedBubble: Bubble | null
  onUpdateBubble: (bubbleId: string, updater: (bubble: Bubble) => Bubble) => void
  onDeleteSelectedBubble: () => void
  onOpenVideo: () => void
  onAddBubble: () => void
  onResetView: () => void
}

export function Sidebar({
  selectedBubble,
  onUpdateBubble,
  onDeleteSelectedBubble,
  onOpenVideo,
  onAddBubble,
  onResetView,
}: SidebarProps) {
  return (
    <aside className="inspector">
      <button type="button" onClick={onOpenVideo}>
        Open Video
      </button>
      <button type="button" onClick={onAddBubble}>
        Add Bubble
      </button>
      <button type="button" onClick={onResetView}>
        Reset View
      </button>
      {selectedBubble && (
        <div className="inspector-form">
          <label>
            Text
            <textarea
              rows={10}
              value={selectedBubble.text}
              onChange={(event) =>
                onUpdateBubble(selectedBubble.id, (bubble) => ({
                  ...bubble,
                  text: event.target.value,
                }))
              }
            />
          </label>

          <button type="button" onClick={onDeleteSelectedBubble}>
            Delete Bubble
          </button>
        </div>
      )}
    </aside>
  )
}
