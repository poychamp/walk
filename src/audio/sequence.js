// The sequence is data, not architecture. The count, the names and the order live here and
// nowhere else. Changing any of them is an edit to this file and to nothing else.
//
// The names are the guide's own and the shape is the guide's five part formula. CLAUDE.md
// Hard rule 1 says the repo stays generic and this is that rule overridden on his
// instruction, 2026-09-04. Nothing outside this file learned anything from it, so going back
// to generic names is an edit here and nowhere else.

// What the walk is called on the lock screen. His string, 2026-09-07. One title for the whole
// thing rather than a per part one, because the phone is pocketed and a title that only changes
// when our JS gets to run would be wrong more often than right.
export const title = 'The Perfect Walk'

// `fixed` means the part keeps its slot. Per the guide, one is always first and five is always
// last, and two, three and four may be taken in any order. That rule is data here rather than
// a comment, which is what makes ordered() below possible.
//
// `duration` is in seconds, frame exact, measured from each file's frame count at 1152 samples
// per frame and 44100 Hz. Not the size-based estimate ffprobe prints, which is short.
// ⚠ Re-encoding or replacing a file means remeasuring its duration here, or every part
// boundary after it drifts. These match the 64 kbps mono files, not the 320 kbps originals.
export const sequence = [
  { id: 'one', name: 'Opening Your Heart', src: '/audio/one.mp3', duration: 156.082, fixed: true },
  { id: 'two', name: 'Feeling Your Power', src: '/audio/two.mp3', duration: 465.842 },
  { id: 'three', name: 'Letting Go & Total Presence', src: '/audio/three.mp3', duration: 332.591 },
  { id: 'four', name: 'Connecting with Higher Power', src: '/audio/four.mp3', duration: 357.747 },
  { id: 'five', name: 'Celebrate & Raise Your Vibration', src: '/audio/five.mp3', duration: 278.491, fixed: true },
]

// One walk's running order. Fixed parts keep their slot, the rest are shuffled into what is
// left.
//
// ⚠ NOT IN USE. The declared order above is the order, his call 2026-09-07. This stays because
// joining the files at runtime makes any order free, so the reorder the guide allows costs one
// line in App.vue whenever it is wanted. Do not delete it and do not wire it up.
export function ordered(parts = sequence) {
  const slots = parts.map((part) => (part.fixed ? part : null))
  const movable = parts.filter((part) => !part.fixed)

  for (let i = movable.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    const held = movable[i]
    movable[i] = movable[j]
    movable[j] = held
  }

  let taken = 0
  return slots.map((slot) => {
    if (slot) {
      return slot
    }
    const part = movable[taken]
    taken += 1
    return part
  })
}
