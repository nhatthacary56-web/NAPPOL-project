import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Capacitor } from '@capacitor/core'
import App from './App'
import { AppProviders } from './store/AppProviders'
import './styles/global.css'

async function bootNativeShell() {
  if (!Capacitor.isNativePlatform()) return
  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar')
    // กัน WebView ทับใต้ status bar → ปุ่มค้นหาเลื่อนขึ้นไปชนนาฬิกา
    await StatusBar.setOverlaysWebView({ overlay: false })
    await StatusBar.setStyle({ style: Style.Light })
    await StatusBar.setBackgroundColor({ color: '#e91e8c' })
  } catch {
    /* web or plugin unavailable */
  }
  try {
    const { SplashScreen } = await import('@capacitor/splash-screen')
    await SplashScreen.hide()
  } catch {
    /* optional */
  }
  try {
    const { App: CapApp } = await import('@capacitor/app')
    CapApp.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack) window.history.back()
      else void CapApp.exitApp()
    })
  } catch {
    /* optional */
  }
}

void bootNativeShell()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AppProviders>
        <App />
      </AppProviders>
    </BrowserRouter>
  </StrictMode>,
)
