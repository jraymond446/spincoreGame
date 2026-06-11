import './style.css'
import { AppShell } from './app/AppShell'

const app = document.querySelector<HTMLDivElement>('#app')

if (!app) {
  throw new Error('Missing #app root element')
}

const appShell = new AppShell(app)

window.addEventListener('beforeunload', () => {
  appShell.destroy()
})
