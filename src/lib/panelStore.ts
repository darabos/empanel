import { openDB, type DBSchema } from 'idb'
import type { PanelRasterRecord, PanelRecord } from '../types/annotation'

const DB_NAME = 'video-annotator-db'
const DB_VERSION = 1
const PANEL_STORE = 'panels'
const PANEL_RASTER_STORE = 'panelRasters'

type PanelDb = DBSchema & {
  panels: {
    key: string
    value: PanelRecord
    indexes: {
      'by-timestamp': number
      'by-sortOrder': number
    }
  }
  panelRasters: {
    key: string
    value: PanelRasterRecord
  }
}

const panelDbPromise = openDB<PanelDb>(DB_NAME, DB_VERSION, {
  upgrade(database) {
    const panels = database.createObjectStore(PANEL_STORE, { keyPath: 'id' })
    panels.createIndex('by-timestamp', 'timestamp')
    panels.createIndex('by-sortOrder', 'sortOrder')

    database.createObjectStore(PANEL_RASTER_STORE, { keyPath: 'panelId' })
  },
})

export async function listPanelsByCreatedAtAsc() {
  const db = await panelDbPromise
  const results = await db.getAll(PANEL_STORE)
  return results.sort((a, b) => a.sortOrder - b.sortOrder)
}

export async function getPanelById(id: string) {
  const db = await panelDbPromise
  return db.get(PANEL_STORE, id)
}

export async function upsertPanel(panel: PanelRecord) {
  const db = await panelDbPromise
  await db.put(PANEL_STORE, panel)
}

export async function deletePanelById(id: string) {
  const db = await panelDbPromise
  await db.delete(PANEL_STORE, id)
}

export async function clearAllPanels() {
  const db = await panelDbPromise
  await db.clear(PANEL_STORE)
}

export async function getPanelRasterByPanelId(panelId: string) {
  const db = await panelDbPromise
  return db.get(PANEL_RASTER_STORE, panelId)
}

export async function upsertPanelRaster(raster: PanelRasterRecord) {
  const db = await panelDbPromise
  await db.put(PANEL_RASTER_STORE, raster)
}

export async function deletePanelRasterByPanelId(panelId: string) {
  const db = await panelDbPromise
  await db.delete(PANEL_RASTER_STORE, panelId)
}

export async function clearAllPanelRasters() {
  const db = await panelDbPromise
  await db.clear(PANEL_RASTER_STORE)
}
