import test from 'node:test'
import assert from 'node:assert/strict'
import {buildSync} from 'esbuild'
import {createRequire} from 'node:module'
const require=createRequire(import.meta.url),mod={exports:{}}
const bundle=buildSync({stdin:{contents:`import React from 'react';import {renderToStaticMarkup} from 'react-dom/server';import Connection from './app/connection-screen';export const render=props=>renderToStaticMarkup(React.createElement(Connection,props))`,resolveDir:process.cwd(),loader:'jsx'},bundle:true,write:false,format:'cjs',platform:'node',jsx:'automatic',loader:{'.js':'jsx','.css':'empty','.module.css':'empty'}})
new Function('require','module','exports',bundle.outputFiles[0].text)(require,mod,mod.exports)
const render=mod.exports.render,base={className:'8Б',codeLabel:'ключ №17',requestedAt:'23:31'}
test('student connection presents the correct action for every status',()=>{
 const pending=render({request:{...base,status:'PENDING'}})
 assert.match(pending,/Ждём подтверждения/);assert.match(pending,/Класс 8Б \(17\)/);assert.match(pending,/23:31/);assert.match(pending,/Статус обновляется автоматически/);assert.doesNotMatch(pending,/Подтвердить подключение<\/button>/)
 const approved=render({request:{...base,status:'APPROVED'}});assert.match(approved,/Подключение подтверждено/);assert.match(approved,/Открыть Genius/);assert.doesNotMatch(approved,/автоматически проверять/)
 const rejected=render({request:{...base,status:'REJECTED'}});assert.match(rejected,/Запрос отклонён/);assert.match(rejected,/Ввести другой код/)
})
test('teacher connection has approval actions only while a request is pending',()=>{
 const pending=render({teacher:true,request:{...base,status:'PENDING'}});assert.match(pending,/Подтвердить подключение/);assert.match(pending,/Отклонить запрос/);assert.doesNotMatch(pending,/Открыть вход учителя для демо/)
 for(const status of ['APPROVED','REJECTED']){const html=render({teacher:true,request:{...base,status}});assert.doesNotMatch(html,/Открыть экран ученика/);assert.doesNotMatch(html,/Отклонить запрос/)}
 assert.match(render({teacher:true,request:null}),/Новых запросов нет/)
})
