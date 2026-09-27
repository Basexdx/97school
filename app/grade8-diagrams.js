// Static, accessible SVG illustrations. No sliders, animation controls, or remote assets.
const groups = [
  [1, 2, 3, 4, 5, 6], [7, 8, 9], [10, 11, 12, 13, 14],
  [15, 16, 17, 18, 19, 20, 21, 22], [23, 24, 25, 26],
  [27, 28, 29, 30, 31, 32, 33], [34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49],
  [50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62],
]

function Label({ x, y, children, color = '#d5edff', size = 14 }) {
  return <text x={x} y={y} fill={color} fontSize={size} fontWeight="600" textAnchor="middle" fontFamily="Arial, sans-serif">{children}</text>
}

function Particle({ x, y, warm = false, size = 9 }) {
  return <circle cx={x} cy={y} r={size} fill={warm ? 'url(#gold)' : 'url(#blue)'} stroke={warm ? '#ffe1a1' : '#b9eaff'} strokeWidth=".8" />
}

function ThermalMatter({ n }) {
  const phases = n === 2 ? ['ТВЁРДОЕ ТЕЛО', 'ЖИДКОСТЬ', 'ГАЗ'] : n === 3 ? ['СМАЧИВАНИЕ', 'КАПИЛЛЯР', 'ПОДЪЁМ'] : ['ЧАСТИЦЫ', 'ДВИЖЕНИЕ', 'ВЗАИМОДЕЙСТВИЕ']
  return <>
    {phases.map((name, group) => <g key={name} transform={`translate(${38 + group * 186},40)`}>
      <rect width="158" height="165" rx="16" fill="#061a30" stroke="#276496" />
      {Array.from({ length: group === 2 ? 9 : 16 }, (_, i) => {
        const x = group === 0 ? 29 + (i % 4) * 33 : 26 + ((i * 43 + 7) % 112)
        const y = group === 0 ? 32 + Math.floor(i / 4) * 28 : 23 + ((i * 59 + 11) % 112)
        return <Particle key={i} x={x} y={y} warm={group === 2 && i % 2 === 0} size={group === 2 ? 7 : 9} />
      })}
      <Label x={79} y={190} size={12}>{name}</Label>
    </g>)}
    <path d="M202 120h16m170 0h16" stroke="#ffad29" strokeWidth="3" markerEnd="url(#arrow)" />
  </>
}

