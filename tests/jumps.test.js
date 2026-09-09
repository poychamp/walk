import { describe, it, expect } from 'vitest'
import { backAt, endOf, nextAt, nudgeAt } from '../src/audio/jumps.js'

// A boundary table the shape prepare() builds, with round numbers so a wrong answer is obvious.
// The real one is frame exact and hand measured, which is not what these cases are about.
// FRD-006 FR-31.
const table = (...durations) => {
  let at = 0
  return durations.map((duration, i) => {
    const part = { id: `p${i}`, startsAt: at, duration }
    at += duration
    return part
  })
}

// Five parts, boundaries at 0, 100, 300, 600, 1000, ending at 1500.
const FIVE = table(100, 200, 300, 400, 500)

// Three parts, boundaries at 0, 10, 30, ending at 60. Nothing learned the number five.
const THREE = table(10, 20, 30)

describe('jumps', () => {
  describe('nextAt', () => {
    it('goes from the first part to the start of the second', () => {
      expect(nextAt(FIVE, 0)).toBe(100)
    })

    it('goes from a middle part to the start of the one after', () => {
      expect(nextAt(FIVE, 2)).toBe(600)
    })

    it('is null on the last part', () => {
      expect(nextAt(FIVE, 4)).toBeNull()
    })

    it('is still null on the last part however often it is asked', () => {
      expect(nextAt(FIVE, 4)).toBeNull()
      expect(nextAt(FIVE, 4)).toBeNull()
      // Nothing here holds state, so a repeated press cannot walk off the end.
      expect(nextAt(FIVE, FIVE.length - 1)).toBeNull()
    })
  })

  describe('backAt', () => {
    it('goes from a middle part to the start of the one before', () => {
      expect(backAt(FIVE, 3)).toBe(300)
    })

    it('goes from the second part to zero', () => {
      expect(backAt(FIVE, 1)).toBe(0)
    })

    it('stays at zero on the first part', () => {
      expect(backAt(FIVE, 0)).toBe(0)
    })

    it('never restarts the current part, however far into it the walk is', () => {
      // The whole of FR-04. backAt takes an index and no time at all, so being four minutes into
      // part three cannot change the answer. Most players do the opposite and this one does not.
      expect(backAt(FIVE, 2)).toBe(100)
      expect(backAt(FIVE, 2)).not.toBe(FIVE[2].startsAt)
    })
  })

  describe('nudgeAt', () => {
    it('moves ten seconds later from mid walk', () => {
      expect(nudgeAt(FIVE, 450, 10)).toBe(460)
    })

    it('moves ten seconds earlier from mid walk', () => {
      expect(nudgeAt(FIVE, 450, -10)).toBe(440)
    })

    it('lands on zero rather than a negative time', () => {
      expect(nudgeAt(FIVE, 4, -10)).toBe(0)
      expect(nudgeAt(FIVE, 0, -10)).toBe(0)
    })

    it('lands on the end of the walk rather than past it', () => {
      expect(nudgeAt(FIVE, 1495, 10)).toBe(1500)
      expect(nudgeAt(FIVE, 1500, 10)).toBe(1500)
    })

    it('crosses a boundary forwards and lands inside the following part', () => {
      // 295 is in part two, 305 is in part three. The seek respects no boundary.
      expect(nudgeAt(FIVE, 295, 10)).toBe(305)
    })

    it('crosses a boundary backwards and lands inside the preceding part', () => {
      expect(nudgeAt(FIVE, 305, -10)).toBe(295)
    })
  })

  describe('endOf', () => {
    it('is the last start plus the last duration', () => {
      expect(endOf(FIVE)).toBe(1500)
      expect(endOf(THREE)).toBe(60)
    })
  })

  describe('the ends and the shapes', () => {
    it('holds the ceiling on a three part walk, so nothing learned five', () => {
      // Boundaries at 0, 10 and 30.
      expect(nextAt(THREE, 0)).toBe(10)
      expect(nextAt(THREE, 1)).toBe(30)
      expect(nextAt(THREE, 2)).toBeNull()
      expect(backAt(THREE, 2)).toBe(10)
      expect(backAt(THREE, 0)).toBe(0)
    })

    it('returns safely for an empty table', () => {
      expect(nextAt([], 0)).toBeNull()
      expect(backAt([], 0)).toBe(0)
      expect(endOf([])).toBe(0)
      expect(nudgeAt([], 5, 10)).toBe(0)
    })

    it('returns safely for an index past the end of the table', () => {
      expect(nextAt(FIVE, 9)).toBeNull()
      expect(backAt(FIVE, 9)).toBe(0)
    })

    it('returns safely for a negative index', () => {
      expect(nextAt(FIVE, -1)).toBeNull()
      expect(backAt(FIVE, -1)).toBe(0)
    })
  })
})
