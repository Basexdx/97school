import {test} from 'node:test'
import assert from 'node:assert/strict'
import {lockLocalProfile,localSessionOpen,setLocalPassword,unlockLocalProfile,AUTH_KEY} from '../app/local-auth.mjs'
import {PROFILE_KEY,saveLocalProfile,readLocalProfile} from '../app/standalone-mode.mjs'

test('existing profile enters with password while stored auth and progress remain intact',async()=>{
 const local=new Map(),session=new Map()
 globalThis.localStorage={getItem:k=>local.get(k)??null,setItem:(k,v)=>local.set(k,v)}
 globalThis.sessionStorage={getItem:k=>session.get(k)??null,setItem:(k,v)=>session.set(k,v),removeItem:k=>session.delete(k)}
 saveLocalProfile({nickname:'Учитель',grade:9})
 local.set('genius:lesson-views:v1',JSON.stringify(['lecture-9-01']))
 await setLocalPassword('old-password')
 const before={profile:local.get(PROFILE_KEY),auth:local.get(AUTH_KEY),views:local.get('genius:lesson-views:v1')}
 lockLocalProfile()
 assert.equal(localSessionOpen(),false)
 assert.equal(await unlockLocalProfile('wrong-password'),false)
 assert.equal(localSessionOpen(),false)
 assert.equal(await unlockLocalProfile('old-password'),true)
 assert.equal(localSessionOpen(),true)
 assert.equal(readLocalProfile().nickname,'Учитель')
 assert.equal(local.get(PROFILE_KEY),before.profile)
 assert.equal(local.get(AUTH_KEY),before.auth)
 assert.equal(local.get('genius:lesson-views:v1'),before.views)
})
