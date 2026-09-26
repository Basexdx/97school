'use client'

import { useEffect } from 'react'

const SEASONS = ['winter', 'spring', 'summer', 'autumn']

export default function SeasonalTheme() {
  useEffect(() => {
    const month = new Date().getMonth()
    const season = SEASONS[Math.floor(((month + 1) % 12) / 3)]
    document.documentElement.dataset.season = season
  }, [])

  return null
}
