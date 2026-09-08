<script setup>
import { useReorder } from '../composables/useReorder.js'

const props = defineProps({
  // The declared sequence. Rows render in this order and stay in it, see the note in
  // useReorder.js for why. FRD-004 FR-33.
  parts: { type: Array, required: true },
  // The running order. Only ever expressed as transforms.
  order: { type: Array, required: true },
  // False while the player is joining, which covers the first load and every reorder.
  ready: { type: Boolean, default: false },
})

const emit = defineEmits(['start', 'reorder'])

// ⚠ One number, used by the drag maths and by the row's height. Two copies of it is a bug
// waiting for a design tweak, which is why this is the one value on this screen bound as an
// inline style rather than written as a utility. FR-35.
const ROW_HEIGHT = 40

// The quiet period after the last drop, before the audio is rebuilt and the order is stored.
// FR-26.
const QUIET_MS = 250

const { dragging, offsetOf, easing, onPointerDown, onPointerMove, onPointerUp, onPointerCancel } =
  useReorder({
    parts: props.parts,
    order: () => props.order,
    rowHeight: ROW_HEIGHT,
    quietMs: QUIET_MS,
    onSettle: (next) => emit('reorder', next),
  })
</script>

<template>
  <div class="flex flex-col items-center">
    <h1 class="text-center font-display text-[32px] leading-[1.15] text-bone">
      <span class="block">The Perfect</span>
      <span class="block italic text-amber">Walk</span>
    </h1>

    <!-- .stop on both, for the same reason the Start button carries it. `main` holds the
         tap-to-advance handler and its guard returns early on the start screen, so nothing
         leaks today. This does not depend on that guard staying the way it is. FR-42. -->
    <div
      id="order-list"
      class="mt-8 w-full self-stretch"
      @pointerdown.stop
      @click.stop
    >
      <!-- relative gives the dragged row a stacking context to be lifted within. FR-34. -->
      <div class="relative w-full">
        <!-- cursor-pointer sits on the movable rows only. A fixed row is not a control and
             should not look like one. Desktop only either way, a phone has no cursor. -->
        <div
          v-for="(part, index) in parts"
          :key="part.id"
          class="row relative flex w-full touch-none select-none items-center justify-between"
          :class="[
            part.fixed ? '' : 'cursor-pointer',
            index === dragging ? 'z-10' : '',
            easing(index) ? 'transition-transform duration-[180ms] ease-out motion-reduce:transition-none' : '',
          ]"
          :style="{ height: `${ROW_HEIGHT}px`, transform: `translateY(${offsetOf(index)}px)` }"
          @pointerdown="onPointerDown($event, index)"
          @pointermove="onPointerMove"
          @pointerup="onPointerUp"
          @pointercancel="onPointerCancel"
        >
          <span class="font-display text-[20px]" :class="part.fixed ? 'text-dim' : 'text-bone'">
            {{ part.name }}
          </span>

          <!-- A fixed part keeps its handle in the DOM and hides it, so the row does not change
               width between fixed and movable and nothing shifts. FR-37. -->
          <span
            class="ml-3 flex w-[18px] flex-col gap-1"
            :class="part.fixed ? 'invisible' : ''"
          >
            <!-- ⚠ #4A4162 has no theme token. Every other colour in the app does.
                 FRD-004 open question 1. -->
            <span class="h-px w-full bg-[#4A4162]" />
            <span class="h-px w-full bg-[#4A4162]" />
            <span class="h-px w-full bg-[#4A4162]" />
          </span>
        </div>
      </div>

      <p
        class="mt-3 text-center font-label text-[11px] uppercase tracking-[0.16em] text-haze"
      >
        drag the middle three
      </p>
    </div>

    <!-- .stop is load bearing. App.vue puts a tap-to-advance handler on main, and this button
         is inside it. Without stopping propagation, one click starts the walk and then bubbles
         up to that handler, which sees the screen already switched and advances past part one.
         Any future control on this screen needs the same.

         It got sharper once audio landed. Without .stop, one tap now starts part one and then
         immediately replaces it with part two over the top of it. FRD-003 FR-27.

         The disabled attribute is the whole mechanism for the not-ready state. A disabled button
         is not activatable, so it dispatches no click and :active never matches, which means the
         scale, the border and the colour lift do not fire without anything being layered on to
         suppress them. FRD-004 FR-44, FR-45. -->
    <button
      type="button"
      :disabled="!ready"
      class="start mt-6 flex h-[176px] w-[176px] items-center justify-center rounded-full
             border-2 border-dusk-700 bg-transparent
             font-display text-[22px] tracking-[0.01em] text-bone
             cursor-pointer transition duration-200 ease-out motion-reduce:transition-none
             focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-4
             focus-visible:outline-amber
             active:scale-[0.98] active:border-amber active:text-amber-lift
             disabled:opacity-50"
      @click.stop="$emit('start')"
    >
      {{ ready ? 'Start' : 'Loading...' }}
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
