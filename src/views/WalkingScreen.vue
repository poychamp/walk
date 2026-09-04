<script setup>
// The segment arrives as a prop. This component does not import the sequence, does not know
// how many there are, and does not know its own position. FRD-002 FR-19.
defineProps({
  segment: { type: Object, required: true },
})

defineEmits(['advance'])
</script>

<template>
  <!-- Tap to advance is throwaway and has the same lifetime as the index in App.vue. The audio
       element becomes the clock and this handler goes with it. FRD-002 FR-18. -->
  <div
    class="flex min-h-[64px] w-full flex-col items-center justify-center"
    @click="$emit('advance')"
  >
    <h2 class="text-center font-display text-[40px] leading-[1.1] text-bone">
      {{ segment.name }}
    </h2>
  </div>
</template>
