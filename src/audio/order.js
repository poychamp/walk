// The running order, and the only file in the repo that touches localStorage.
//
// Everything here is a plain function taking `parts` as an argument. Nothing imports
// `sequence`, so every rule below is testable against a fabricated sequence of any shape and
// none of them learns the number five. FRD-004 FR-01, FR-11.
//
// There is no class and no manager. localStorage is the state, there is one key and one
// consumer, and an object wrapping that would hold nothing. FR-01.

// One key, named once. Namespaced on `walk`, which is already the app's neutral name in
// <title> and in the manifest short_name, so a second key later is `walk:something`.
// No version segment on purpose. A shape change is handled by read() rejecting the value and
// clearing it, not by a second key being introduced and the first one left behind. FR-02.
export const STORAGE_KEY = 'walk:order'

// A stored order is only usable if it is exactly this sequence, rearranged. Anything else is
// somebody else's data, an older shape, or corruption, and all three are the same answer.
// FR-04.
export function valid(parts, ids) {
  if (!Array.isArray(ids) || ids.length !== parts.length) {
    return false
  }

  const seen = new Set(ids)
  if (seen.size !== ids.length) {
    return false
  }

  return parts.every((part, index) => {
    if (!seen.has(part.id)) {
      return false
    }
    // A fixed part keeps its declared slot. One is always first and five is always last, and
    // that is data rather than a bounds check somewhere in the drag.
    return !part.fixed || ids[index] === part.id
  })
}

// localStorage throws rather than returning null in Safari private browsing and wherever site
// data is blocked. An uncaught throw here lands at module setup and takes the start screen down
// before it paints, so every access in this file is wrapped. FR-07.
function get() {
  try {
    return window.localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

function set(value) {
  try {
    window.localStorage.setItem(STORAGE_KEY, value)
  } catch {
    // Nothing to do and nothing to tell the user. The order still works for this session, it
    // just will not be there tomorrow.
  }
}

export function forget() {
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Same.
  }
}

// Read and validate. An absent key, unparseable JSON and a value that fails validation are all
// the same outcome to the caller, which is that there is no stored order. FR-05.
export function stored(parts) {
  const raw = get()
  if (raw === null) {
    return null
  }

  let ids = null
  try {
    ids = JSON.parse(raw)
  } catch {
    ids = null
  }

  if (!valid(parts, ids)) {
    // We read something and rejected it. Clear it rather than leave it to fail again on every
    // load for the rest of time. An absent key is never written to. FR-06.
    forget()
    return null
  }

  return ids
}

export function remember(ids) {
  set(JSON.stringify(ids))
}

// ids back to parts. Assumes valid() has already passed, and is never called on unvalidated
// input. FR-09.
export function apply(parts, ids) {
  return ids.map((id) => parts.find((part) => part.id === id))
}

// Reorder by operating on the movable subsequence only.
//
// The fixed parts are not in the list being reordered at all, so a fixed part cannot move and a
// movable part cannot land in a fixed slot. That is by construction rather than by a clamp,
// which is what makes it hold for a sequence with fixed parts anywhere rather than only at the
// ends. `from` and `to` are indexes into the movable subsequence, not into `parts`. FR-08.
export function move(parts, from, to) {
  const movable = parts.filter((part) => !part.fixed)

  if (from === to || from < 0 || to < 0 || from >= movable.length || to >= movable.length) {
    return parts
  }

  const [held] = movable.splice(from, 1)
  movable.splice(to, 0, held)

  let taken = 0
  return parts.map((part) => {
    if (part.fixed) {
      return part
    }
    const next = movable[taken]
    taken += 1
    return next
  })
}

// Two orders are the same walk. By id rather than by object identity, so it survives the arrays
// being rebuilt, which they are on every move. FR-10.
export function same(a, b) {
  return a.length === b.length && a.every((part, index) => part.id === b[index].id)
}
