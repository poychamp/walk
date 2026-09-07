// Every media element in the application lives here, and nothing outside src/audio/ ever
// touches one. That is the Layout rule in CLAUDE.md, and it is what makes the gesture rule and
// the no-timers rule checkable in one file instead of everywhere.
//
// One element per part, not one shared element with a swapped src. TASK-004. Two reasons, and
// both are about the phone.
//
// Safari attaches playback permission to an element during a user gesture. Building all five
// inside the Start tap and touching play() on each one blesses all five at once, so a boundary
// that arrives twenty minutes later with the screen locked only has to call play() on an
// element that is already allowed to play. Nothing has to earn permission while backgrounded,
// which is the thing most likely to have moved between iOS versions.
//
// It is also the preload. iOS has historically ignored preload="auto" to save cellular data,
// and the one thing it does not ignore is an actual play() call. So the unlock loop and the
// buffering are the same operation, and by the time part one ends the rest are already loaded.
// That is what makes the handover audibly seamless rather than a fetch with a gap in front of
// it.

export function createPlayer(createElement = () => new Audio()) {
  let elements = []
  let index = -1
  let handlers = {}

  // Attaching a handler is not the same as awaiting before the call. AbortError fires whenever
  // a load is interrupted, which the unlock loop below does deliberately on every element, so
  // it is the normal case here rather than a fault.
  function guard(started, src) {
    if (started && typeof started.catch === 'function') {
      started.catch((error) => {
        if (error && error.name === 'AbortError') {
          return
        }
        console.warn(`audio failed to start: ${src}`, error)
      })
    }
    return started
  }

  function playAt(next) {
    if (next < 0 || next >= elements.length) {
      return
    }

    if (index >= 0 && index !== next) {
      const current = elements[index]
      current.pause()
      current.currentTime = 0
    }

    index = next
    const el = elements[next]
    el.currentTime = 0
    guard(el.play(), el.src)

    if (handlers.onPart) {
      handlers.onPart(next)
    }
  }

  function stop() {
    index = -1
    elements.forEach((el) => {
      el.pause()
      el.currentTime = 0
      // src is never set to '' and the attribute is never removed. An empty src resolves
      // against the document URL, so the element downloads index.html as audio and fires an
      // error on a walk that is already over.
    })
  }

  return {
    // Synchronous from the first line through every play() call. No await, no .then before a
    // call, no nextTick, no timer. Safari revokes the gesture the moment the call stack
    // unwinds, and all five elements have to be blessed before that happens.
    start(segments, next = {}) {
      handlers = next

      if (!elements.length) {
        elements = segments.map((segment, i) => {
          const el = createElement()
          el.src = segment.src
          el.preload = 'auto'

          el.addEventListener('ended', () => {
            // An ended from anything that is not the current part is ignored. That is what
            // stops a tap and a natural boundary landing together and advancing twice.
            if (i !== index) {
              return
            }

            if (i === elements.length - 1) {
              stop()
              if (handlers.onFinish) {
                handlers.onFinish()
              }
              return
            }

            playAt(i + 1)
          })

          return el
        })
      }

      // The unlock. play() then pause() on every element, inside the gesture. This is what
      // buys permission for the four transitions that happen later with no tap behind them,
      // and it is what starts the download of all five.
      elements.forEach((el) => {
        guard(el.play(), el.src)
        el.pause()
        el.currentTime = 0
      })

      playAt(0)
    },

    // The tap on the walking screen. Optional by design, since the walk runs itself, and kept
    // so the screen copy stays true and a part can be skipped.
    advance() {
      if (index < 0 || index >= elements.length - 1) {
        return
      }
      playAt(index + 1)
    },

    stop,
  }
}

export const player = createPlayer()
