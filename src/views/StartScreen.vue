<script setup>
defineEmits(['start'])
</script>

<template>
  <div class="flex flex-col items-center">
    <h1 class="text-center font-display text-[32px] leading-[1.15] text-bone">
      <span class="block">The Perfect</span>
      <span class="block italic text-amber">Walk</span>
    </h1>

    <button
      type="button"
      class="start mt-16 flex h-[176px] w-[176px] items-center justify-center rounded-full
             border-2 border-dusk-700 bg-transparent
             font-display text-[22px] tracking-[0.01em] text-bone
             cursor-pointer transition duration-200 ease-out motion-reduce:transition-none
             focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-4
             focus-visible:outline-amber
             active:scale-[0.98] active:border-amber active:text-amber-lift"
      @click="$emit('start')"
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
