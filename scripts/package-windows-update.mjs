import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import zlib from 'node:zlib'
import {createPackage} from '@electron/asar'
const version=process.env.GENIUS_UPDATE_VERSION||'1.8.3',stage=fs.mkdtempSync(path.join(os.tmpdir(),'genius-update-')),release=path.resolve('release/windows')
fs.mkdirSync(release,{recursive:true});fs.cpSync('out',path.join(stage,'out'),{recursive:true});fs.cpSync('desktop',path.join(stage,'desktop'),{recursive:true})
const base=JSON.parse(fs.readFileSync('package.json','utf8'))
// Electron's package name defines its existing user-data directory. Never rename it.
fs.writeFileSync(path.join(stage,'package.json'),JSON.stringify({name:base.name,version,private:true,main:'desktop/main.cjs'},null,2))
const archive=path.join(stage,'app.asar');await createPackage(stage,archive)
const readme=`Обновление Genius ${version} для Windows (версия 1.8.0 и новее)\r\n\r\n1. Полностью закройте Genius.\r\n2. Найдите папку, где находится Genius.exe. Можно нажать правой кнопкой по ярлыку и выбрать «Расположение файла».\r\n3. Скопируйте папку resources из этого архива в папку Genius.exe. Подтвердите замену файла resources/app.asar.\r\n4. Запустите Genius. При первом входе после обновления укажите имя, фамилию и класс, выберите аватар, задайте логин и новый пароль. Затем входите по этому логину и паролю.\r\n\r\nПрофиль, ответы, просмотры, XP и статистика остаются на устройстве. Прежний пароль вводить не нужно: после задания нового пароля сохранённый прогресс остаётся привязанным к этому устройству. Учебник и лабораторные работы пока отображаются как незагруженные библиотеки.\r\n\r\nПакет меняет только файлы приложения и не содержит пользовательских данных. Не удаляйте установленное приложение или его папку данных.\r\n`
const crcTable=Array.from({length:256},(_,n)=>{for(let k=0;k<8;k++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0})
const crc32=buffer=>{let c=0xffffffff;for(const b of buffer)c=crcTable[(c^b)&255]^(c>>>8);return (c^0xffffffff)>>>0}
const now=new Date(),dosDate=((now.getFullYear()-1980)<<9)|((now.getMonth()+1)<<5)|now.getDate()
const local=[],central=[];let offset=0
for(const [name,bytes] of [['resources/app.asar',fs.readFileSync(archive)],['Обновление_Genius.txt',Buffer.from(readme)]]){
 const filename=Buffer.from(name),compressed=zlib.deflateRawSync(bytes,{level:9}),crc=crc32(bytes),header=Buffer.alloc(30)
 header.writeUInt32LE(0x04034b50,0);header.writeUInt16LE(20,4);header.writeUInt16LE(0x800,6);header.writeUInt16LE(8,8);header.writeUInt16LE(dosDate,12);header.writeUInt32LE(crc,14);header.writeUInt32LE(compressed.length,18);header.writeUInt32LE(bytes.length,22);header.writeUInt16LE(filename.length,26)
 const directory=Buffer.alloc(46);directory.writeUInt32LE(0x02014b50,0);directory.writeUInt16LE(20,4);directory.writeUInt16LE(20,6);directory.writeUInt16LE(0x800,8);directory.writeUInt16LE(8,10);directory.writeUInt16LE(dosDate,14);directory.writeUInt32LE(crc,16);directory.writeUInt32LE(compressed.length,20);directory.writeUInt32LE(bytes.length,24);directory.writeUInt16LE(filename.length,28);directory.writeUInt32LE(offset,42)
 local.push(header,filename,compressed);central.push(directory,filename);offset+=header.length+filename.length+compressed.length
}
const directory=Buffer.concat(central),end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50,0);end.writeUInt16LE(2,8);end.writeUInt16LE(2,10);end.writeUInt32LE(directory.length,12);end.writeUInt32LE(offset,16)
const output=path.join(release,`Genius-Windows-Update-${version}.zip`);fs.writeFileSync(output,Buffer.concat([...local,directory,end]));fs.rmSync(stage,{recursive:true,force:true});console.log(`Created ${output}`)
