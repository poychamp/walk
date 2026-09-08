import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { move, same } from '../audio/order.js'

// The drag, and the quiet period that follows it.
//
// This file knows about rows, pixels and a delay. It holds no media element, imports nothing
// that touches one, and never reads or writes storage. It reports one thing, a settled order,
// and its caller decides what that means. FRD-004 FR-29.
//
// ⚠ The DOM never reorders. Rows render in the sequence's declared order and stay there for the
// life of the page, and a row's position comes from a translateY of its slot in the running
// order minus its declared index. Reordering changes transforms and nothing else.
//
// That is deliberate and it is against the obvious version, which renders the running order and
// lets Vue move the nodes. The obvious version has a seam. On release the dragged row sits
// between two slots, and the moment the array updates it jumps to its new slot with no way to
// animate out of a transform that was just cleared. Working around that means easing the
// transform first and swapping the array on `transitionend`, which does not fire when the drag
// ended exactly on a slot boundary and so needs a fallback. Holding the DOM still deletes the
// whole problem, and every row animates the same way because moving is the only thing that ever
// happens. It costs one thing, which is that DOM order stops matching visual order. FRD-004
// risk 12.

export function useReorder({ parts, order, rowHeight, quietMs, onSettle }) {
  // The order as the screen currently shows it. Equal to the caller's order except during a
  // drag, when it runs ahead so the gap is always where the drop will land.
  const working = ref(order())

  // Declared index of the row under the finger, or -1.
  const dragging = ref(-1)

  // Raw pointer delta in Y. The dragged row follows the finger one to one.
  const delta = ref(0)

  // The settle transition is off until the first touch, so a stored order places its rows on
  // load without sliding them into position. FR-22.
  const settling = ref(false)

  // Which slots a movable part may occupy. Constant, because a fixed part keeps its declared
  // slot and both valid() and move() enforce that, so this never has to be recomputed.
  const movableSlots = parts.reduce((slots, part, index) => {
    if (!part.fixed) {
      slots.push(index)
    }
    return slots
  }, [])

  let pointerId = null
  let startY = 0
  let startSlot = 0
  let fromMovable = -1
  let base = null
  let timer = null
  let pending = null

  // The caller owns the order. Track it whenever it changes from outside, but never mid drag,
  // where `working` is the one running ahead.
  watch(order, (next) => {
    if (dragging.value < 0) {
      working.value = next
    }
  })

  function slotOf(index) {
    const id = parts[index].id
    return working.value.findIndex((part) => part.id === id)
  }

  // Pixels to translate a row from where the DOM put it to where the running order wants it.
  // The dragged row is the exception. It hangs off its slot at drag start plus the raw delta,
  // rather than off its current slot, or it would fight the finger every time it passes a
  // neighbour. FR-18.
  function offsetOf(index) {
    if (index === dragging.value) {
      return (startSlot - index) * rowHeight + delta.value
    }
    return (slotOf(index) - index) * rowHeight
  }

  // Every row settles except the one being dragged, which has to keep up with the finger. On
  // release dragging is -1, so the dropped row eases into its slot with the rest. FR-21.
  function easing(index) {
    return settling.value && index !== dragging.value
  }

  // A slot the drag can actually land in. Nearest rather than clamped, so it still behaves if a
  // sequence ever declares a fixed part somewhere other than the ends.
  function nearestMovable(slot) {
    return movableSlots.reduce((best, candidate) =>
      Math.abs(candidate - slot) < Math.abs(best - slot) ? candidate : best,
    )
  }

  function schedule(next) {
    pending = next
    if (timer) {
      clearTimeout(timer)
    }
    timer = setTimeout(commit, quietMs)
  }

  function commit() {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
    if (!pending) {
      return
    }
    const next = pending
    pending = null
    onSettle(next)
  }

  // ⚠ A pending quiet period does not survive the page being hidden. Background throttling can
  // stretch or drop the timer, and the app would come back with the list showing one order and
  // the audio holding another. So a hide commits rather than waits. FR-28.
  function flush() {
    commit()
  }

  function onPointerDown(event, index) {
    if (parts[index].fixed || dragging.value >= 0) {
      return
    }

    const slot = slotOf(index)
    const at = movableSlots.indexOf(slot)
    if (at < 0) {
      return
    }

    base = working.value
    startSlot = slot
    fromMovable = at
    pointerId = event.pointerId
    startY = event.clientY
    delta.value = 0
    dragging.value = index
    settling.value = true

    // Capture on the row, so a finger that slides outside the list keeps delivering moves and
    // the release is always received. FR-16.
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function onPointerMove(event) {
    if (dragging.value < 0 || event.pointerId !== pointerId) {
      return
    }

    delta.value = event.clientY - startY

    // Where the middle of the dragged row is, in slots. FR-19.
    const centre = startSlot * rowHeight + delta.value + rowHeight / 2
    const target = nearestMovable(Math.floor(centre / rowHeight))
    const next = move(base, fromMovable, movableSlots.indexOf(target))

    if (!same(next, working.value)) {
      working.value = next
    }
  }

  function release() {
    dragging.value = -1
    delta.value = 0
    pointerId = null
  }

  function onPointerUp(event) {
    if (dragging.value < 0 || event.pointerId !== pointerId) {
      return
    }

    const next = working.value
    const from = base
    release()

    // A drag that ended where it started rebuilds nothing, writes nothing, and never darkens
    // the button. FR-25.
    if (!same(next, from)) {
      schedule(next)
    }
  }

  // iOS takes gestures for its own reasons, an incoming call among them. Finishing a reorder the
  // user did not complete is worse than dropping it, so this reverts and commits nothing. FR-24.
  function onPointerCancel(event) {
    if (dragging.value < 0 || event.pointerId !== pointerId) {
      return
    }
    working.value = base
    release()
  }

  function onHide() {
    if (document.hidden) {
      flush()
    }
  }

  onMounted(() => {
    window.addEventListener('pagehide', flush)
    document.addEventListener('visibilitychange', onHide)
  })

  onBeforeUnmount(() => {
    window.removeEventListener('pagehide', flush)
    document.removeEventListener('visibilitychange', onHide)
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
  })

  return {
    working,
    dragging,
    settling,
    offsetOf,
    easing,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    flush,
  }
}
