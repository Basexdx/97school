export function seasonForMonth(month){return ['winter','spring','summer','autumn'][Math.floor(((month+1)%12)/3)]}

export const seasonBootstrap=`(()=>{const season=(${seasonForMonth.toString()})(new Date().getMonth());document.documentElement.dataset.season=season;const preload=document.createElement('link');preload.rel='preload';preload.as='image';preload.href='/landing/genius-room-'+season+'.webp';document.head.appendChild(preload)})()`
