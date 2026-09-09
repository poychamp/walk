// Where a control lands. Every rule in this slice that can be written without an element.
//
// Each function takes the boundary table and a position and returns a time in seconds. Nothing
// here holds a media element, reads `currentTime`, touches `mediaSession`, or knows how many
// parts a walk has. That is the same split `order.js` and `mornings.js` already use, and it is
// the reason nine of the sixteen acceptance criteria are answerable without a phone.
// FRD-006 FR-01, FR-05.
//
// `parts` is the table `prepare()` builds, so every entry carries `startsAt` and `duration` and
// the array is already in the running order. There is no lookup by id and no second notion of
// order anywhere in this file. FR-05.

// True for a table we can reason about at all. A press can arrive at a strange moment and must
// never throw its way up into a lock screen handler. FR-09.
function usable(parts) {
  return Array.isArray(parts) && parts.length > 0
}

// Next. `null` means the press means nothing, which is the last part and nowhere else.
// FR-02, FR-08 in PRD terms R-05 and R-08.
export function nextAt(parts, index) {
  if (!usable(parts) || !Number.isInteger(index) || index < 0 || index >= parts.length - 1) {
    return null
  }

  return parts[index + 1].startsAt
}

// Previous. Always a real move, which is why it never returns null. On the first part it goes to
// the start of the walk rather than refusing. FR-03.
//
// ⚠ It never restarts the current part. From four minutes into part three this returns the start
// of part two, not the start of part three. Most players do the opposite, sending previous to the
// start of what is playing and only going back a track on a second quick press. His call,
// 2026-09-09, PRD-006 open question 2. Do not "fix" it into the familiar version. FR-04.
export function backAt(parts, index) {
  if (!usable(parts) || !Number.isInteger(index) || index <= 0 || index > parts.length - 1) {
    return 0
  }

  return parts[index - 1].startsAt
}
