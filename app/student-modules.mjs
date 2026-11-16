// A single manifest controls navigation and which independently loaded libraries
// are available in the standalone student application.
export const studentModules = [
  {id:'practice',icon:'◇',label:'Задачник',installed:true},
  {id:'topics',icon:'▦',label:'Учебник',installed:false},
  {id:'fipi',icon:'Φ',label:'Банк заданий ФИПИ',installed:true},
  {id:'materials',icon:'▤',label:'Справочные материалы',installed:true},
  {id:'formulas',icon:'Σ',label:'Основные формулы',installed:true},
  {id:'labs',icon:'⚗',label:'Лабораторные работы',installed:false},
]
export const studentModule = id => studentModules.find(module=>module.id===id)