function FocusDiagram({ n }) {
  if (n === 3) return <>
    <path d="M160 57v137h105V57m165 0v137H325V57" fill="none" stroke="#77ceff" strokeWidth="5" strokeLinecap="round" />
    <path d="M161 159Q212 127 263 159M328 173Q377 203 428 173" fill="none" stroke="#44aafa" strokeWidth="4" />
    <path d="M200 147V98m185 93v-55" stroke="#ffd061" strokeWidth="3" markerEnd="url(#arrow)" />
    <Label x={211} y={223} size={12}>СМАЧИВАЕТ</Label><Label x={377} y={223} size={12}>НЕ СМАЧИВАЕТ</Label>
  </>
  if (n === 4) return <>
    <rect x="280" y="38" width="40" height="165" rx="20" fill="#0c3558" stroke="#9dd9ff" strokeWidth="3" />
    <circle cx="300" cy="195" r="28" fill="url(#gold)" stroke="#ffc35f" />
    <rect x="293" y="91" width="14" height="109" rx="7" fill="url(#gold)" />
    {[60, 85, 110, 135, 160].map(y=><path key={y} d={`M321 ${y}h17`} stroke="#adddff" strokeWidth="2" />)}
    <Label x={192} y={115} size={16}>ХОЛОДНЕЕ</Label><Label x={405} y={115} color="#ffca65" size={16}>ТЕПЛЕЕ</Label>
  </>
  if (n === 5 || n === 6) return <>
    <circle cx="300" cy="119" r="68" fill="#102f4f" stroke="#4cbbfa" strokeWidth="2" />
    {Array.from({length:9},(_,i)=><Particle key={i} x={260+(i*37)%80} y={82+(i*47)%75} warm={i%2===0} size={7}/>)}
    <path d="M99 117h107m185 0h107" stroke="#ffbe46" strokeWidth="3" markerEnd="url(#arrow)" />
    <Label x={136} y={102} color="#ffc875">{n===6?'РАБОТА':'ДВИЖЕНИЕ'}</Label><Label x={464} y={102} color="#ffc875">{n===6?'ТЕПЛОПЕРЕДАЧА':'ВЗАИМОДЕЙСТВИЕ'}</Label><Label x={300} y={217} size={17}>ВНУТРЕННЯЯ ЭНЕРГИЯ</Label>
  </>
  if (n === 20) return <>
    <path d="M163 173c-34-36 3-73 22-100 21 34 57 68 17 99-10 8-28 9-39 1zm212 0c-34-36 3-73 22-100 21 34 57 68 17 99-10 8-28 9-39 1z" fill="url(#blue)" stroke="#b9eaff" strokeWidth="2" />
    <Label x={198} y={217}>ВОДЯНОЙ ПАР</Label><Label x={407} y={217} color="#ffd179">НАСЫЩЕННЫЙ ПАР</Label><path d="M252 124h93" stroke="#ffbe46" strokeWidth="3" markerEnd="url(#arrow)" />
  </>
  if (n === 31) return <>
    <circle cx="300" cy="126" r="40" fill="url(#gold)" /><Label x={300} y={135} color="#24314b" size={24}>+</Label>
    <ellipse cx="300" cy="126" rx="156" ry="64" fill="none" stroke="#63baf8" strokeWidth="2" transform="rotate(33 300 126)" />
    <ellipse cx="300" cy="126" rx="156" ry="64" fill="none" stroke="#63baf8" strokeWidth="2" transform="rotate(-33 300 126)" />
    <Particle x={194} y={45} /><Particle x={407} y={41} /><Particle x={397} y={204} />
    <Label x={300} y={232} color="#ffd070">ЯДРО И ЭЛЕКТРОНЫ</Label>
  </>
  if (n === 55 || n === 56) return <>
    <path d="M154 73h290M154 118h290M154 163h290" stroke="#51aafa" strokeWidth="2" markerEnd="url(#arrowBlue)" />
    <path d="M300 51v142" stroke="#ffbb48" strokeWidth="9" strokeLinecap="round" />
    <circle cx="300" cy="121" r="7" fill="#fff2c5" /><path d="M300 47V22" stroke="#ffe1a0" strokeWidth="3" markerEnd="url(#arrow)" />
    <Label x={488} y={127} size={12}>ПОЛЕ B</Label><Label x={300} y={226} color="#ffd075">{n===55?'СИЛА НА ПРОВОДНИК С ТОКОМ':'ИНДУКЦИЯ МАГНИТНОГО ПОЛЯ'}</Label>
  </>
  return null
}

function HeatFlow({ n }) {
  const names = n === 7 ? ['ГОРЯЧЕЕ ТЕЛО', 'ТЕПЛОПРОВОДНОСТЬ', 'ХОЛОДНОЕ ТЕЛО'] : n === 8 ? ['НАГРЕВ', 'КОНВЕКЦИОННЫЕ ПОТОКИ', 'ОХЛАЖДЕНИЕ'] : n === 9 ? ['СОЛНЦЕ', 'ИЗЛУЧЕНИЕ В ВАКУУМЕ', 'ЗЕМЛЯ'] : ['ТЕПЛОЕ ТЕЛО', 'ПЕРЕДАЧА ЭНЕРГИИ', 'ХОЛОДНОЕ ТЕЛО']
  return <>
    <circle cx="95" cy="120" r="57" fill="url(#gold)" opacity=".85" />
    <circle cx="505" cy="120" r="57" fill="url(#blue)" opacity=".9" />
    <path d="M160 106h282M160 120h282M160 134h282" stroke="#ffbb47" strokeWidth="2" strokeDasharray={n === 9 ? '5 10' : 'none'} markerEnd="url(#arrow)" />
    <Label x={95} y={219} size={12}>{names[0]}</Label><Label x={300} y={85} color="#ffca6b" size={12}>{names[1]}</Label><Label x={505} y={219} size={12}>{names[2]}</Label>
  </>
}

function FormulaDiagram({ n, formula }) {
  return <>
    <rect x="46" y="61" width="178" height="118" rx="16" fill="#0b3156" stroke="#2978ae" />
    <rect x="376" y="61" width="178" height="118" rx="16" fill="#0c2b46" stroke="#e6a334" />
    <Label x={135} y={110} size={18}>{n >= 23 ? 'ТОПЛИВО' : 'ТЕЛО 1'}</Label>
    <Label x={135} y={144} color="#70c4ff">{n >= 23 ? 'Q = qm' : 't₁'}</Label>
    <Label x={465} y={110} size={18}>{n >= 23 ? 'ПОЛЕЗНАЯ РАБОТА' : 'ТЕЛО 2'}</Label>
    <Label x={465} y={144} color="#ffbe50">{n >= 23 ? 'A' : 't₂'}</Label>
    <path d="M239 120h120" stroke="#ffac26" strokeWidth="3" markerEnd="url(#arrow)" />
    <Label x={300} y={218} size={18} color="#ffd786">{formula || 'Q₁ + Q₂ = 0'}</Label>
  </>
}

