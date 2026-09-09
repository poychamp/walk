<script setup>
defineProps({
  // Already the finished string, `1 morning` or `N mornings`. The view holds no ternary, so the
  // grammar rule lives in one place and is tested rather than duplicated. PRD-005 R-50a.
  label: { type: String, required: true },
  // Thirty entries, oldest first, today last. Built by the composable and never stored.
  dots: { type: Array, required: true },
})
</script>

<template>
  <div class="flex w-full flex-col items-center">
    <!-- ⚠ This comment sits inside the root div on purpose. A comment above the root makes the
         component a fragment in dev, and <Transition mode="out-in"> cannot run a leave
         transition on a fragment, so it waits forever and the screen never appears. That cost
         real time on 2026-09-04 and this is the exact shape of that change. FRD-005 FR-31.

         The count is a heading here and a label on the start screen. Same number, same word,
         different type. Playfair with no uppercase against the small mono caps. That is the type
         system rather than a mismatch. R-40. -->
    <p class="font-display text-[32px] leading-none text-bone">{{ label }}</p>

    <!-- Six across and five down for thirty. Filled left to right and top to bottom, so today is
         the last dot in the last row. FR-34, R-21. -->
    <div class="mt-9 grid grid-cols-[repeat(6,10px)] gap-x-[18px] gap-y-4">
      <!-- A dot carries no label, no title, no tooltip and no listener. It is a mark, not a
           control. A day before the history began and a day missed inside it are both unfilled,
           because there is no third state to show. FR-35, FR-36, R-22, R-23. -->
      <span
        v-for="dot in dots"
        :key="dot.date"
        class="block h-[10px] w-[10px] rounded-full"
        :class="dot.filled ? 'bg-amber' : 'bg-night-800'"
      />
    </div>

    <!-- His string, unchanged. The practice this serves asks for a peaceful relationship with
         your own mind, so nothing here counts down, warns, or frames the run as at risk.
         FR-37, R-25, R-26, R-27. -->
    <p class="mt-10 font-label text-[11px] uppercase tracking-[0.16em] text-haze">
      nothing to protect
    </p>
  </div>
</template>
