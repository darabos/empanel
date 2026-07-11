import { openDB, type DBSchema } from 'idb'

const DB_NAME = 'video-handle-db'
const DB_VERSION = 1
const STORE_NAME = 'handles'
const CURRENT_VIDEO_KEY = 'currentVideo'

export type PersistedVideoHandle = {
  getFile: () => Promise<File>
  queryPermission: (descriptor: { mode: 'read' }) => Promise<PermissionState>
  requestPermission?: (descriptor: { mode: 'read' }) => Promise<PermissionState>
}

type HandleDb = DBSchema & {
  handles: {
    key: string
    value: unknown
  }
}

const handleDbPromise = openDB<HandleDb>(DB_NAME, DB_VERSION, {
  upgrade(database) {
    if (!database.objectStoreNames.contains(STORE_NAME)) {
      database.createObjectStore(STORE_NAME)
    }
  },
})

export async function saveCurrentVideoHandle(handle: unknown) {
  const database = await handleDbPromise
  await database.put(STORE_NAME, handle, CURRENT_VIDEO_KEY)
}

export async function getCurrentVideoHandle(): Promise<PersistedVideoHandle | null> {
  const database = await handleDbPromise
  const value = await database.get(STORE_NAME, CURRENT_VIDEO_KEY)

  if (!value || typeof value !== 'object') {
    return null
  }

  const maybeHandle = value as Partial<PersistedVideoHandle>
  if (typeof maybeHandle.getFile !== 'function' || typeof maybeHandle.queryPermission !== 'function') {
    return null
  }

  return maybeHandle as PersistedVideoHandle
}

export async function clearCurrentVideoHandle() {
  const database = await handleDbPromise
  await database.delete(STORE_NAME, CURRENT_VIDEO_KEY)
}
