const DB_NAME = 'video-annotator-db'
const DB_VERSION = 1
const STORE_NAME = 'handles'
const CURRENT_VIDEO_KEY = 'currentVideo'

export type PersistedVideoHandle = {
  getFile: () => Promise<File>
  queryPermission: (descriptor: { mode: 'read' }) => Promise<PermissionState>
  requestPermission?: (descriptor: { mode: 'read' }) => Promise<PermissionState>
}

function openHandleDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const database = request.result
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME)
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function saveCurrentVideoHandle(handle: unknown) {
  const database = await openHandleDb()

  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite')
    transaction.objectStore(STORE_NAME).put(handle, CURRENT_VIDEO_KEY)
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
    transaction.onabort = () => reject(transaction.error)
  })

  database.close()
}

export async function getCurrentVideoHandle(): Promise<PersistedVideoHandle | null> {
  const database = await openHandleDb()

  const value = await new Promise<unknown>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readonly')
    const request = transaction.objectStore(STORE_NAME).get(CURRENT_VIDEO_KEY)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })

  database.close()

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
  const database = await openHandleDb()

  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite')
    transaction.objectStore(STORE_NAME).delete(CURRENT_VIDEO_KEY)
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
    transaction.onabort = () => reject(transaction.error)
  })

  database.close()
}
