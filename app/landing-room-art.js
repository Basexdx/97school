const sections=['МЕХАНИКА','ТЕПЛОВЫЕ ЯВЛЕНИЯ','ЭЛЕКТРИЧЕСТВО','ОПТИКА']
// Text and artwork share the original image coordinate system and crop transform.
export default function LandingRoomArt({mobile=false}){
 return <svg className={`genius-room-art genius-room-art-${mobile?'mobile':'desktop'}`} viewBox="0 0 1672 941" preserveAspectRatio={mobile?'xMaxYMid slice':'xMidYMid slice'} aria-hidden="true">
  {['autumn','winter','spring','summer'].map(season=><image className={`genius-room-art-${season}`} key={season} href={`/landing/genius-room-${season}.webp`} width="1672" height="941"/>)}
  {sections.map((title,index)=><text key={title} x="1102" y={[478,522,565,612][index]} fill="#de9c69" fontSize="18" fontWeight="650" fontFamily="Arial,sans-serif" letterSpacing=".4" transform={`rotate(-1 1102 ${[478,522,565,612][index]})`}>{title}</text>)}
 </svg>
}
