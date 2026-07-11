import { clamp } from '../lib/annotationMath'
import type { Bubble } from '../types/annotation'

type BubbleInspectorProps = {
  selectedBubble: Bubble | null
  onUpdateBubble: (bubbleId: string, updater: (bubble: Bubble) => Bubble) => void
  onDeleteSelectedBubble: () => void
}

export function BubbleInspector({
  selectedBubble,
  onUpdateBubble,
  onDeleteSelectedBubble,
}: BubbleInspectorProps) {
  return (
    <aside className="inspector">
      <h2>Bubble Inspector</h2>
      {!selectedBubble && <p>Select a bubble to edit text, bounds, and tail coordinates.</p>}

      {selectedBubble && (
        <div className="inspector-form">
          <label>
            Text
            <textarea
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
            Left
            <input
              type="number"
              min={0}
              max={1}
              step={0.01}
              value={selectedBubble.left}
              onChange={(event) => {
                const left = clamp(Number(event.target.value), 0, selectedBubble.right - 0.02)
                onUpdateBubble(selectedBubble.id, (bubble) => ({ ...bubble, left }))
              }}
            />
          </label>

          <label>
            Top
            <input
              type="number"
              min={0}
              max={1}
              step={0.01}
              value={selectedBubble.top}
              onChange={(event) => {
                const top = clamp(Number(event.target.value), 0, selectedBubble.bottom - 0.02)
                onUpdateBubble(selectedBubble.id, (bubble) => ({ ...bubble, top }))
              }}
            />
          </label>

          <label>
            Right
            <input
              type="number"
              min={0}
              max={1}
              step={0.01}
              value={selectedBubble.right}
              onChange={(event) => {
                const right = clamp(Number(event.target.value), selectedBubble.left + 0.02, 1)
                onUpdateBubble(selectedBubble.id, (bubble) => ({ ...bubble, right }))
              }}
            />
          </label>

          <label>
            Bottom
            <input
              type="number"
              min={0}
              max={1}
              step={0.01}
              value={selectedBubble.bottom}
              onChange={(event) => {
                const bottom = clamp(Number(event.target.value), selectedBubble.top + 0.02, 1)
                onUpdateBubble(selectedBubble.id, (bubble) => ({ ...bubble, bottom }))
              }}
            />
          </label>

          <label>
            Tail X
            <input
              type="number"
              min={0}
              max={1}
              step={0.01}
              value={selectedBubble.tailX}
              onChange={(event) => {
                const tailX = clamp(Number(event.target.value), 0, 1)
                onUpdateBubble(selectedBubble.id, (bubble) => ({ ...bubble, tailX }))
              }}
            />
          </label>

          <label>
            Tail Y
            <input
              type="number"
              min={0}
              max={1}
              step={0.01}
              value={selectedBubble.tailY}
              onChange={(event) => {
                const tailY = clamp(Number(event.target.value), 0, 1)
                onUpdateBubble(selectedBubble.id, (bubble) => ({ ...bubble, tailY }))
              }}
            />
          </label>

          <button type="button" onClick={onDeleteSelectedBubble}>
            Delete Bubble
          </button>
        </div>
      )}

      <div className="storage-note">
        <strong>Stored in localStorage:</strong>
        <ul>
          <li>Timestamped timeline snapshots</li>
          <li>Zoom and pan position</li>
          <li>Speech bubble geometry and text</li>
        </ul>
        <span>Video bytes are never stored.</span>
      </div>
    </aside>
  )
}
