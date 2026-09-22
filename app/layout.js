import './globals.css'
import PwaRegister from './pwa-register'

export const metadata = {
  title: 'Genius — физика 7–9',
  description: 'Образовательное приложение Genius',
  manifest: '/manifest.webmanifest',
}

export const viewport = {
  themeColor: '#071525',
}

export default function RootLayout({ children }) {
  return (
    <html lang="ru">
      <body>
        <PwaRegister />
        {children}
      </body>
    </html>
  )
}
