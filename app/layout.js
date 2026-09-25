import './globals.css'
import './landing-enhancements.css'
import './cosmic-lessons.css'
import PwaRegister from './pwa-register'
import ApiOriginBridge from './api-origin-bridge'
import OgeReferenceMount from './oge-reference-mount'
import CosmicLessonMount from './cosmic-lesson-mount'

export const metadata = {
  title: 'Genius — физика, которую понимаешь',
  description: 'Учебник, задачи, лабораторные работы и подготовка к ОГЭ по физике.',
  manifest: '/manifest.webmanifest',
  applicationName: 'Genius',
  icons: {
    icon: [
      {url:'/icons/icon-192.png',sizes:'192x192',type:'image/png'},
      {url:'/icons/icon-512.png',sizes:'512x512',type:'image/png'},
    ],
    apple: [{url:'/icons/icon-192.png',sizes:'192x192',type:'image/png'}],
  },
  appleWebApp: {
    capable: true,
    title: 'Genius',
    statusBarStyle: 'black-translucent',
  },
}

export const viewport = {
  themeColor: '#071525',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }) {
  return (
    <html lang="ru">
      <body>
        <ApiOriginBridge />
        <PwaRegister />
        <OgeReferenceMount />
        <CosmicLessonMount />
        {children}
      </body>
    </html>
  )
}
