<script setup>
// The segment arrives as a prop. This component does not import the sequence, does not know
// how many there are, and does not know its own position. FRD-002 FR-19.
defineProps({
  segment: { type: Object, required: true },
})
</script>

<template>
  <div class="flex min-h-[64px] w-full flex-col items-center justify-center">
    <!-- No tap handler here on purpose. The copy says tap anywhere, so the whole viewport is
         the target and it lives on main in App.vue. A second handler on this block would fire
         twice on the part name, once here and once on the bubble.

         Keep every comment inside this root div. A comment at the top of a template is a
         second root node in dev, and Transition with mode="out-in" cannot run a leave
         transition on a fragment, so the next screen never mounts. -->
    <h2 class="text-center font-display text-[40px] leading-[1.1] text-bone">
      {{ segment.name }}
    </h2>

    <!-- Static. It reports nothing yet and becomes a real state when the audio engine owns
         playback. Hint style from the design spec section 1, 14px mono on haze. -->
    <p class="mt-6 text-center font-label text-[14px] leading-normal text-haze">playing</p>
  </div>
</template>
