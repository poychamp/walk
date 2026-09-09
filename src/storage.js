// The only file in the repo that names localStorage.
//
// Three functions and a try / catch. FRD-004 gave this property to `order.js` when there was one
// key and one consumer, and there are two now, so the property moves rather than being abandoned.
// FRD-005 FR-01, FR-04. Supersedes FRD-004 FR-03.
//
// Strings only. JSON is the caller's business, because the two consumers store different shapes.
// And no key names live here, they stay with their owners. FR-06.

// localStorage throws rather than returning null in Safari private browsing and wherever site
// data is blocked. An uncaught throw lands at module setup and takes the start screen down before
// it paints, so every access below is wrapped. FR-01.

// An absent key and a blocked store are the same answer to the caller, which is that there is
// nothing there. It cannot tell them apart and does not need to. FR-02.
export function read(key) {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

// Nothing is returned and nothing is reported. A failed write means the order or the history is
// not there tomorrow, and there is nothing to tell the user about that. FR-03.
export function write(key, value) {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // Same.
  }
}

export function drop(key) {
  try {
    window.localStorage.removeItem(key)
  } catch {
    // Same.
  }
}
