// The mornings count, as pure rules.
//
// Every function here takes the instant and the zone as arguments. Nothing in this file calls
// `new Date()` or `resolvedOptions()`, and nothing reads storage. `useMornings.js` is the one
// place that touches the environment and it hands the results down. FRD-005 FR-07.
//
// That split is not a style preference. It is the only reason a date line crossing, a clock set
// backwards and a daylight saving transition can be written as tests at all, because every one of
// them is just a different pair of arguments. FR-51.

import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc.js'
import timezone from 'dayjs/plugin/timezone.js'

// Extending at module scope is a side effect of importing this file and it is the documented way
// to use the plugins. FR-08.
dayjs.extend(utc)
dayjs.extend(timezone)

// One key, named here rather than in the composable, so each key sits with the module that owns
// its shape. `order.js` holds `walk:order` the same way. FR-06.
export const STORAGE_KEY = 'walk:mornings'

const SHAPE = /^\d{4}-\d{2}-\d{2}$/

// A calendar date in a named zone. Day.js delegates the zone to Intl, which reads the phone's
// live IANA database rather than a frozen copy bundled at build time. That is the reason it is
// here rather than moment-timezone. FR-09, R-59.
export function dayIn(at, zone) {
  return dayjs(at).tz(zone).format('YYYY-MM-DD')
}

// ⚠ The shape is not enough on its own. `2026-02-31` matches the regex and Date parsing rolls it
// forward to 3 March rather than refusing it, so the round trip is what rejects it. FR-10.
export function valid(date) {
  if (typeof date !== 'string' || !SHAPE.test(date)) {
    return false
  }

  return dayjs.utc(date).format('YYYY-MM-DD') === date
}

// The whole day boundary rule, in one function.
//
// It returns the day to use and the zone to store, because the caller has to persist the zone it
// settled on as well as the date. A base zone is adopted forward and never backwards, so flying
// east moves the day on and flying west does not take it back. FR-11, FR-12.
export function settle(at, base, current, floor) {
  const inCurrent = dayIn(at, current)

  // A tie adopts the current zone. Once the calendar has caught up there is nothing left for the
  // base to protect, and holding it would keep the app on a zone the phone left days ago.
  const zone = base === null || base === undefined || inCurrent >= dayIn(at, base) ? current : base

  const day = dayIn(at, zone)

  // The monotonic floor. A clock set backwards by hand is the only route here, and the history
  // going backwards would show as the count dropping, which is the one thing it must never do.
  if (typeof floor === 'string' && floor !== '' && day < floor) {
    return { day: floor, zone }
  }

  return { day, zone }
}

// Add a day. Never removes, never mutates, and idempotent for a day already present, which is
// what makes a second walk on the same morning count once. FR-13.
export function record(days, day) {
  if (days.includes(day)) {
    return days
  }

  return [...days, day].sort()
}

// Whatever came out of storage, made usable.
//
// ⚠ This is deliberately the opposite of `order.js`, which throws a bad value away whole. Losing
// a running order costs one drag. Losing a history costs months, and it would show as the count
// going down. So this keeps everything it can read and drops only what it cannot. FR-14.
export function repair(raw) {
  // A bare array reads as days with no zone. Nothing has ever written that shape, so this is not
  // a migration. It costs one line and means the shape can grow again without one.
  const source = Array.isArray(raw) ? { zone: null, days: raw } : raw

  const held = source !== null && typeof source === 'object' ? source : {}

  // The zone is not checked against the IANA list here. An unknown name throws inside dayjs.tz
  // rather than returning something wrong, and the composable is where that is caught. FR-15.
  const zone = typeof held.zone === 'string' && held.zone !== '' ? held.zone : null

  const days = Array.isArray(held.days) ? held.days : []

  return { zone, days: [...new Set(days.filter(valid))].sort() }
}

// The thirty day window, built for the view and never stored. Exactly `size` entries whatever the
// length of the history, ending on today. FR-16, FR-17.
//
// ⚠ The dates step in UTC on purpose. A calendar date has no timezone in the first place, and
// stepping one in a zone would meet daylight saving and give two entries the same date.
export function grid(days, today, size = 30) {
  const present = new Set(days)
  const last = dayjs.utc(today)

  return Array.from({ length: size }, (unused, index) => {
    const date = last.subtract(size - 1 - index, 'day').format('YYYY-MM-DD')

    // A day before the history began and a day missed inside it are both simply absent, so there
    // is no third state and no dot means anything other than walked or not. FR-18.
    return { date, filled: present.has(date) }
  })
}

// FR-19. Zero is plural.
export function label(count) {
  return count === 1 ? '1 morning' : `${count} mornings`
}
