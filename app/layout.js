import './globals.css'
import './landing-enhancements.css'
import './genius-v17-base.css'
import './genius-v17-reference.css'
import './genius-v17-lesson.css'
import './genius-v17-hotfix.css'
import './cosmo-ui-restore.css'
import './cosmic-seasonal-ui.css'
import './teacher-journal-polish.css'
import './seasonal-sidebar-v2.css'
import './zz-seasonal-final.css'
import './mobile-journal-readability.css'
import './reference-materials.css'
import PwaRegister from './pwa-register'
import ApiOriginBridge from './api-origin-bridge'
import GeniusV17Enhancer from './genius-v17-enhancer'
import CosmoUiCleanup from './cosmo-ui-cleanup'
import SeasonalTheme from './seasonal-theme'
import TeacherJournalEnhancer from './teacher-journal-enhancer'
import ReferenceMaterials from './reference-materials'

export const metadata = {
  title: 'Genius — физика, которую понимаешь',
  description: 'Учебник, задачи, лабораторные работы и справочные материалы по физике.',
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
        <GeniusV17Enhancer />
        <CosmoUiCleanup />
        <SeasonalTheme />
        <TeacherJournalEnhancer />
        <ReferenceMaterials />
        {children}
      </body>
    </html>
  )
}
