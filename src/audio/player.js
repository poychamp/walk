// The one media element in the application lives here, and nothing outside src/audio/ ever
// touches it. That is the Layout rule in CLAUDE.md, and it is what makes the gesture rule and
// the no-timers rule checkable in one file instead of everywhere.
//
// ONE element, created once inside the Start tap, with its src swapped at each boundary. Do not
// turn this back into one element per part. That was tried and it failed on a real iPhone on
// 2026-09-07. All five were blessed during the gesture and all five played, but only part one
// was audible. iOS holds the audio output route on a single element and will not hand it to a
// different element while the page is backgrounded, so parts two to five ran with their
// timelines advancing and nothing reaching the speaker.
//
// Swapping src on the element that already holds the route means there is nothing to hand over.
// The parts stay separate files, so they stay reorderable and the system still sees five
// tracks rather than one long one.
//
// ⚠ Still unproven. Whether play() on a same-element src swap succeeds with the screen locked
// is a device question. It is a much better bet than a second element, and it is a bet.
//
// The cost of separate files is that nothing is buffered ahead, so each boundary is a cold
// fetch and there may be an audible gap before the next part starts.

export function createPlayer(createElement = () => new Audio()) {
  let element = null
  let parts = []
  let handlers = {}
  let index = -1
  let live = false

  // Attaching a handler is not the same as awaiting before the call. AbortError fires whenever
  // a load is interrupted, which a skip does on purpose.
  function guard(started) {
    if (started && typeof started.catch === 'function') {
      started.catch((error) => {
        if (error && error.name === 'AbortError') {
          return
        }
        console.warn('audio failed to start', error)
      })
    }
    return started
  }

  // Lock screen metadata, set per part so each one reads as its own track. Only the name, which
  // is data from sequence.js. Artist, album and artwork are copy and copy is his, so they are
  // left unset rather than invented.
  function describe(part) {
    if (!('mediaSession' in navigator) || typeof window.MediaMetadata !== 'function') {
      return
    }
    navigator.mediaSession.metadata = new window.MediaMetadata({ title: part.name })
  }

  function playAt(next) {
    if (!element || next < 0 || next >= parts.length) {
      return
    }

    index = next
    // A new src resets the element to the start on its own, so currentTime is left alone.
    element.src = parts[next].src
    guard(element.play())
    describe(parts[next])

    if (handlers.onPart) {
      handlers.onPart(next)
    }
  }

  function stop() {
    live = false
    index = -1
    if (!element) {
      return
    }
    element.pause()
    element.currentTime = 0
    // src is never set to '' and the attribute is never removed. An empty src resolves against
    // the document URL, so the element downloads index.html as audio and fires an error on a
    // walk that is already over.
  }

  return {
    // Synchronous from the first line to play(). No await, no .then before the call, no
    // nextTick, no timer. Safari revokes the gesture the moment the call stack unwinds, and
    // this one tap is what buys the audio route for the whole walk.
    start(segments, next = {}) {
      parts = segments
      handlers = next
      index = -1
      live = true

      if (!element) {
        element = createElement()
        element.preload = 'auto'

        element.addEventListener('ended', () => {
          // element.ended is false after a src swap, so a late ended from a part that was
          // skipped past cannot advance a second time.
          if (!live || !element.ended) {
            return
          }

          if (index >= parts.length - 1) {
            live = false
            index = -1
            if (handlers.onFinish) {
              handlers.onFinish()
            }
            return
          }

          playAt(index + 1)
        })

        if ('mediaSession' in navigator) {
          navigator.mediaSession.setActionHandler('play', () => guard(element.play()))
          navigator.mediaSession.setActionHandler('pause', () => element.pause())
        }
      }

      playAt(0)
    },

    // Skipping forward. Same element, so the route never moves. The walk does not need this.
    advance() {
      if (!live || index < 0 || index >= parts.length - 1) {
        return
      }
      playAt(index + 1)
    },

    stop,
  }
}

export const player = createPlayer()
