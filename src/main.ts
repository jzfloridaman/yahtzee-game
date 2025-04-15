import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import './styles.css'
import { Capacitor } from '@capacitor/core'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)

// Wait for device ready in Capacitor environment
const mount = () => {
  app.mount('#app')
}

if (Capacitor.isNativePlatform()) {
  document.addEventListener('deviceready', mount, false)
} else {
  mount()
} 