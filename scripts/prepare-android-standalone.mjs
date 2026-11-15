import fs from 'node:fs'
import path from 'node:path'
// Keep the installed app's branding and version aligned with the desktop build.
const root=path.resolve('android/app/src/main'),res=path.join(root,'res')
const icon=fs.readFileSync('public/icons/icon-512.png')
fs.mkdirSync(path.join(res,'drawable'),{recursive:true})
fs.writeFileSync(path.join(res,'drawable/genius_launcher.png'),icon)
for(const directory of fs.readdirSync(res)){
 if(!directory.startsWith('mipmap-'))continue
 const target=path.join(res,directory)
 if(directory.includes('anydpi')){
  const adaptive='<?xml version="1.0" encoding="utf-8"?>\n<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android"><background android:drawable="@color/genius_background"/><foreground android:drawable="@drawable/genius_launcher"/></adaptive-icon>\n'
  for(const name of ['ic_launcher.xml','ic_launcher_round.xml'])fs.writeFileSync(path.join(target,name),adaptive)
 }else for(const name of ['ic_launcher.png','ic_launcher_round.png'])fs.writeFileSync(path.join(target,name),icon)
}
fs.writeFileSync(path.join(res,'values/genius.xml'),'<?xml version="1.0" encoding="utf-8"?><resources><color name="genius_background">#071525</color></resources>\n')
const gradle='android/app/build.gradle';let text=fs.readFileSync(gradle,'utf8');text=text.replace(/versionCode\s+\d+/,'versionCode 10800').replace(/versionName\s+"[^"]+"/,'versionName "1.8.0"');fs.writeFileSync(gradle,text)
const styles=path.join(res,'values/styles.xml');if(fs.existsSync(styles)){let text=fs.readFileSync(styles,'utf8');text=text.replaceAll('@drawable/splash','@drawable/genius_launcher');fs.writeFileSync(styles,text)}
console.log('Android Genius branding applied: 1.8.0 (10800)')
