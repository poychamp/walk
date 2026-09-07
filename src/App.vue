<script setup>
import { ref, computed, onMounted } from 'vue'
import { sequence, title } from './audio/sequence.js'
import { player } from './audio/player.js'
import StartScreen from './views/StartScreen.vue'
import WalkingScreen from './views/WalkingScreen.vue'
import EndScreen from './views/EndScreen.vue'

const screen = ref('start')

// The player owns the position and reports it back, so this follows the audio rather than
// driving it. It is derived from playback time, so it is right on return from a locked screen
// instead of having drifted.
const position = ref(0)

// The running order, settled once on load, before anything is fetched. Everything downstream
// reads this rather than `sequence` directly, so the name on screen always belongs to the audio
// behind it.
//
// The declared order is the order. His call, 2026-09-07. `ordered()` is the reorder mechanism
// and it stays built and unused, because the join makes any order free and the day that gets
// wanted this is the only line that changes. Swapping in `ordered(sequence)` shuffles two,
// three and four and leaves one first and five last.
const plan = sequence

const segment = computed(() => plan[position.value])

// Static. Nothing persists in this slice, so this counts nothing and is a display value only.
// Streaks are out of scope in CLAUDE.md and this is in on his instruction, 2026-09-04.
const mornings = 9

// The player owns the position now. It advances itself at each part's natural end and reports
// back, so this ref follows the audio rather than driving it. That is what keeps the part name
// on screen matching what is actually playing. TASK-004.
//
// start() stays synchronous all the way into the player. An await anywhere on this path and
// Safari drops the gesture, which looks like nothing in desktop Chrome and like a dead app on
// the phone, and here it would cost all five unlocks rather than one.
// The download starts while the start screen is up, not after the tap. It is a fetch, so it
// needs no user gesture, and by the time the button is pressed the join is usually already done.
onMounted(() => {
  player.prepare(plan, title).catch((error) => {
    console.warn('audio failed to load', error)
  })
})

function start() {
  screen.value = 'walking'
  player.start({
    onPart: (next) => {
      position.value = next
    },
    onFinish: () => {
      screen.value = 'end'
    },
  })
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
  if (screen.value !== 'walking') {
    return
  }

  // Skipping forward. The walk does not need this, it advances on its own, and it is kept so
  // the line at the bottom of the screen stays true. On the last part there is nothing to skip
  // to, so it ends the walk.
  if (position.value < sequence.length - 1) {
    player.advance()
    return
  }

  player.stop()
  screen.value = 'end'
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
