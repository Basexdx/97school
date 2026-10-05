'use client'
import {useEffect,useState,useId} from 'react'
import {studentAvatars,studentAvatar} from '../shared/student-avatars.mjs'
import styles from './student-onboarding.module.css'

export function StudentAvatar({id,size=40}){
 const avatar=studentAvatar(id),clipId=useId().replaceAll(':','')
 return avatar?<svg width={size} height={size} viewBox={avatar.viewBox} className={styles.avatar} role="img" aria-label="Аватар ученика"><defs><clipPath id={clipId}><circle cx={Number(avatar.viewBox.split(' ')[0])+Number(avatar.viewBox.split(' ')[2])/2} cy={Number(avatar.viewBox.split(' ')[1])+Number(avatar.viewBox.split(' ')[3])/2} r={Number(avatar.viewBox.split(' ')[2])/2}/></clipPath></defs><image href={avatar.src} width="1448" height="1086" clipPath={`url(#${clipId})`}/></svg>:<span className={styles.fallback} style={{width:size,height:size}} aria-label="Аватар ученика">⚛</span>
}
export function AccessScene({Brand,onBack,title,description,children}){
 return <main className={styles.scene}><section className={styles.panel}><Brand dark onClick={onBack}/><h1>{title}</h1>{description&&<p className={styles.description}>{description}</p>}{children}{onBack&&<button type="button" className={styles.back} onClick={onBack}>← Назад</button>}</section></main>
}
export function StudentCodeScreen({Brand,onBack,onSubmit,notice}){
 const [code,setCode]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('')
 async function submit(event){event.preventDefault();if(busy)return;setBusy(true);setError('');try{await onSubmit(code)}catch(e){setError(e.message)}finally{setBusy(false)}}
 return <AccessScene Brand={Brand} onBack={onBack} title="Вход как ученик" description="Введите код, который выдал учитель">{notice&&<p className={styles.error} role="alert">{notice}</p>}<form onSubmit={submit} className={styles.form}><label htmlFor="student-access-code">Код ученика</label><input id="student-access-code" value={code} onChange={e=>{setCode(e.target.value);setError('')}} placeholder="GNS-XXXX-XXXX" autoComplete="one-time-code" autoCapitalize="characters" spellCheck={false} required disabled={busy}/>{error&&<p role="alert" className={styles.error}>{error}</p>}<button type="submit" className={styles.primary} disabled={busy||!code.trim()}>{busy?'Проверяем код…':'Отправить запрос'}</button><small>Нет кода? Обратитесь к учителю.</small></form></AccessScene>
}
export default function StudentOnboarding({Brand,student,editing=false,onSave,onFinish,onCancel}){
 const [group,setGroup]=useState(null),[step,setStep]=useState(editing?'avatars':'group'),[selected,setSelected]=useState(editing?student.avatarId:null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[ready,setReady]=useState(false)
 const draftKey=`genius:avatar-draft:${student.id}`
 useEffect(()=>{if(!editing)try{const d=JSON.parse(sessionStorage.getItem(draftKey)||'null');if(['boys','girls'].includes(d?.group)){setGroup(d.group);setStep(d.step==='avatars'?'avatars':'group');if(studentAvatar(d.selected)?.group===d.group)setSelected(d.selected)}}catch{}setReady(true)},[draftKey,editing])
 useEffect(()=>{if(ready&&!editing)try{sessionStorage.setItem(draftKey,JSON.stringify({group,step,selected}))}catch{}},[ready,editing,draftKey,group,step,selected])
 async function save(){if(busy||!studentAvatar(selected))return;setBusy(true);setError('');try{await onSave(selected);try{sessionStorage.removeItem(draftKey)}catch{}}catch(e){setError(e.message)}finally{setBusy(false)}}
 const avatars=editing?studentAvatars:studentAvatars.filter(a=>a.group===group)
 return <AccessScene Brand={Brand} onBack={editing?onCancel:step==='avatars'?()=>setStep('group'):null} title={step==='group'?'Кто ты?':editing?'Изменить аватар':'Выбери аватар'} description={step==='group'?'Выбери вариант, чтобы мы показали подходящие аватарки':'Выбери персонажа, который тебе нравится.'}>
  {step==='group'?<><div className={styles.groups}>{[['boys','Мальчик'],['girls','Девочка']].map(([value,label])=><button type="button" key={value} aria-pressed={group===value} className={group===value?styles.selected:''} onClick={()=>{setGroup(value);setSelected(null)}}><StudentAvatar id={studentAvatars.find(a=>a.group===value).id} size={110}/><strong>{label}</strong>{group===value&&<span className={styles.check}>✓</span>}</button>)}</div><button type="button" className={styles.primary} disabled={!group} onClick={()=>setStep('avatars')}>Продолжить</button></>:<><div className={styles.grid} role="group" aria-label="Доступные аватары">{avatars.map(a=><button type="button" key={a.id} aria-pressed={selected===a.id} aria-label={`${a.group==='boys'?'Мальчик':'Девочка'}, ${a.label.toLowerCase()}`} className={selected===a.id?styles.selected:''} disabled={busy} onClick={()=>{setSelected(a.id);setError('')}}><StudentAvatar id={a.id} size={160}/>{selected===a.id&&<span className={styles.check}>✓</span>}</button>)}</div>{error&&<p role="alert" className={styles.error}>{error}</p>}<button type="button" className={styles.primary} disabled={!selected||busy} onClick={save}>{busy?'Сохраняем…':'Выбрать аватарку'}</button></>}
 </AccessScene>
}
export function OnboardingDone({Brand,student,onFinish}){
 return <AccessScene Brand={Brand} title="Готово!" description="Твоя аватарка установлена."><StudentAvatar id={student.avatarId} size={160}/><ul className={styles.done}><li>✓ Вход выполнен</li><li>✓ Профиль настроен</li><li>✓ Genius готов к работе</li></ul><button className={styles.primary} onClick={onFinish}>Перейти в профиль →</button></AccessScene>
}
