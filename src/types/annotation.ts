export type ZoomPanState = {
  zoom: number
  panX: number
  panY: number
}

export type Bubble = {
  id: string
  left: number
  top: number
  right: number
  bottom: number
  tailX: number
  tailY: number
  text: string
}

export type TimelineSnapshot = {
  timestamp: number
  transform: ZoomPanState
  bubbles: Bubble[]
}

export type PersistedState = {
  version: 1
  snapshots: TimelineSnapshot[]
}

export type DragState =
  | {
      mode: 'pan'
      startClientX: number
      startClientY: number
      startTransform: ZoomPanState
    }
  | {
      mode: 'move'
      bubbleId: string
      startNormX: number
      startNormY: number
      startBubble: Bubble
    }
  | {
      mode: 'resize'
      bubbleId: string
      minWidth: number
      minHeight: number
      startBubble: Bubble
    }
  | {
      mode: 'tail'
      bubbleId: string
    }

export type VideoMetadata = {
  width: number
  height: number
}

export type PanelRecord = {
  id: string
  timestamp: number
  transform: ZoomPanState
  bubbles: Bubble[]
  createdAt: number
  updatedAt: number
}

export type PanelRasterRecord = {
  panelId: string
  width: number
  height: number
  mimeType: string
  blob: Blob
  updatedAt: number
}
