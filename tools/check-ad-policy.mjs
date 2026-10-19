import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {publicAdPage,homeAdPlan,canRequestAd,consentAllowsAds,watchAdConsent} from '../js/ad-policy.js';

const request={url:'https://viralcss.com/',local:false,enabled:true,consentVerified:true,consentGranted:true,blocked:false,sceneCount:40,placement:'home-top',slotId:'1234567890'};
assert(canRequestAd(request));
for(const change of [{local:true},{enabled:false},{consentVerified:false},{consentGranted:false},{blocked:true},{sceneCount:1},{slotId:''},{placement:'viewer'}])assert(!canRequestAd({...request,...change}),JSON.stringify(change));
for(const path of ['/v?s=abc','/v.html?a=corazon-de-energia','/crear.html','/codigo.html','/404.html','/tools/scene-poster-qa.html','/?s=abc','/?email=persona%40example.test','/?cat=desconocida','/#dedicatoria-personal']){
 assert(!publicAdPage('https://viralcss.com'+path),path);
 assert(!canRequestAd({...request,url:'https://viralcss.com'+path}),path);
}
for(const path of ['/','/index.html','/?cat=flores','#galeria'])assert(publicAdPage('https://viralcss.com/'+path.replace(/^\//,'')),path);
assert.equal(homeAdPlan(0).size,0);assert.equal(homeAdPlan(3).size,0);
assert.deepEqual([...homeAdPlan(4)],['home-bottom']);assert.equal(homeAdPlan(10).size,5);
const consent={cmpStatus:'loaded',eventStatus:'useractioncomplete',gdprApplies:true,tcString:'CMP-test-signal',purpose:{consents:{1:true,3:true,4:true}},vendor:{consents:{755:true}}};
assert(consentAllowsAds(consent,true));
for(const change of [{cmpStatus:'error'},{eventStatus:'cmpuishown'},{gdprApplies:undefined},{tcString:''},{purpose:{consents:{1:false,3:true,4:true}}},{vendor:{consents:{755:false}}}])assert(!consentAllowsAds({...consent,...change},true));
assert(!consentAllowsAds(consent,false));
assert(consentAllowsAds({cmpStatus:'loaded',eventStatus:'tcloaded',gdprApplies:false},true));
let listener,removed;const results=[];
const stop=watchAdConsent(value=>results.push(value),{__tcfapi(command,version,callback,id){assert.equal(version,2);if(command==='addEventListener')listener=callback;else removed=id;},clearTimeout(){}});
listener({...consent,listenerId:42},true);listener({...consent,listenerId:42,purpose:{consents:{1:false}}},true);
assert.deepEqual(results,[true,false]);stop();assert.equal(removed,42);listener(consent,true);assert.deepEqual(results,[true,false]);
for(const file of ['crear.html','codigo.html','v.html','404.html','encargos.html']){
 const html=await readFile(file,'utf8');assert(!/data-ad-placement|src="(?:\/)?js\/ads.js/.test(html),`Utilidad con anuncios: ${file}`);
}
console.log('OK: rutas personales y errores excluidos; consentimiento desconocido/denegado y revocado; densidad; localhost sin anuncios.');