function PhaseDiagram({ n }) {
  const boiling = n >= 18 && n <= 22
  return <>
    <path d="M76 190h456M76 190V43" stroke="#88bde2" strokeWidth="2" markerEnd="url(#arrowBlue)" />
    <path d={boiling ? 'M100 166L210 102H394L502 45' : 'M100 170L230 90H390L502 46'} fill="none" stroke="#ffc048" strokeWidth="4" strokeLinecap="round" />
    <path d="M210 102H394" stroke="#5dbaff" strokeDasharray="6 6" />
    <Label x={82} y={39} color="#78c9ff">t, °C</Label><Label x={525} y={210} color="#78c9ff">время</Label>
    <Label x={305} y={87} color="#ffd078" size={12}>{boiling ? 'ФАЗОВЫЙ ПЕРЕХОД / КИПЕНИЕ' : 'ПЛАВЛЕНИЕ'}</Label>
    <Label x={140} y={212} size={12}>НАГРЕВ</Label><Label x={468} y={212} size={12}>НАГРЕВ</Label>
  </>
}

function Charges({ n }) {
  return <>
    <circle cx="138" cy="118" r="53" fill="url(#blue)" stroke="#8bcaff" />
    <circle cx="462" cy="118" r="53" fill="url(#gold)" stroke="#ffe09c" />
    <Label x={138} y={135} size={44}>+</Label><Label x={462} y={133} size={48} color="#10243a">−</Label>
    {[-2, -1, 0, 1, 2].map(i => <path key={i} d={`M202 ${118 + i * 20} Q300 ${118 + i * 30} 396 ${118 + i * 20}`} fill="none" stroke="#56b6ff" strokeWidth="1.8" markerEnd="url(#arrowBlue)" opacity=".85" />)}
    <Label x={300} y={217} color="#ffca69" size={13}>{n === 29 ? 'СИЛА КУЛОНА' : n === 31 ? 'СТРОЕНИЕ АТОМА' : 'ЭЛЕКТРИЧЕСКОЕ ПОЛЕ И ЗАРЯДЫ'}</Label>
  </>
}

function Circuit({ n, formula }) {
  const parallel = n === 45
  const serial = n === 44
  const resistor = [40, 41, 42, 43, 47, 49].includes(n)
  return <>
    <path d="M106 115V50H486V190H106V115" stroke="#55b7f9" strokeWidth="4" fill="none" strokeLinejoin="round" />
    <rect x="91" y="92" width="30" height="46" rx="5" fill="#061b2c" />
    <path d="M102 94v41M111 102v25" stroke="#ffb72b" strokeWidth="3" />
    {parallel ? <>
      <path d="M228 50v140m145-140v140" stroke="#5dbdff" strokeWidth="3" />
      <circle cx="300" cy="50" r="23" fill="#0c3157" stroke="#ffc050" strokeWidth="2" /><circle cx="300" cy="190" r="23" fill="#0c3157" stroke="#ffc050" strokeWidth="2" />
      <Label x={300} y={57} color="#ffd078">R₁</Label><Label x={300} y={197} color="#ffd078">R₂</Label>
    </> : serial ? <>
      {[260, 380].map((x, i) => <g key={x}><circle cx={x} cy="50" r="24" fill="#103759" stroke="#ffc050" strokeWidth="2" /><Label x={x} y={56} color="#ffd078">{`R${i + 1}`}</Label></g>)}
    </> : <>
      <rect x="274" y="32" width="62" height="36" rx="7" fill="#0d3454" stroke="#ffbd45" strokeWidth="2" />
      <Label x={305} y={57} color="#ffcb70" size={resistor ? 19 : 24}>{resistor ? 'R' : n === 38 ? 'A' : n === 39 ? 'V' : '✦'}</Label>
    </>}
    <path d="M163 190h35" stroke="#ffbc44" strokeWidth="3" markerEnd="url(#arrow)" />
    <Label x={302} y={229} color="#ffd183" size={formula ? 16 : 13}>{formula || (n === 35 ? 'ЗАМКНУТАЯ ЭЛЕКТРИЧЕСКАЯ ЦЕПЬ' : 'ИСТОЧНИК · ПРОВОДНИК · ПОТРЕБИТЕЛЬ')}</Label>
  </>
}

