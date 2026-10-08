import {readFile,writeFile} from 'node:fs/promises';
for(const file of ['tools/autumn-review.mjs','tools/new-expert-browser-check.mjs','tools/expert-browser-check.mjs']){
 let s=await readFile(file,'utf8');
 s=s.replaceAll('expert-experience','cinematic-experience').replaceAll("'/categorias/expert-zone.html'","'/animaciones.html'");
 for(const selector of ['.code-link','.after-code'])s=s.replaceAll(`assert(await ev("document.querySelector('${selector}').hidden"))`,`assert(!await ev("document.querySelector('${selector}').hidden"))`);
 s=s.replace("await wait(`location.pathname==='/animaciones/${id}.html'`)","await wait(\"!document.querySelector('#download').disabled\")");
 s=s.replace("await wait(\"location.pathname==='/animaciones/eternal-bloom.html'\");report.codeRedirect=true;","await wait(\"!document.querySelector('#download').disabled\");report.codeDownload=true;");
 s=s.replace('assert(editorState.codeHidden&&editorState.source','assert(!editorState.codeHidden&&!editorState.source');
 s=s.replace("document.querySelector('.code-link').hidden && [...document.querySelectorAll('button')].some","!document.querySelector('.code-link').hidden && ![...document.querySelectorAll('button')].some");
 await writeFile(file,s);
}
// One-time migration helpers must never duplicate imports/controls on rerun.
for(const [file,target,marker]of [['tools/integrate-cinematic.mjs','js/expert-catalog.js',"cinematic:true"],['tools/wire-cinematic-colors.mjs','js/anim/eternal-bloom-renderer.js','sceneColors'],['tools/wire-palette-editor.mjs','js/crear.js','const colorKeys=']]){
 let s=await readFile(file,'utf8');if(!s.includes('Migration already applied'))s=s.replace(/(import [^\n]+;\n)/,`$1if((await readFile('${target}','utf8')).includes(${JSON.stringify(marker)})){console.log('Migration already applied');process.exit(0);}\n`);await writeFile(file,s);
}
console.log('Existing integration checks updated');
