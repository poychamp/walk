import { registerSW } from 'virtual:pwa-register'

// When a new build is allowed to take over.
//
// ⚠ `registerType` was `autoUpdate` until 2026-09-08. That reloads the page the moment a new
// service worker takes control, which is how updates land without asking and also how a deploy
// during a walk kills twenty six minutes of audio with the phone in a pocket. CLAUDE.md carried
// it as a known trap from the day it was written.
//
// So the registration is `prompt` and this file owns the decision instead. A new build installs
// in the background and waits. It is promoted when two things are true at once, the page is
// going away and no walk is running. Both matter. Promoting mid session reloads a screen
// somebody is looking at, and promoting during a walk is the trap.
//
// The result is that an update lands the next time the app is opened, silently, and can never
// interrupt audio. There is no prompt and no copy, because there is nothing to ask.
//
// This is still vite-plugin-pwa and still a workbox generated service worker. Nothing here is
// hand rolled, which is the locked decision in CLAUDE.md.

let apply = null
let pending = false
let walking = false

function promote() {
  if (!pending || walking || !apply) {
    return
  }
  pending = false
  // Sends SKIP_WAITING and reloads once the new worker takes control. The page is already
  // hidden by the time this runs, so the reload is not something anybody sees.
  apply(true)
}

function onHide() {
  if (document.hidden) {
    promote()
  }
}

export function register() {
  apply = registerSW({
    immediate: true,
    onNeedRefresh() {
      // A new build is installed and waiting. Do nothing yet.
      pending = true
    },
  })

  window.addEventListener('pagehide', promote)
  document.addEventListener('visibilitychange', onHide)
}

// Called from App.vue whenever the screen changes. The only state this file needs about the
// app is whether audio is running.
export function setWalking(next) {
  walking = next
}
