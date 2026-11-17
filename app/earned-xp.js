export default function EarnedXp({amount}){
  return Number.isFinite(amount)?<span className="earned-task-xp">Получено за задачу: <strong>+{amount} XP</strong></span>:null
}
