import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {checkOgeClozeAnswer,ogeClozeAnswerReady} from '../app/oge-cloze-answer.mjs'
import {ogeTasks} from '../app/oge-task-data.mjs'
import {parseOgeChoiceInput,requiredOgeChoices,restoreOgeChoiceAnswers,toggleOgeChoice} from '../app/oge-choice-answer.mjs'
import {isCorrectOgeNumber,parseOgeNumber} from '../app/oge-number-answer.mjs'
import {checkOgeCalculationAnswer,parseOgeCalculationNumber} from '../app/oge-calculation-answer.mjs'
import {ogeMatchingAnswerReady} from '../app/oge-matching-answer.mjs'
import {grade7Additions,grade8Additions,grade9Additions} from '../bank/peryshkin-additions.mjs'
import {checkAnswer,publishable} from '../shared/task-checker.mjs'
import {matchingAnswerValues,matchingParts} from '../shared/matching-utils.mjs'

const read=name=>JSON.parse(fs.readFileSync(new URL(`../bank/${name}`,import.meta.url)))

test('every FIPI task accepts its intended entry format and rejects malformed responses',()=>{
  assert.equal(new Set(ogeTasks.map(task=>task.id)).size,ogeTasks.length)
  const stored={}
  for(const task of ogeTasks){
    if(task.kind==='cloze'||task.kind==='change'){
      assert.equal(ogeClozeAnswerReady(task.answer,task),true,task.id)
      assert.equal(checkOgeClozeAnswer(task,task.answer),true,task.id)
    }else if(task.kind==='matching'){
      assert.equal(ogeMatchingAnswerReady(task.left.map(()=>task.right[0].id),task),true,task.id)
    }else if(task.kind==='choice'){
      const count=requiredOgeChoices(task)
      assert.ok(task.options.length>=count,task.id)
      assert.ok(task.options.every(option=>typeof option==='string'&&option.trim()),task.id)
      const entered=Array.from({length:count},(_,index)=>index+1)
      assert.deepEqual(parseOgeChoiceInput(entered.join(','),task),entered,task.id)
      assert.equal(parseOgeChoiceInput('11',task),null,task.id)
      assert.equal(parseOgeChoiceInput(String(task.options.length+1),task),null,task.id)
      assert.deepEqual(entered.reduce((previous,value)=>toggleOgeChoice(previous,value,task),[]),entered,task.id)
      stored[task.id]=entered
    }else if(task.kind==='calculation'){
      assert.equal(checkOgeCalculationAnswer(task,String(task.answer).replace('.',',')),true,task.id)
      assert.equal(checkOgeCalculationAnswer(task,String(task.answer+Math.max(1,Math.abs(task.answer)))),false,task.id)
      assert.equal(parseOgeCalculationNumber('1,2,3'),null,task.id)
    }else{
      assert.ok(task.kind==null||task.kind==='numeric',task.id)
      assert.ok(Number.isFinite(task.answer),task.id)
      assert.equal(isCorrectOgeNumber(String(task.answer).replace('.',','),task.answer),true,task.id)
      assert.equal(isCorrectOgeNumber(String(task.answer+Math.max(1,Math.abs(task.answer))),task.answer),false,task.id)
      assert.equal(parseOgeNumber('1,2,3'),null,task.id)
    }
  }
  assert.deepEqual(restoreOgeChoiceAnswers(JSON.parse(JSON.stringify(stored)),ogeTasks),stored)
  assert.deepEqual(restoreOgeChoiceAnswers({'unknown-task':[1]},ogeTasks),{})
})

test('every published textbook task exposes answer fields that can submit a correct response',()=>{
  const banks=[
    [...read('tasks-grade7.json'),...grade7Additions],
    [...read('tasks.json'),...read('tasks-grade8-additions.json'),...grade8Additions],
    [...read('tasks-grade9.json'),...grade9Additions],
  ]
  for(const [grade,tasks] of banks.entries()){
    assert.equal(new Set(tasks.map(task=>task.ID)).size,tasks.length,`grade ${grade+7}`)
    for(const task of tasks.filter(publishable)){
      const spec=task.ANSWER
      let answer
      switch(spec.mode){
        case 'numeric':
          assert.ok(Number.isFinite(spec.value),task.ID)
          answer=String(spec.value).replace('.',',')
          break
        case 'numeric_list':
          assert.ok(spec.fields?.length>0&&spec.fields.length===spec.values.length,task.ID)
          answer=spec.values.map(value=>String(value).replace('.',','))
          break
        case 'parts':
          assert.ok(spec.parts?.length>0,task.ID)
          answer=spec.parts.map(part=>{
            if(part.type==='numeric')return String(part.value).replace('.',',')
            const selected=part.options?.find(option=>part.values?.includes(option.id))
            assert.ok(selected,task.ID)
            return selected.id
          })
          break
        case 'set':
          assert.ok(spec.values?.length>0&&spec.values.every(value=>task.OPTIONS?.some(option=>option.id===value)),task.ID)
          answer=spec.values
          break
        case 'ordered':
          if(task.TASK_TYPE==='matching'){
            const {left,right}=matchingParts(task)
            answer=matchingAnswerValues(task)
            assert.equal(left.length,answer.length,task.ID)
            assert.ok(answer.every(value=>right.some(option=>option.id===value)),task.ID)
          }else if(task.CLASS===7){
            assert.ok(spec.values?.length===1&&task.OPTIONS?.some(option=>option.id===spec.values[0]),task.ID)
            answer=spec.values[0]
          }else{
            assert.equal(task.TASK_TYPE,'single_choice',task.ID)
            assert.ok(spec.values?.length===1&&new RegExp(`(?:^|\\n)${spec.values[0]}\\)`).test(task.TASK),task.ID)
            answer=spec.values[0]
          }
          break
        case 'manual':
          assert.ok([8,9].includes(task.CLASS),task.ID)
          answer='Решение:\nОтвет: 12,5'
          break
        default:assert.fail(`${task.ID}: unsupported answer mode ${spec.mode}`)
      }
      const checked=checkAnswer(task,answer)
      assert.equal(checked.correct,spec.mode==='manual'?null:true,task.ID)
    }
  }
})
