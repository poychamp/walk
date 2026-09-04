<script setup>
import { ref, computed } from 'vue'
import { sequence } from './audio/sequence.js'
import StartScreen from './views/StartScreen.vue'
import WalkingScreen from './views/WalkingScreen.vue'
import EndScreen from './views/EndScreen.vue'

// Throwaway. Position comes from the media element's own playback time once the audio engine
// exists, and this index gets deleted rather than kept as a fallback that could start a screen
// with no audio behind it. FRD-002 FR-18.
const screen = ref('start')
const position = ref(0)

const segment = computed(() => sequence[position.value])

// Static. Nothing persists in this slice, so this counts nothing and is a display value only.
// Streaks are out of scope in CLAUDE.md and this is in on his instruction, 2026-09-04.
const mornings = 9

function start() {
  position.value = 0
  screen.value = 'walking'
}

function advance() {
  if (position.value < sequence.length - 1) {
    position.value += 1
    return
  }
  screen.value = 'end'
}

// The whole viewport is the tap target on the walking screen, because the copy says anywhere.
// It sits on main rather than inside the screen component so the margins and the bottom line
// count too.
//
// The guard reads screen at the moment the event reaches main, which is AFTER any handler
// below has already run. So the Start button has to stop propagation. Without it, one click
// on Start runs start(), which sets screen to walking, and then keeps bubbling to here, where
// the guard now passes and advance() eats part one. See the .stop in StartScreen.vue.
function tap() {
  if (screen.value === 'walking') {
    advance()
  }
}
</script>

<template>
  <main
    class="h-[100dvh] w-full overflow-hidden bg-night-950 text-bone
           pt-[env(safe-area-inset-top)] pr-[env(safe-area-inset-right)]
           pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)]"
    @click="tap"
  >
    <div class="relative mx-auto h-full w-full max-w-[420px] px-6">
      <!-- Centred on the 45% line rather than starting at it, so content of varying height
           stays put. FRD-002 FR-14. -->
      <div class="absolute inset-x-6 top-[45%] -translate-y-1/2">
        <Transition name="fade" mode="out-in">
          <StartScreen v-if="screen === 'start'" @start="start" />
          <WalkingScreen v-else-if="screen === 'walking'" :segment="segment" />
          <EndScreen v-else />
        </Transition>
      </div>

      <p
        v-if="screen === 'start'"
        class="absolute inset-x-0 bottom-[calc(40px+env(safe-area-inset-bottom))] text-center
               font-label text-[12px] uppercase tracking-[0.18em] text-haze"
      >
        {{ mornings }} mornings
      </p>

      <p
        v-else-if="screen === 'walking'"
        class="absolute inset-x-0 bottom-[calc(40px+env(safe-area-inset-bottom))] text-center
               font-label text-[14px] leading-normal text-haze"
      >
        tap anywhere to continue
      </p>
    </div>
  </main>
</template>

<style>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 500ms ease-out;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .fade-enter-active,
  .fade-leave-active {
    transition: none;
  }
}
</style>