function Magnetism({ n }) {
  const magnet = n < 55
  const rotating = [57, 61, 62].includes(n)
  const induced = [58, 59, 60].includes(n)
  return <>
    <rect x="210" y="91" width="180" height="60" rx="11" fill="#102c50" stroke="#79bdff" strokeWidth="2" />
    <path d="M300 93v56" stroke="#8cbddb" strokeWidth="2" />
    <Label x={255} y={132} size={28} color="#5bbcff">N</Label><Label x={345} y={132} size={28} color="#ffbc4b">S</Label>
    {[-2, -1, 0, 1, 2].map(i => <g key={i} fill="none" stroke="#44aaff" opacity=".5" strokeWidth="1.5">
      <path d={`M210 ${106 + i * 7} C${100 - Math.abs(i) * 8} ${25 + i * 8},${500 + Math.abs(i) * 8} ${25 + i * 8},390 ${106 + i * 7}`} />
      <path d={`M210 ${136 + i * 7} C${100 - Math.abs(i) * 8} ${225 + i * 7},${500 + Math.abs(i) * 8} ${225 + i * 7},390 ${136 + i * 7}`} />
    </g>)}
    {rotating && <><circle cx="300" cy="121" r="90" fill="none" stroke="#ffbb49" strokeDasharray="7 8" strokeWidth="2" /><path d="M302 25l12 18-24 0z" fill="#ffc54e" /></>}
    {induced && <><path d="M410 120h70" stroke="#ffbe49" strokeWidth="3" markerEnd="url(#arrow)" /><rect x="484" y="89" width="48" height="62" rx="12" fill="none" stroke="#ffbe49" strokeWidth="3" /></>}
    <Label x={300} y={232} color="#ffcc77" size={13}>{rotating ? 'ВРАЩЕНИЕ · ЭНЕРГИЯ' : induced ? 'ИЗМЕНЕНИЕ МАГНИТНОГО ПОТОКА' : magnet ? 'МАГНИТНОЕ ПОЛЕ И ЕГО ЛИНИИ' : 'ДЕЙСТВИЕ МАГНИТНОГО ПОЛЯ'}</Label>
  </>
}

export default function Grade8Diagram({ lesson }) {
  const n = lesson.paragraph
  const group = groups.findIndex(items => items.includes(n))
  return <figure className="g8-diagram">
    <svg viewBox="0 0 600 250" role="img" aria-labelledby={`diagram-${n}-title`} preserveAspectRatio="xMidYMid meet">
      <title id={`diagram-${n}-title`}>{`Схема к параграфу ${n}: ${lesson.shortTitle}`}</title>
      <defs>
        <radialGradient id="blue"><stop stopColor="#d9f7ff"/><stop offset=".28" stopColor="#70c7ff"/><stop offset="1" stopColor="#1178d8"/></radialGradient>
        <radialGradient id="gold"><stop stopColor="#fff4cc"/><stop offset=".3" stopColor="#ffd16a"/><stop offset="1" stopColor="#ec7c19"/></radialGradient>
        <marker id="arrow" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto"><path d="M0 0l9 4.5L0 9" fill="none" stroke="#ffbc43" strokeWidth="1.8"/></marker>
        <marker id="arrowBlue" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto"><path d="M0 0l9 4.5L0 9" fill="none" stroke="#65c1ff" strokeWidth="1.8"/></marker>
      </defs>
      <rect width="600" height="250" rx="17" fill="#061729" />
      {Array.from({ length: 22 }, (_, i) => <circle key={i} cx={(i * 113 + 31) % 600} cy={(i * 67 + 13) % 250} r={i % 3 === 0 ? 1.2 : .6} fill="#6fbdfb" opacity=".42" />)}
      {[3,4,5,6,20,31,55,56].includes(n) ? <FocusDiagram n={n}/> : <>
        {group === 0 && <ThermalMatter n={n} />}
        {group === 1 && <HeatFlow n={n} />}
        {group === 2 && <FormulaDiagram n={n} formula={lesson.formula} />}
        {group === 3 && <PhaseDiagram n={n} />}
        {group === 4 && <FormulaDiagram n={n} formula={lesson.formula} />}
        {group === 5 && <Charges n={n} />}
        {group === 6 && <Circuit n={n} formula={lesson.formula} />}
        {group === 7 && <Magnetism n={n} />}
      </>}
    </svg>
    <figcaption>Рисунок к §{n} · {lesson.shortTitle}</figcaption>
  </figure>
}
