export default function manifest() {
  return {
    name: 'Genius — физика 7–9',
    short_name: 'Genius',
    description: 'Изучение физики, практика, ОГЭ и рейтинг.',
    start_url: '/',
    display: 'standalone',
    background_color: '#071224',
    theme_color: '#071525',
    lang: 'ru',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  }
}
