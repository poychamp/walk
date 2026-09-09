import { describe, it, expect } from 'vitest'
import { dayIn, valid, settle, record, repair, grid, label } from '../src/mornings.js'
import { useMornings } from '../src/composables/useMornings.js'

// Real zones and real instants. Nothing is faked, because the pure module takes the instant and
// the zone as arguments and Intl resolves named zones in Node. FRD-005 FR-51.
const MANILA = 'Asia/Manila'          // UTC+8, no daylight saving
const KIRITIMATI = 'Pacific/Kiritimati' // UTC+14, the earliest zone there is
const NIUE = 'Pacific/Niue'           // UTC-11, 25 hours behind Kiritimati
const NEW_YORK = 'America/New_York'   // the only zone here that observes daylight saving

const at = (iso) => new Date(iso)

// Manila midnight is 16:00 UTC the day before.
const MANILA_2359 = at('2026-09-08T15:59:00Z')
const MANILA_0000 = at('2026-09-08T16:00:00Z')

// 23:30 in Manila on the 8th, which is already the 9th in Kiritimati.
const SPLIT = at('2026-09-08T15:30:00Z')

const store = (initial = null, { throws = false } = {}) => {
  let value = initial === null ? null : JSON.stringify(initial)
  return {
    read: () => {
      if (throws) throw new Error('site data blocked')
      return value
    },
    write: (key, next) => {
      value = next
    },
    drop: () => {
      value = null
    },
    peek: () => (value === null ? null : JSON.parse(value)),
  }
}

describe('mornings', () => {
  describe('dayIn', () => {
    it('gives the calendar date in the zone it is asked for', () => {
      expect(dayIn(SPLIT, MANILA)).toBe('2026-09-08')
    })

    it('gives different dates for the same instant in two zones', () => {
      expect(dayIn(SPLIT, MANILA)).toBe('2026-09-08')
      expect(dayIn(SPLIT, KIRITIMATI)).toBe('2026-09-09')
    })

    it('turns over at midnight in the zone, not at midnight UTC', () => {
      expect(dayIn(MANILA_2359, MANILA)).toBe('2026-09-08')
      expect(dayIn(MANILA_0000, MANILA)).toBe('2026-09-09')
    })

    it('does not move the date across a daylight saving transition', () => {
      // 01:30 EDT and 01:30 EST on the same morning, an hour apart in UTC.
      expect(dayIn(at('2026-11-01T05:30:00Z'), NEW_YORK)).toBe('2026-11-01')
      expect(dayIn(at('2026-11-01T06:30:00Z'), NEW_YORK)).toBe('2026-11-01')
    })

    it('handles the widest gap on the planet', () => {
      // Kiritimati is UTC+14 and Niue is UTC-11.
      expect(dayIn(SPLIT, KIRITIMATI)).toBe('2026-09-09')
      expect(dayIn(SPLIT, NIUE)).toBe('2026-09-08')
    })
  })

  describe('settle', () => {
    it('changes neither the day nor the zone when the device has not moved', () => {
      expect(settle(SPLIT, MANILA, MANILA, null)).toEqual({
        day: '2026-09-08',
        zone: MANILA,
      })
    })

    it('adopts the current zone when it is ahead of the base', () => {
      expect(settle(SPLIT, MANILA, KIRITIMATI, null)).toEqual({
        day: '2026-09-09',
        zone: KIRITIMATI,
      })
    })

    it('keeps the base zone when the current one is behind it', () => {
      // Flying west across the date line. The base holds and the day does not go back.
      expect(settle(SPLIT, KIRITIMATI, MANILA, null)).toEqual({
        day: '2026-09-09',
        zone: KIRITIMATI,
      })
    })

    it('adopts once the calendar has caught up', () => {
      // Same pair as above, later. Manila has reached the 9th, so the tie adopts.
      expect(settle(MANILA_0000, KIRITIMATI, MANILA, null)).toEqual({
        day: '2026-09-09',
        zone: MANILA,
      })
    })

    it('adopts the current zone when there is no base yet', () => {
      expect(settle(SPLIT, null, MANILA, null)).toEqual({
        day: '2026-09-08',
        zone: MANILA,
      })
    })

    it('holds the day at the floor when the clock has gone backwards', () => {
      expect(settle(SPLIT, MANILA, MANILA, '2026-09-10')).toEqual({
        day: '2026-09-10',
        zone: MANILA,
      })
    })

    it('ignores a floor that is already in the past', () => {
      expect(settle(SPLIT, MANILA, MANILA, '2026-09-01')).toEqual({
        day: '2026-09-08',
        zone: MANILA,
      })
    })
  })

  describe('record', () => {
    it('appends a day that is not there', () => {
      expect(record(['2026-09-07'], '2026-09-08')).toEqual(['2026-09-07', '2026-09-08'])
    })

    it('changes nothing when the day is already there', () => {
      expect(record(['2026-09-07', '2026-09-08'], '2026-09-08')).toEqual([
        '2026-09-07',
        '2026-09-08',
      ])
    })

    it('does not mutate what it was given', () => {
      const days = ['2026-09-07']
      record(days, '2026-09-08')
      expect(days).toEqual(['2026-09-07'])
    })

    it('does not care about a gap', () => {
      expect(record(['2026-01-01'], '2026-09-08')).toHaveLength(2)
    })

    it('keeps the result sorted', () => {
      expect(record(['2026-09-08'], '2026-09-01')).toEqual(['2026-09-01', '2026-09-08'])
    })
  })

  describe('repair', () => {
    it('leaves a well formed value alone', () => {
      expect(repair({ zone: MANILA, days: ['2026-09-07', '2026-09-08'] })).toEqual({
        zone: MANILA,
        days: ['2026-09-07', '2026-09-08'],
      })
    })

    it('drops what it cannot read and keeps the rest', () => {
      // This is the whole difference from order.js, which throws the entire value away.
      expect(repair({ zone: MANILA, days: ['2026-09-07', 'yesterday', '', '2026-09-08'] })).toEqual({
        zone: MANILA,
        days: ['2026-09-07', '2026-09-08'],
      })
    })

    it('yields an empty history rather than throwing when nothing is readable', () => {
      expect(repair({ zone: MANILA, days: ['nope', 42, null] })).toEqual({
        zone: MANILA,
        days: [],
      })
    })

    it('collapses duplicates', () => {
      expect(repair({ zone: MANILA, days: ['2026-09-08', '2026-09-08'] }).days).toEqual([
        '2026-09-08',
      ])
    })

    it('reads a bare array as days with no zone', () => {
      expect(repair(['2026-09-08'])).toEqual({ zone: null, days: ['2026-09-08'] })
    })

    it('yields an empty history for null', () => {
      expect(repair(null)).toEqual({ zone: null, days: [] })
    })

    it('rejects a date that does not exist', () => {
      // Date parsing rolls 2026-02-31 forward to 3 March. Only a round trip refuses it.
      expect(valid('2026-02-31')).toBe(false)
      expect(repair({ zone: MANILA, days: ['2026-02-31'] }).days).toEqual([])
    })
  })

  describe('grid', () => {
    it('gives thirty entries from a short history', () => {
      expect(grid(['2026-09-08'], '2026-09-08')).toHaveLength(30)
    })

    it('gives thirty entries from a history far longer than thirty', () => {
      const days = Array.from({ length: 300 }, (unused, i) =>
        new Date(Date.UTC(2026, 0, 1) + i * 86400000).toISOString().slice(0, 10),
      )
      expect(grid(days, '2026-09-08')).toHaveLength(30)
    })

    it('ends on today and starts twenty nine days before it', () => {
      const dots = grid([], '2026-09-08')
      expect(dots[29].date).toBe('2026-09-08')
      expect(dots[0].date).toBe('2026-08-10')
    })

    it('fills only the days that are in the history', () => {
      const dots = grid(['2026-09-08', '2026-09-06'], '2026-09-08')
      expect(dots[29].filled).toBe(true)
      expect(dots[28].filled).toBe(false)
      expect(dots[27].filled).toBe(true)
    })

    it('treats a day before the history began the same as a missed one', () => {
      const dots = grid(['2026-09-08'], '2026-09-08')
      expect(dots.filter((dot) => dot.filled)).toHaveLength(1)
    })

    it('leaves a future dated entry outside the window', () => {
      const dots = grid(['2026-09-20'], '2026-09-08')
      expect(dots.some((dot) => dot.filled)).toBe(false)
    })
  })

  describe('label', () => {
    it('is singular for one', () => {
      expect(label(1)).toBe('1 morning')
    })

    it('is plural for zero', () => {
      expect(label(0)).toBe('0 mornings')
    })

    it('is plural for everything above one', () => {
      expect(label(2)).toBe('2 mornings')
      expect(label(13)).toBe('13 mornings')
    })
  })
})

