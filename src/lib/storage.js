/*
  Safe wrappers around Web Storage. Reads and writes can throw (private
  windows, blocked site data, a full quota), and a broken cache or a lost
  favourite should never crash the app, so every call is wrapped.
*/
export function readJSON(store, key, fallback) {
  try {
    const raw = store.getItem(key)
    return raw == null ? fallback : JSON.parse(raw)
  } catch {
    return fallback
  }
}

export function writeJSON(store, key, value) {
  try {
    store.setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

// Resolved lazily: touching window.localStorage itself can throw when storage is blocked.
export const local = {
  get: (key, fallback) => readJSON(safeStore('localStorage'), key, fallback),
  set: (key, value) => writeJSON(safeStore('localStorage'), key, value),
}

export const session = {
  get: (key, fallback) => readJSON(safeStore('sessionStorage'), key, fallback),
  set: (key, value) => writeJSON(safeStore('sessionStorage'), key, value),
}

const nullStore = { getItem: () => null, setItem: () => {} }

function safeStore(name) {
  try {
    return window[name] ?? nullStore
  } catch {
    return nullStore
  }
}
