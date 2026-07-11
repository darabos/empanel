import { openDB, type DBSchema } from 'idb'
import type { PanelRecord } from '../types/annotation'

const DB_NAME = 'video-annotator-db'
const DB_VERSION = 2
const PANEL_STORE = 'panels'

type PanelDb = DBSchema & {
  panels: {
    key: string
    value: PanelRecord
    indexes: {
      'by-updatedAt': number
      'by-timestamp': number
    }
  }
}

const panelDbPromise = openDB<PanelDb>(DB_NAME, DB_VERSION, {
  upgrade(database) {
    if (!database.objectStoreNames.contains(PANEL_STORE)) {
      const panels = database.createObjectStore(PANEL_STORE, { keyPath: 'id' })
      panels.createIndex('by-updatedAt', 'updatedAt')
      panels.createIndex('by-timestamp', 'timestamp')
    }
  },
})

export async function listPanelsByUpdatedAtDesc() {
  const db = await panelDbPromise
  const tx = db.transaction(PANEL_STORE, 'readonly')
  const index = tx.store.index('by-updatedAt')
  const results = await index.getAll()
  await tx.done
  return results.sort((a, b) => b.updatedAt - a.updatedAt)
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
