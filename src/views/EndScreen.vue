<template>
  <div class="flex w-full flex-col items-center justify-center">
    <!-- The closing lines are his, arrived 2026-09-04. They close PRD-002 open question 4,
         which is why nothing was ever shipped in their place.

         This comment sits inside the root div on purpose. A comment at the top of a template
         is a second root node in dev, which makes the component a fragment, and Transition
         with mode="out-in" cannot run a leave transition on a fragment. -->
    <p class="text-center font-display text-[28px] leading-snug text-bone">That's the walk.</p>
    <p class="mt-4 text-center font-display text-[28px] leading-snug text-bone">
      Go start your day.
    </p>
  </div>
</template>
