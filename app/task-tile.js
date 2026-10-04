import {difficultySignal} from '../shared/textbook-card.mjs'
import {taskPreview} from '../shared/task-preview.mjs'
import styles from './task-tile.module.css'

export default function TaskTile({type,section,number,status='Новая',xp,preview,action='Решить задачу →',pending=false,answerFormat=null,difficulty=null}){
  const signal=difficultySignal(difficulty)
  return <article className={styles.card}>
    <header className={styles.head}>
      <div className={styles.left}><strong className={styles.type}>{answerFormat||`ТИП ${type}`}</strong><span className={styles.section}>{section}</span></div>
      <div className={styles.right}><strong className={styles.number}>№ {number}</strong><span className={styles.status}>{status}</span></div>
    </header>
    <p className={styles.preview}>{taskPreview(preview)}</p>
    <div className={styles.bottom}><div className={styles.reward}><span className={styles.xp}>{xp} XP</span>{signal&&<svg className={styles.difficulty} viewBox="0 0 24 20" role="img" aria-label={`Сложность: ${signal.label}`}><title>{`Сложность: ${signal.label}`}</title>{[7,12,18].map((height,i)=><rect key={height} x={2+i*8} y={20-height} width="5" height={height} rx="1" fill={i<signal.level?'#ffc34e':'#29465d'}/>)}</svg>}</div><span className={styles.action}>{pending?'Ждёт синхронизации':action}</span></div>
  </article>
}
