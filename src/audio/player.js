// The one media element in the application lives here, and nothing outside src/audio/ ever
// touches it. That is the Layout rule in CLAUDE.md, and it is what makes the gesture rule and
// the no-timers rule checkable in one file instead of everywhere.
//
// ⚠ ONE media resource for the whole walk, assembled before playback starts. Do not go back to
// playing the parts as separate files. That was tried twice on a real iPhone on 2026-09-07 and
// failed both times, the same way.
//
//   1. Five elements, all blessed inside the Start tap. Part one played. Parts two to five ran
//      with their timelines advancing and nothing reaching the speaker.
//   2. One element with its src swapped at each boundary. Identical result.
//
// The cause is not which element. iOS will not begin a NEW media resource while the page is
// backgrounded, and a src swap is a new resource. What survives a locked screen is a single
// resource that was already playing, which his own test confirmed when part one ran fine with
// the screen off.
//
// So the five files are fetched and their bytes concatenated into one Blob before anything
// plays. That is a byte copy, not a re-encode, and it works because the files are constant
// bitrate MP3 with the same sample rate and channel count and carry no ID3 or Xing headers to
// land mid-stream. Ordering is chosen at join time, which is how the walk stays reorderable
// while still being one resource to iOS.
//
// Position comes from the element's own playback time. Never a timer. Background throttling
// freezes JS timers once the screen locks, which is exactly when this is running, and a derived
// position self corrects on return where an accumulated one drifts.

// A tenth of a second of silence. Used only to take the audio route on the Start tap when the
// download has not finished yet, so the element is already playing when the real track is
// handed to it. It loops, so it never fires `ended`.
const PRIMER =
  'data:audio/mpeg;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//MQxAAAAANIAAAAAExBTUUzLjEwMFVVVVX/8xLEDQAAA0gAAAAAVVVVVVVVVVVVVVVVVVX/8xDEGwAAA0gAAAAAVVVVVVVVVVVVVVVVVf/zEMQoAAADSAAAAABVVVVVVVVVVVVVVVVV//MQxDUAAANIAAAAAFVVVVVVVVVVVVVVVVX/8xDEQgAAA0gAAAAAVVVVVVVVVVVVVVVVVQ=='

export function createPlayer(createElement = () => new Audio()) {
  let element = null
  let parts = []
  let handlers = {}
  let index = -1
  let live = false
  let ready = false
  let title = ''
  let waiting = false
  let url = null

  // Attaching a handler is not the same as awaiting before the call. AbortError fires whenever
  // a load is interrupted, which handing the element the real track does on purpose.
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

  // Lock screen metadata. One title for the whole walk, set once, because iOS sees one resource
  // and the phone is pocketed anyway. Artist, album and artwork are copy and copy is his, so
  // they are left unset rather than invented.
  function describe() {
    if (!title || !('mediaSession' in navigator) || typeof window.MediaMetadata !== 'function') {
      return
    }
    navigator.mediaSession.metadata = new window.MediaMetadata({ title })
  }

  function partAt(time) {
    let found = 0
    for (let i = 0; i < parts.length; i += 1) {
      if (time >= parts[i].startsAt) {
        found = i
      }
    }
    return found
  }

  function report(next) {
    if (!live || !ready || next === index) {
      return
    }
    index = next
    if (handlers.onPart) {
      handlers.onPart(next)
    }
  }

  function wire() {
    element = createElement()
    element.preload = 'auto'

    // The element is the clock. Every one of these re-derives the part from playback position
    // rather than counting transitions, so none of them can leave the screen showing a part the
    // audio is not on. There is no accumulated state to get out of step.
    const sync = () => {
      if (ready) {
        report(partAt(element.currentTime))
      }
    }

    // Fires roughly four times a second while playing. This is the one that catches a boundary
    // in the normal case.
    element.addEventListener('timeupdate', sync)

    // A seek. Skipping forward reports for itself, but a scrub from the lock screen or from
    // anywhere else does not, so this catches those.
    element.addEventListener('seeked', sync)

    // Resuming after a pause, from the lock screen or anywhere else.
    element.addEventListener('play', sync)

    // Coming back from a locked screen or another app. timeupdate is throttled or stopped while
    // backgrounded, so several boundaries can pass unseen. This corrects the screen on the frame
    // he looks at it rather than up to a quarter second later, and it corrects it even if
    // playback has stopped and no timeupdate is coming at all.
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        sync()
      }
    })

    element.addEventListener('ended', () => {
      // The primer loops, so an `ended` can only come from the real track.
      if (!live || !ready) {
        return
      }
      live = false
      index = -1
      if (handlers.onFinish) {
        handlers.onFinish()
      }
    })

    if ('mediaSession' in navigator) {
      navigator.mediaSession.setActionHandler('play', () => guard(element.play()))
      navigator.mediaSession.setActionHandler('pause', () => element.pause())
    }
  }

  function attach(objectUrl) {
    element.loop = false
    element.src = objectUrl
    ready = true

    if (waiting) {
      waiting = false
      guard(element.play())
      report(0)
    }
  }

  return {
    // Called on mount, not in a gesture. Fetching needs no user activation and the download
    // runs while the start screen is up rather than after the tap.
    async prepare(segments, name = '') {
      if (!element) {
        wire()
      }

      title = name
      describe()

      let at = 0
      parts = segments.map((part) => {
        const placed = { ...part, startsAt: at }
        at += part.duration
        return placed
      })

      const buffers = await Promise.all(
        segments.map((part) =>
          fetch(part.src).then((response) => {
            if (!response.ok) {
              throw new Error(`${response.status} for ${part.src}`)
            }
            return response.arrayBuffer()
          }),
        ),
      )

      if (url) {
        URL.revokeObjectURL(url)
      }
      url = URL.createObjectURL(new Blob(buffers, { type: 'audio/mpeg' }))
      attach(url)
    },

    // Synchronous from the first line to play(). No await, no .then before the call, no
    // nextTick, no timer. Safari revokes the gesture the moment the call stack unwinds, and
    // this one tap is what buys the audio route for the whole walk.
    start(next = {}) {
      if (!element) {
        wire()
      }

      handlers = next
      index = -1
      live = true

      if (ready) {
        element.currentTime = 0
        guard(element.play())
        report(0)
        return
      }

      // The join has not finished. Take the route now, on this gesture, with looping silence,
      // and hand the element the real track the moment it lands. Same element throughout, so
      // there is nothing to transfer.
      // ⚠ That handover is not a new gesture, so it needs the page in the foreground. Locking
      // the phone before the first sound will lose it.
      waiting = true
      element.loop = true
      element.src = PRIMER
      guard(element.play())
    },

    // Skipping forward. A seek inside the one resource, so the route never moves.
    advance() {
      if (!element || !ready || !live || index < 0 || index >= parts.length - 1) {
        return
      }
      element.currentTime = parts[index + 1].startsAt
      report(index + 1)
    },

    stop() {
      live = false
      waiting = false
      index = -1
      if (!element) {
        return
      }
      element.pause()
      element.currentTime = 0
      // src is never set to '' and the attribute is never removed. An empty src resolves
      // against the document URL, so the element downloads index.html as audio and fires an
      // error on a walk that is already over.
    },
  }
}

export const player = createPlayer()
