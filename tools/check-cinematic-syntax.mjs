import {spawnSync} from 'node:child_process';
import {readdir} from 'node:fs/promises';
const entries=await readdir('js/anim');
const names=['eternal-bloom','soul-butterfly','event-horizon','crystal-heartbeat','eternal-souls','haunted-night','dark-spell','expert-','autumn-','scene-colors'];
const files=[...entries.filter(f=>names.some(n=>f.startsWith(n))).map(f=>'js/anim/'+f),...['catalog','expert-catalog','autumn-expert-catalog','scene-palettes','crear','viewer','codigo','gallery','home','detail','overlay','share','standalone','project-export'].map(f=>'js/'+f+'.js'),...['build-cinematic-projects','cinematic-catalog-check','generate-seo','autumn-review','new-expert-browser-check','expert-browser-check','integrate-cinematic','wire-cinematic-colors','wire-palette-editor','update-cinematic-checks'].map(f=>'tools/'+f+'.mjs')];
for(const file of files){const result=spawnSync(process.execPath,['--check',file],{encoding:'utf8',windowsHide:true});if(result.status!==0){console.error(file,result.stderr);process.exit(1);}}
console.log(`Sintaxis verificada: ${files.length} módulos y herramientas. No hay un linter semántico configurado.`);
