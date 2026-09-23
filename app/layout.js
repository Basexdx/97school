import './globals.css'
import PwaRegister from './pwa-register'

export const metadata = {
  title: 'Genius — физика, которую понимаешь',
  description: 'Учебник, задачи, лабораторные работы и подготовка к ОГЭ по физике.',
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
