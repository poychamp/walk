// The sequence is data, not architecture. The count, the names and the order live here and
// nowhere else. Changing any of them is an edit to this file and to nothing else.
//
// The committed default is deliberately not five segments. A five entry default would encode a
// particular walk's shape into the repo even with the names changed, and three proves the
// engine plays N of them.

export const sequence = [
  { id: 'one', name: 'Part One', src: '/audio/one.mp3' },
  { id: 'two', name: 'Part Two', src: '/audio/two.mp3' },
  { id: 'three', name: 'Part Three', src: '/audio/three.mp3' },
]
