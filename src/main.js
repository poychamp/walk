import { createApp } from 'vue'
import App from './App.vue'
import { register } from './update.js'
import './style.css'

createApp(App).mount('#app')

// After mount, deliberately. Registration is not on the path to the first paint and the start
// screen has a button on it that has to be there.
register()
