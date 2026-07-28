import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import { Sidebar } from './components/Sidebar'
import { WorkspaceCanvas } from './components/WorkspaceCanvas'
import { clamp, cloneBubble, generateBubbleId } from './lib/annotationMath'
import {
  getCurrentVideoHandle,
  type PersistedVideoHandle,
  saveCurrentVideoHandle,
} from './lib/fileHandleStore'
import {
  deletePanelById,
  deletePanelRasterByPanelId,
  getPanelRasterByPanelId,
  listPanelsByCreatedAtAsc,
  upsertPanelRaster,
  upsertPanel,
} from './lib/panelStore'
import { renderPanelRasterBlob } from './lib/panelRaster'
import {
  STORAGE_KEY,
  getStateAtTime,
  safeParsePersistedState,
  upsertSnapshot,
} from './lib/timeline'
import type {
  Bubble,
  DragState,
  PersistedState,
  TimelineSnapshot,
  VideoMetadata,
  PanelRecord,
} from './types/annotation'

declare global {
  interface Window {
    showOpenFilePicker?: (options?: unknown) => Promise<unknown[]>
  }
}

function App() {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const viewportRef = useRef<HTMLDivElement | null>(null)
  const pendingSeekTimeRef = useRef<number | null>(null)

  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [videoMetadata, setVideoMetadata] = useState<VideoMetadata>({ width: 1280, height: 720 })
  const [currentTime, setCurrentTime] = useState(0)

  const [snapshots, setSnapshots] = useState<TimelineSnapshot[]>([]
  )
  const [bubbles, setBubbles] = useState<Bubble[]>([])
  const [selectedBubbleId, setSelectedBubbleId] = useState<string | null>(null)
  const [dragState, setDragState] = useState<DragState | null>(null)
  const [viewportSize, setViewportSize] = useState({ width: 1, height: 1 })
  const [savedVideoHandle, setSavedVideoHandle] = useState<PersistedVideoHandle | null>(null)
  const [showLoadVideoModal, setShowLoadVideoModal] = useState(false)
  const [isLoadingSavedVideo, setIsLoadingSavedVideo] = useState(false)
  const [savedVideoError, setSavedVideoError] = useState<string | null>(null)
  const [panels, setPanels] = useState<PanelRecord[]>([])
  const [activePanelId, setActivePanelId] = useState<string | null>(null)
  const [panelThumbnailUrls, setPanelThumbnailUrls] = useState<Record<string, string>>({})
  const [editorOverlayUrl, setEditorOverlayUrl] = useState<string | null>(null)

  const bubblesRef = useRef<Bubble[]>(bubbles)
  const panelThumbnailUrlsRef = useRef<Record<string, string>>({})
  const editorOverlayUrlRef = useRef<string | null>(null)

  const selectedBubble = useMemo(
    () => bubbles.find((bubble) => bubble.id === selectedBubbleId) ?? null,
    [bubbles, selectedBubbleId],
  )

  const fitScale = useMemo(() => {
    const widthScale = viewportSize.width / videoMetadata.width
    const heightScale = viewportSize.height / videoMetadata.height
    const value = Math.min(widthScale, heightScale)
    return Number.isFinite(value) && value > 0 ? value : 1
  }, [videoMetadata.height, videoMetadata.width, viewportSize.height, viewportSize.width])

  const fittedWidth = videoMetadata.width * fitScale
  const fittedHeight = videoMetadata.height * fitScale
  const baseOffsetX = (viewportSize.width - fittedWidth) / 2
  const baseOffsetY = (viewportSize.height - fittedHeight) / 2

  useEffect(() => {
    const restored = safeParsePersistedState(localStorage.getItem(STORAGE_KEY))
    if (!restored) {
      return
    }

    setSnapshots(restored.snapshots)
    const initialState = getStateAtTime(restored.snapshots, 0)
    setBubbles(initialState.bubbles)
  }, [])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const payload: PersistedState = {
        version: 1,
        snapshots,
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
    }, 200)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [snapshots])

  useEffect(() => {
    if (videoUrl) {
      console.log('[videoUrl effect] Video URL changed, attempting to load video')
    }
    return () => {
      if (videoUrl) {
        console.log('[videoUrl cleanup] Cleaning up video URL')
        URL.revokeObjectURL(videoUrl)
      }
    }
  }, [videoUrl])

  useEffect(() => {
    bubblesRef.current = bubbles
  }, [bubbles])

  useEffect(() => {
    console.log('[currentTime effect] currentTime state changed to:', currentTime)
    const video = videoRef.current
    if (!video) {
      console.log('[currentTime effect] Video element not available yet')
      return
    }

    // Only seek if the video is paused (avoid interfering with playback)
    if (video.paused) {
      console.log('[currentTime effect] Video is paused. Seeking to:', currentTime)
      video.currentTime = currentTime
    } else {
      console.log('[currentTime effect] Video is playing. Skipping seek.')
    }
  }, [currentTime])

  useEffect(() => {
    panelThumbnailUrlsRef.current = panelThumbnailUrls
  }, [panelThumbnailUrls])

  useEffect(() => {
    return () => {
      Object.values(panelThumbnailUrlsRef.current).forEach((url) => {
        URL.revokeObjectURL(url)
      })
      if (editorOverlayUrlRef.current) {
        URL.revokeObjectURL(editorOverlayUrlRef.current)
      }
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    renderPanelRasterBlob({
      bubbles,
      width: videoMetadata.width,
      height: videoMetadata.height,
      transparent: true,
    }).then((blob) => {
      if (cancelled || !blob) {
        return
      }

      const url = URL.createObjectURL(blob)
      if (editorOverlayUrlRef.current) {
        URL.revokeObjectURL(editorOverlayUrlRef.current)
      }
      editorOverlayUrlRef.current = url
      setEditorOverlayUrl(url)
    })

    return () => {
      cancelled = true
    }
  }, [bubbles, videoMetadata.width, videoMetadata.height])

  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) {
      return
    }

    const updateViewportSize = () => {
      setViewportSize({
        width: Math.max(1, viewport.clientWidth),
        height: Math.max(1, viewport.clientHeight),
      })
    }

    updateViewportSize()
    const observer = new ResizeObserver(updateViewportSize)
    observer.observe(viewport)

    return () => {
      observer.disconnect()
    }
  }, [videoUrl])

  useEffect(() => {
    async function loadSavedHandle() {
      if (!('indexedDB' in window)) {
        return
      }

      try {
        const handle = await getCurrentVideoHandle()
        if (!handle) {
          return
        }

        const permission = await handle.queryPermission({ mode: 'read' })

        if (permission === 'granted') {
          const file = await handle.getFile()
          setVideoFromFile(file)
          setSavedVideoHandle(handle)
          setShowLoadVideoModal(false)
          return
        }

        if (permission === 'prompt') {
          setSavedVideoHandle(handle)
          setShowLoadVideoModal(true)
          return
        }

        setSavedVideoHandle(null)
        setShowLoadVideoModal(false)
      } catch (error) {
        console.error('Failed to load saved video handle:', error)
        // Ignore restore failures and keep manual file selection available.
      }
    }

    loadSavedHandle()
  }, [])

  useEffect(() => {
    let cancelled = false

    async function loadPanels() {
      console.log('[loadPanels] Starting to load panels from IndexedDB')
      try {
        const results = await listPanelsByCreatedAtAsc()
        console.log('[loadPanels] Loaded panels:', results)
        if (!cancelled) {
          if (results.length === 0) {
            console.log('[loadPanels] No panels found, creating default')
            const defaultPanel = createPanelRecord(0, [])
            setPanels([defaultPanel])
            setActivePanelId(defaultPanel.id)
            applyPanelToEditor(defaultPanel)
            upsertPanel(defaultPanel).catch(() => {
              // Keep the editor usable even if default panel persistence fails.
            })
            return
          }

          console.log('[loadPanels] Setting first panel as active and applying to editor')
          setPanels(results)
          setActivePanelId(results[0].id)
          applyPanelToEditor(results[0])
        }
      } catch (error) {
        console.error('[loadPanels] Error loading panels:', error)
        if (!cancelled) {
          const fallbackPanel = createPanelRecord(0, [])
          setPanels([fallbackPanel])
          setActivePanelId(fallbackPanel.id)
          applyPanelToEditor(fallbackPanel)
        }
      }
    }

    loadPanels()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function hydratePanelThumbnails() {
      const panelIds = panels.map((panel) => panel.id)
      if (panelIds.length === 0) {
        setPanelThumbnailUrls((previous) => {
          Object.values(previous).forEach((url) => {
            URL.revokeObjectURL(url)
          })
          return {}
        })
        return
      }

      const rasterPairs = await Promise.all(
        panelIds.map(async (panelId) => {
          try {
            const raster = await getPanelRasterByPanelId(panelId)
            return [panelId, raster?.blob ?? null] as const
          } catch {
            return [panelId, null] as const
          }
        }),
      )

      if (cancelled) {
        return
      }

      setPanelThumbnailUrls((previous) => {
        const next: Record<string, string> = {}

        rasterPairs.forEach(([panelId, blob]) => {
          if (!blob) {
            return
          }

          const previousUrl = previous[panelId]
          if (previousUrl) {
            next[panelId] = previousUrl
            return
          }

          next[panelId] = URL.createObjectURL(blob)
        })

        Object.entries(previous).forEach(([panelId, url]) => {
          if (!next[panelId]) {
            URL.revokeObjectURL(url)
          }
        })

        return next
      })
    }

    hydratePanelThumbnails()

    return () => {
      cancelled = true
    }
  }, [panels])

  async function handleLoadSavedVideo() {
    if (!savedVideoHandle) {
      return
    }

    setIsLoadingSavedVideo(true)
    setSavedVideoError(null)

    try {
      let permission = await savedVideoHandle.queryPermission({ mode: 'read' })

      if (permission === 'prompt') {
        if (typeof savedVideoHandle.requestPermission === 'function') {
          permission = await savedVideoHandle.requestPermission({ mode: 'read' })
        } else {
          permission = 'denied'
        }
      }

      if (permission !== 'granted') {
        setSavedVideoError('Permission was not granted. Please allow access to load this video.')
        return
      }

      const file = await savedVideoHandle.getFile()
      setVideoFromFile(file)
      setShowLoadVideoModal(false)
      setSavedVideoError(null)
    } catch {
      setSavedVideoError('Could not load the saved video handle. Please use Open Video.')
    } finally {
      setIsLoadingSavedVideo(false)
    }
  }

  function setVideoFromFile(file: File) {
    console.log('[setVideoFromFile] Loading video file:', file.name)
    if (videoUrl) {
      URL.revokeObjectURL(videoUrl)
    }

    const nextUrl = URL.createObjectURL(file)
    console.log('[setVideoFromFile] Created video object URL')
    setVideoUrl(nextUrl)
    // Don't reset currentTime - let the active panel's timestamp be preserved
    // setCurrentTime(0)
  }

  async function captureAndPersistPanelRaster(panel: PanelRecord) {
    if (!videoRef.current) {
      return
    }

    const rasterBlob = await renderPanelRasterBlob({
      video: videoRef.current,
      bubbles: panel.bubbles,
      width: videoMetadata.width,
      height: videoMetadata.height,
      mimeType: 'image/webp',
      quality: 0.92,
    })

    if (!rasterBlob) {
      return
    }

    await upsertPanelRaster({
      panelId: panel.id,
      width: videoMetadata.width,
      height: videoMetadata.height,
      mimeType: rasterBlob.type || 'image/webp',
      blob: rasterBlob,
    })

    const nextUrl = URL.createObjectURL(rasterBlob)
    setPanelThumbnailUrls((previous) => {
      const existingUrl = previous[panel.id]
      if (existingUrl) {
        URL.revokeObjectURL(existingUrl)
      }

      return {
        ...previous,
        [panel.id]: nextUrl,
      }
    })
  }

  function createPanelId() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return `panel-${crypto.randomUUID()}`
    }

    return `panel-${Date.now()}-${Math.floor(Math.random() * 1000)}`
  }

  function createPanelRecord(
    timestamp: number,
    nextBubbles: Bubble[],
  ): PanelRecord {
    const now = Date.now()
    return {
      id: createPanelId(),
      timestamp,
      bubbles: nextBubbles.map((bubble) => cloneBubble(bubble)),
      createdAt: now,
    }
  }

  function applyPanelToEditor(panel: PanelRecord) {
    console.log('[applyPanelToEditor] Called with panel timestamp:', panel.timestamp, 'panel ID:', panel.id)
    console.log('[applyPanelToEditor] Video element ref:', videoRef.current, 'Video readyState:', videoRef.current?.readyState, 'Video currentTime:', videoRef.current?.currentTime)
    pendingSeekTimeRef.current = panel.timestamp
    console.log('[applyPanelToEditor] Set pendingSeekTimeRef to:', panel.timestamp)
    setCurrentTime(panel.timestamp)
    setBubbles(panel.bubbles.map((bubble) => cloneBubble(bubble)))
    setSelectedBubbleId(null)
  }

  function updateActivePanel(nextTimestamp: number, nextBubbles: Bubble[]) {
    if (!activePanelId) {
      return
    }

    setPanels((previous) => {
      const existing = previous.find((panel) => panel.id === activePanelId)
      if (!existing) {
        return previous
      }

      const updated: PanelRecord = {
        ...existing,
        timestamp: nextTimestamp,
        bubbles: nextBubbles.map((bubble) => cloneBubble(bubble)),
      }

      upsertPanel(updated).catch(() => {
        // Keep UI responsive even if IndexedDB write fails.
      })

      captureAndPersistPanelRaster(updated).catch(() => {
        // Raster generation should never block panel updates.
      })

      const withoutExisting = previous.filter((panel) => panel.id !== existing.id)
      return [...withoutExisting, updated].sort((a, b) => a.createdAt - b.createdAt)
    })
  }

  function commitSnapshot(nextBubbles: Bubble[]) {
    updateActivePanel(currentTime, nextBubbles)
    setSnapshots((previous) =>
      upsertSnapshot(previous, currentTime, nextBubbles),
    )
  }

  function resolveTime(timestamp: number) {
    setCurrentTime(timestamp)
    updateActivePanel(timestamp, bubblesRef.current)
  }

  function updateCurrentBubble(
    bubbleId: string,
    updater: (bubble: Bubble) => Bubble,
    shouldCommit = true,
  ) {
    setBubbles((previous) => {
      const next = previous.map((bubble) =>
        bubble.id === bubbleId ? updater(cloneBubble(bubble)) : bubble,
      )

      if (shouldCommit) {
        commitSnapshot(next)
      }

      return next
    })
  }

  function pointerToFrameCoordinates(clientX: number, clientY: number) {
    const viewport = viewportRef.current
    if (!viewport) {
      return { x: 0, y: 0 }
    }

    const viewportRect = viewport.getBoundingClientRect()
    const relativeX = clientX - viewportRect.left
    const relativeY = clientY - viewportRect.top

    const frameX = (relativeX - baseOffsetX) / fitScale
    const frameY = (relativeY - baseOffsetY) / fitScale

    return {
      x: clamp(frameX / videoMetadata.width, 0, 1),
      y: clamp(frameY / videoMetadata.height, 0, 1),
    }
  }

  async function handleOpenVideo() {
    if (typeof window.showOpenFilePicker !== 'function') {
      return
    }

    try {
      const [selected] = await window.showOpenFilePicker({
        types: [
          {
            description: 'Video',
            accept: {
              'video/*': ['.mp4', '.mkv', '.mov'],
            },
          },
        ],
      })

      if (!selected || typeof selected !== 'object') {
        return
      }

      const handle = selected as {
        getFile: () => Promise<File>
      }

      if (typeof handle.getFile !== 'function') {
        return
      }

      const file = await handle.getFile()
      setVideoFromFile(file)

      if ('indexedDB' in window) {
        await saveCurrentVideoHandle(selected)
      }

      setSavedVideoHandle(handle as PersistedVideoHandle)
      setShowLoadVideoModal(false)
      setSavedVideoError(null)
    } catch {
      // Ignore cancellation and keep the app interactive.
    }
  }

  function handleTimelineSync() {
    const node = videoRef.current
    if (!node) {
      console.log('[handleTimelineSync] Video element not available')
      return
    }

    console.log('[handleTimelineSync] Syncing video.currentTime:', node.currentTime, 'to currentTime state')
    resolveTime(node.currentTime)
  }

  function handleAddBubble() {
    const bubble: Bubble = {
      id: generateBubbleId(),
      left: 0.36,
      top: 0.26,
      right: 0.62,
      bottom: 0.42,
      tailX: 0.52,
      tailY: 0.5,
      text: '',
    }

    const next = [...bubbles, bubble]
    setBubbles(next)
    setSelectedBubbleId(bubble.id)
    commitSnapshot(next)
  }

  function handleDeleteSelectedBubble() {
    if (!selectedBubbleId) {
      return
    }

    const next = bubbles.filter((bubble) => bubble.id !== selectedBubbleId)
    setBubbles(next)
    setSelectedBubbleId(null)
    commitSnapshot(next)
  }

  function startMoveBubble(event: React.PointerEvent<HTMLDivElement>, bubble: Bubble) {
    event.stopPropagation()
    const point = pointerToFrameCoordinates(event.clientX, event.clientY)
    setSelectedBubbleId(bubble.id)
    setDragState({
      mode: 'move',
      bubbleId: bubble.id,
      startNormX: point.x,
      startNormY: point.y,
      startBubble: cloneBubble(bubble),
    })
  }

  function startResizeBubble(event: React.PointerEvent<HTMLButtonElement>, bubble: Bubble) {
    event.stopPropagation()
    setSelectedBubbleId(bubble.id)
    setDragState({
      mode: 'resize',
      bubbleId: bubble.id,
      minWidth: 0.06,
      minHeight: 0.06,
      startBubble: cloneBubble(bubble),
    })
  }

  function startTailDrag(event: React.PointerEvent<HTMLButtonElement>, bubble: Bubble) {
    event.stopPropagation()
    setSelectedBubbleId(bubble.id)
    setDragState({
      mode: 'tail',
      bubbleId: bubble.id,
    })
  }

  useEffect(() => {
    if (!dragState) {
      return
    }

    const activeDragState = dragState

    function handlePointerMove(event: PointerEvent) {
      if (activeDragState.mode === 'tail') {
        const point = pointerToFrameCoordinates(event.clientX, event.clientY)
        updateCurrentBubble(
          activeDragState.bubbleId,
          (bubble) => ({
            ...bubble,
            tailX: point.x,
            tailY: point.y,
          }),
          false,
        )
        return
      }

      if (activeDragState.mode === 'move') {
        const point = pointerToFrameCoordinates(event.clientX, event.clientY)
        const deltaX = point.x - activeDragState.startNormX
        const deltaY = point.y - activeDragState.startNormY
        const width = activeDragState.startBubble.right - activeDragState.startBubble.left
        const height = activeDragState.startBubble.bottom - activeDragState.startBubble.top

        const left = clamp(activeDragState.startBubble.left + deltaX, 0, 1 - width)
        const top = clamp(activeDragState.startBubble.top + deltaY, 0, 1 - height)

        updateCurrentBubble(
          activeDragState.bubbleId,
          (bubble) => ({
            ...bubble,
            left,
            top,
            right: left + width,
            bottom: top + height,
            tailX: clamp(activeDragState.startBubble.tailX + deltaX, 0, 1),
            tailY: clamp(activeDragState.startBubble.tailY + deltaY, 0, 1),
          }),
          false,
        )
        return
      }

      if (activeDragState.mode === 'resize') {
        const point = pointerToFrameCoordinates(event.clientX, event.clientY)
        updateCurrentBubble(
          activeDragState.bubbleId,
          (bubble) => ({
            ...bubble,
            right: clamp(point.x, activeDragState.startBubble.left + activeDragState.minWidth, 1),
            bottom: clamp(point.y, activeDragState.startBubble.top + activeDragState.minHeight, 1),
          }),
          false,
        )
      }
    }

    function handlePointerUp() {
      commitSnapshot(bubblesRef.current)
      setDragState(null)
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }
  }, [bubbles, dragState])

  function handleOpenPanel(panel: PanelRecord) {
    setActivePanelId(panel.id)
    applyPanelToEditor(panel)

    if (videoRef.current) {
      videoRef.current.currentTime = panel.timestamp
    }
  }

  function handleCreateNewPanel() {
    const panel = createPanelRecord(currentTime, [])
    setPanels((previous) => [...previous, panel].sort((a, b) => a.createdAt - b.createdAt))
    setActivePanelId(panel.id)
    setBubbles([])
    setSelectedBubbleId(null)

    upsertPanel(panel).catch(() => {
      // Keep UI responsive even if IndexedDB write fails.
    })

    captureAndPersistPanelRaster(panel).catch(() => {
      // Raster generation should never block panel creation.
    })
  }

  function handleDeletePanel(panelId: string) {
    setPanels((previous) => {
      const remaining = previous.filter((panel) => panel.id !== panelId)
      if (remaining.length > 0) {
        if (activePanelId === panelId) {
          const nextActive = remaining[0]
          setActivePanelId(nextActive.id)
          applyPanelToEditor(nextActive)
          if (videoRef.current) {
            videoRef.current.currentTime = nextActive.timestamp
          }
        }

        return remaining
      }

      const fallback = createPanelRecord(0, [])
      setActivePanelId(fallback.id)
      applyPanelToEditor(fallback)
      if (videoRef.current) {
        videoRef.current.currentTime = fallback.timestamp
      }

      upsertPanel(fallback).catch(() => {
        // Fallback persistence should not block UI.
      })

      return [fallback]
    })

    deletePanelById(panelId).catch(() => {
      // Deletion failure should not block editing.
    })

    deletePanelRasterByPanelId(panelId).catch(() => {
      // Raster cleanup failure should not block editing.
    })

    setPanelThumbnailUrls((previous) => {
      const next = { ...previous }
      const existingUrl = next[panelId]
      if (existingUrl) {
        URL.revokeObjectURL(existingUrl)
      }
      delete next[panelId]
      return next
    })
  }

  return (
    <main className="app-shell">
      <section
        className="editor"
      >

        {videoUrl && (
          <div className="workspace-grid">
            <WorkspaceCanvas
              videoRef={videoRef}
              viewportRef={viewportRef}
              videoUrl={videoUrl}
              panelRasterUrl={editorOverlayUrl}
              currentTime={currentTime}
              bubbles={bubbles}
              selectedBubbleId={selectedBubbleId}
              videoMetadata={videoMetadata}
              fitScale={fitScale}
              baseOffsetX={baseOffsetX}
              baseOffsetY={baseOffsetY}
              onTimelineSync={handleTimelineSync}
              onLoadedMetadata={(event) => {
                const node = event.currentTarget
                const width = Math.max(1, node.videoWidth)
                const height = Math.max(1, node.videoHeight)
                console.log('[onLoadedMetadata] Video metadata loaded. Width:', width, 'Height:', height)
                console.log('[onLoadedMetadata] Video readyState:', node.readyState, 'Video currentTime:', node.currentTime, 'Expected currentTime (state):', currentTime)
                console.log('[onLoadedMetadata] pendingSeekTimeRef:', pendingSeekTimeRef.current)

                // Apply pending seek if we have one
                if (pendingSeekTimeRef.current !== null) {
                  const targetTime = pendingSeekTimeRef.current
                  console.log('[onLoadedMetadata] Seeking to pendingSeekTime:', targetTime)
                  node.currentTime = targetTime
                  pendingSeekTimeRef.current = null
                }

                setVideoMetadata({ width, height })
              }}
              onSelectBubble={setSelectedBubbleId}
              onDeselectBubble={() => setSelectedBubbleId(null)}
              onStartMoveBubble={startMoveBubble}
              onStartResizeBubble={startResizeBubble}
              onStartTailDrag={startTailDrag}
            />

            <Sidebar
              selectedBubble={selectedBubble}
              onUpdateBubble={updateCurrentBubble}
              onDeleteSelectedBubble={handleDeleteSelectedBubble}
              onOpenVideo={handleOpenVideo}
              onAddBubble={handleAddBubble}
            />
          </div>
        )}
      </section>

      <section className="panel-library">
        <div className="panel-library-header">
          <h2>Panels</h2>
          <button type="button" onClick={handleCreateNewPanel}>
            New panel
          </button>
          {activePanelId && (
            <button type="button" onClick={() => handleDeletePanel(activePanelId)}>
              Delete panel
            </button>
          )}
        </div>
        {panels.length === 0 && <p>No panels yet.</p>}
        {panels.length > 0 && (
          <ul className="panel-list">
            {panels.map((panel) => (
              <li key={panel.id} className={panel.id === activePanelId ? 'active' : ''}>
                <button type="button" onClick={() => handleOpenPanel(panel)}>
                  <span className="panel-thumb-wrap">
                    {panelThumbnailUrls[panel.id] && (
                      <img
                        src={panelThumbnailUrls[panel.id]}
                        alt={`Panel at ${panel.timestamp.toFixed(2)} seconds`}
                        className="panel-thumb"
                      />
                    )}
                  </span>
                  <span>{panel.timestamp.toFixed(2)}s</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {showLoadVideoModal && savedVideoHandle && (
        <div className="load-video-modal-backdrop" role="dialog" aria-modal="true">
          <div className="load-video-modal">
            <h2>Saved Video Found</h2>
            <p>A previously selected video handle is available. Load video to continue where you left off.</p>
            {savedVideoError && <p className="load-video-error">{savedVideoError}</p>}
            <div className="load-video-actions">
              <button type="button" onClick={handleLoadSavedVideo} disabled={isLoadingSavedVideo}>
                {isLoadingSavedVideo ? 'Loading...' : 'Load video'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLoadVideoModal(false)
                  setSavedVideoError(null)
                }}
                disabled={isLoadingSavedVideo}
              >
                Not now
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

export default App
