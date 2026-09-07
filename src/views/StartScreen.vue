<script setup>
defineEmits(['start'])
</script>

<template>
  <div class="flex flex-col items-center">
    <h1 class="text-center font-display text-[32px] leading-[1.15] text-bone">
      <span class="block">The Perfect</span>
      <span class="block italic text-amber">Walk</span>
    </h1>

    <!-- .stop is load bearing. App.vue puts a tap-to-advance handler on main, and this button
         is inside it. Without stopping propagation, one click starts the walk and then bubbles
         up to that handler, which sees the screen already switched and advances past part one.
         Any future control on this screen needs the same.

         It got sharper once audio landed. Without .stop, one tap now starts part one and then
         immediately replaces it with part two over the top of it. FRD-003 FR-27. -->
    <button
      type="button"
      class="start mt-16 flex h-[176px] w-[176px] items-center justify-center rounded-full
             border-2 border-dusk-700 bg-transparent
             font-display text-[22px] tracking-[0.01em] text-bone
             cursor-pointer transition duration-200 ease-out motion-reduce:transition-none
             focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-4
             focus-visible:outline-amber
             active:scale-[0.98] active:border-amber active:text-amber-lift"
      @click.stop="$emit('start')"
    >
      Start
    </button>
  </div>
</template>

<style scoped>
.start {
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
  user-select: none;
}
</style>
