import {taskPreview} from '../shared/task-preview.mjs'
import styles from './task-tile.module.css'

export default function TaskTile({type,section,number,status='Новая',xp,preview,action='Решить задачу →',pending=false}){
  return <article className={styles.card}>
    <header className={styles.head}>
      <div className={styles.left}><strong className={styles.type}>ТИП {type}</strong><span className={styles.section}>{section}</span></div>
      <div className={styles.right}><strong className={styles.number}>№ {number}</strong><span className={styles.status}>{status}</span></div>
    </header>
    <p className={styles.preview}>{taskPreview(preview)}</p>
    <div className={styles.bottom}><span className={styles.xp}>{xp} XP</span><span className={styles.action}>{pending?'Ждёт синхронизации':action}</span></div>
  </article>
}
