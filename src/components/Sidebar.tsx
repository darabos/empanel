import type { Bubble } from '../types/annotation'

type SidebarProps = {
  selectedBubble: Bubble | null
  onUpdateBubble: (bubbleId: string, updater: (bubble: Bubble) => Bubble) => void
  onDeleteSelectedBubble: () => void
  onOpenVideo: () => void
  onAddBubble: () => void
}

export function Sidebar({
  selectedBubble,
  onUpdateBubble,
  onDeleteSelectedBubble,
  onOpenVideo,
  onAddBubble,
}: SidebarProps) {
  return (
    <aside className="inspector">
      <button type="button" onClick={onOpenVideo}>
        Open Video
      </button>
      <button type="button" onClick={onAddBubble}>
        Add Bubble
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

          <label>
            Type
            <div className="bubble-type-buttons">
              <button
                type="button"
                className={selectedBubble.type === 'speech' ? 'active' : ''}
                onClick={() =>
                  onUpdateBubble(selectedBubble.id, (bubble) => ({
                    ...bubble,
                    type: 'speech',
                  }))
                }
              >
                💬 Speech
              </button>
              <button
                type="button"
                className={selectedBubble.type === 'thought' ? 'active' : ''}
                onClick={() =>
                  onUpdateBubble(selectedBubble.id, (bubble) => ({
                    ...bubble,
                    type: 'thought',
                  }))
                }
              >
                💭 Thought
              </button>
              <button
                type="button"
                className={selectedBubble.type === 'narration' ? 'active' : ''}
                onClick={() =>
                  onUpdateBubble(selectedBubble.id, (bubble) => ({
                    ...bubble,
                    type: 'narration',
                  }))
                }
              >
                📖 Narration
              </button>
            </div>
          </label>

          <button type="button" onClick={onDeleteSelectedBubble}>
            Delete Bubble
          </button>
        </div>
      )}
    </aside>
  )
}