describe('useMornings', () => {
  it('starts at zero with thirty unfilled dots', () => {
    const mornings = useMornings({
      now: () => SPLIT,
      zone: () => MANILA,
      store: store(),
    })

    expect(mornings.count.value).toBe(0)
    expect(mornings.label.value).toBe('0 mornings')
    expect(mornings.dots.value).toHaveLength(30)
    expect(mornings.dots.value.some((dot) => dot.filled)).toBe(false)
  })

  it('raises the count by one and writes it', () => {
    const shelf = store()
    const mornings = useMornings({ now: () => SPLIT, zone: () => MANILA, store: shelf })

    mornings.record()

    expect(mornings.count.value).toBe(1)
    expect(mornings.label.value).toBe('1 morning')
    expect(shelf.peek()).toEqual({ zone: MANILA, days: ['2026-09-08'] })
  })

  it('counts a second walk on the same day only once', () => {
    const mornings = useMornings({ now: () => SPLIT, zone: () => MANILA, store: store() })

    mornings.record()
    mornings.record()

    expect(mornings.count.value).toBe(1)
  })

  it('starts empty when storage throws rather than taking the screen down', () => {
    const mornings = useMornings({
      now: () => SPLIT,
      zone: () => MANILA,
      store: store(null, { throws: true }),
    })

    expect(mornings.count.value).toBe(0)
    expect(mornings.dots.value).toHaveLength(30)
  })

  it('falls back to the device zone when the stored one no longer exists', () => {
    const mornings = useMornings({
      now: () => SPLIT,
      zone: () => MANILA,
      store: store({ zone: 'Mars/Olympus', days: ['2026-09-07'] }),
    })

    expect(mornings.count.value).toBe(1)
    mornings.record()
    expect(mornings.count.value).toBe(2)
  })
})
