import { computed, ref } from 'vue'
import * as storage from '../storage.js'
import { STORAGE_KEY, grid, label as plural, record as add, repair, settle } from '../mornings.js'

// The reactive wrapper, and the only file in this slice that reads the clock, the device timezone
// or storage. Everything it learns it hands to `mornings.js` as an argument. FRD-005 FR-20.
//
// The three options exist so a test supplies its own. The shipped call site passes none of them.

const deviceZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone

// Read once, at setup, before anything renders. FR-21.
function load(store) {
  let raw = null

  try {
    raw = store.read(STORAGE_KEY)
  } catch {
    // storage.js already swallows this, but the store is injectable and a caller's own may not.
    raw = null
  }

  let parsed = null

  try {
    parsed = raw === null ? null : JSON.parse(raw)
  } catch {
    parsed = null
  }

  return repair(parsed)
}

export function useMornings({ now = () => new Date(), zone = deviceZone, store = storage } = {}) {
  const held = load(store)

  // The base zone, or null until the first walk is recorded. FR-27.
  const base = ref(held.zone)
  const days = ref(held.days)

  // One place decides what day it is, so the grid and the count can never disagree about it.
  // `record()` and `dots` both come through here with the same inputs. FR-25.
  function today() {
    const at = now()
    const current = zone()

    // The floor is the last day already recorded. Sorted ascending, so it is the last entry.
    const floor = days.value.length > 0 ? days.value[days.value.length - 1] : null

    try {
      return settle(at, base.value, current, floor)
    } catch {
      // ⚠ A stored zone that no longer exists throws inside dayjs.tz. It is the only route here
      // and it must not take the start screen down, so the device's current zone wins. FR-22.
      return settle(at, null, current, floor)
    }
  }

  // Derived from the history rather than stored. A stored count is a second source of truth and
  // it drifts. FR-23.
  const count = computed(() => days.value.length)

  const label = computed(() => plural(count.value))

  // ⚠ Not reactive to time passing. Correct when the app opens and after a walk is recorded, and
  // it does not roll over at midnight while the app sits open. FRD-005 risk 6. FR-28.
  const dots = computed(() => grid(days.value, today().day))

  function record() {
    const settled = today()
    const next = add(days.value, settled.day)

    days.value = next
    base.value = settled.zone

    store.write(STORAGE_KEY, JSON.stringify({ zone: settled.zone, days: next }))
  }

  return { count, label, dots, record }
}
