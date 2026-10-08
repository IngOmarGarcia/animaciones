import {sceneColors} from './scene-colors.js';
import * as T from '../vendor/three/three.module.min.js';
import {expertRenderer,ease,random} from './expert-runtime.js';
import {workshop,candle,petalGeometry,motes,fogBank} from './autumn-atmosphere.js';
import {skullGeometry,ornamentPaths} from './eternal-souls-geometry.js';
import {messageTargets} from './expert-typography.js';

export const SOULS_MESSAGE='Mientras viva en nuestros recuerdos, nunca se irá.';
export function createSoulsRenderer(w,h,options={}) {
 return expertRenderer(w,h,{...options,maxRatio:1.5},ctx=>{
  const {scene,camera,keep,low}=ctx,W=workshop(ctx);scene.background=new T.Color(0x080b21);scene.fog=new T.FogExp2(0x101128,.035);
  const stone=W.mat('altar',{color:0x282031,roughness:.85}),gold=W.mat('gold',{color:0xe9b75c,metalness:.88,roughness:.23,emissive:0xa34a08,emissiveIntensity:.1});
  W.box(stone,scene,0,-1.35,-1,8,.38,6);for(const x of [-3.95,3.95])W.box(gold,scene,x,-1.14,-1,.035,.025,6);for(const z of [-3.95,1.95])W.box(gold,scene,0,-1.14,z,8,.025,.035);
  const papel=W.mat('papel-picado',{color:0x412b5c,roughness:.96,side:T.DoubleSide,envMapIntensity:.1}),banners=[];
  const flag=new T.Shape();flag.moveTo(-.4,.35);flag.lineTo(.4,.35);flag.lineTo(.4,-.25);for(let i=0;i<=12;i++){const x=.4-i/12*.8;flag.lineTo(x,-.25-Math.sin(i/12*Math.PI*6)*.035);}flag.closePath();
  for(let j=0;j<6;j++){const a=j*Math.PI/3,hole=new T.Path();hole.absellipse(Math.cos(a)*.13,Math.sin(a)*.13,.07,.10,a,a+Math.PI*2,true,a);flag.holes.push(hole);}const hole=new T.Path();hole.absarc(0,0,.05,0,Math.PI*2,true);flag.holes.push(hole);
  const flagGeo=keep(new T.ShapeGeometry(flag,12));for(let i=0;i<9;i++){const x=(i-4)*.88,mesh=W.mesh(flagGeo,papel,scene,x,2.9+Math.abs(x)*.12,-3.1);banners.push(mesh);}
  W.tube([new T.Vector3(-4,3.7,-3.1),new T.Vector3(0,3.25,-3.1),new T.Vector3(4,3.7,-3.1)],.008,gold);
  const head=new T.Group();head.position.set(0,.6,-.3);scene.add(head);
  const glass=keep(new T.MeshPhysicalMaterial({color:0xeee0d3,roughness:.13,metalness:.08,transmission:low?.38:.72,thickness:.65,ior:1.47,clearcoat:1,attenuationColor:0xf6b257,attenuationDistance:3,envMapIntensity:1.5}));
  W.mesh(skullGeometry(keep),glass,head);
  // Ivory-gold teeth follow the curve of the jaw, each with a beveled crown.
  const toothGeo=W.geo('tooth',()=>new T.CapsuleGeometry(.075,.13,4,8));
  for(let i=0;i<12;i++){const x=(i-5.5)*.105;W.mesh(toothGeo,gold,head,x,-.76,.69-Math.abs(x)*.18,1,.8,1);}
  const paths=ornamentPaths(),engraving=new T.Group();head.add(engraving);
  for(const path of paths)W.tube(path,.012,gold,engraving);
  const light=W.light(0xffb24e,0,-1.4,.2,2),rim=W.light(0x786cff,12,2,3,-2);
  const candles=[];for(let i=0;i<7;i++){const x=(i-3)*.82,z=Math.abs(i-3)*.3+.45;candles.push(candle(W,keep,scene,x,-1.12,z,.48+random(i)*.5));}
  const petal=petalGeometry(keep),orange=W.mat('marigold',{color:0xf99b1d,roughness:.49,metalness:.06,side:T.DoubleSide,emissive:0x9e3100,emissiveIntensity:.12});
  const flowerCount=17,per=110,flowers=new T.InstancedMesh(petal,orange,flowerCount*per);scene.add(flowers);const dummy=new T.Object3D();
  const centers=Array.from({length:flowerCount},(_,i)=>new T.Vector3((random(i+180)-.5)*5.5,-.95+random(i+15)*.13,(random(i+270)-.5)*2.5));
  const flying=new T.InstancedMesh(petal,orange,low?150:360);scene.add(flying);
  const dust=motes(ctx,low?650:2400,0xffb84b,7),fog=fogBank(W,keep,scene,0x493269,7);
  const traceCount=low?900:2600,tracePositions=[],traceSeeds=[];
  for(let i=0;i<traceCount;i++){const path=paths[i%paths.length],p=path[Math.floor(random(i+800)*path.length)];tracePositions.push(p.x,p.y+.6,p.z-.3);traceSeeds.push(random(i+690));}
  const traceGeo=keep(new T.BufferGeometry());traceGeo.setAttribute('position',new T.Float32BufferAttribute(tracePositions,3));traceGeo.setAttribute('seed',new T.Float32BufferAttribute(traceSeeds,1));
  const traceMat=keep(new T.ShaderMaterial({transparent:true,depthWrite:false,blending:T.AdditiveBlending,uniforms:{time:{value:0}},vertexShader:`attribute float seed;uniform float time;varying float alpha;varying float flower;void main(){float a=clamp((time-10.8-seed*1.6)/3.,0.,1.);vec3 p=position;float spiral=seed*64.+a*9.;p+=vec3(cos(spiral)*a*1.5,sin(spiral)*a+a*.6,a*a*7.);vec4 v=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*v;gl_PointSize=clamp((7.+a*65.)/-v.z,1.,24.);alpha=smoothstep(0.,.1,a)*(1.-smoothstep(.7,1.,a));flower=a;}`,fragmentShader:`varying float alpha,flower;void main(){vec2 p=gl_PointCoord-.5;float a=atan(p.y,p.x),r=length(p);float shape=.25+.07*cos(a*9.);float f=mix(exp(-r*r*45.),smoothstep(shape,shape-.05,r),smoothstep(.2,.5,flower));gl_FragColor=vec4(vec3(1.,.6,.13)*2.,f*alpha);}`}));scene.add(new T.Points(traceGeo,traceMat));
  const wordGeo=keep(new T.BufferGeometry()),wordCount=low?900:1800;wordGeo.setAttribute('position',new T.Float32BufferAttribute(tracePositions.slice(0,wordCount*3),3));wordGeo.setAttribute('target',new T.BufferAttribute(new Float32Array(wordCount*3),3));
  const wordMat=keep(new T.ShaderMaterial({transparent:true,depthWrite:false,blending:T.AdditiveBlending,uniforms:{time:{value:0}},vertexShader:`attribute vec3 target;uniform float time;varying float alpha;void main(){float p=smoothstep(14.5,16.5,time);vec4 world=projectionMatrix*modelViewMatrix*vec4(position+vec3(sin(position.y*8.+time)*.2,.2,0.),1.);world/=world.w;gl_Position=mix(world,vec4(target,1.),p);gl_PointSize=2.;alpha=smoothstep(14.,14.5,time)*(1.-smoothstep(16.8,17.8,time));}`,fragmentShader:`varying float alpha;void main(){float d=length(gl_PointCoord-.5);gl_FragColor=vec4(1.,.75,.3,exp(-d*d*28.)*alpha);}`}));
  const words=new T.Points(wordGeo,wordMat);words.frustumCulled=false;scene.add(words);let wordKey='';
  let flowerStage=-1;
  const palette=sceneColors('eternal-souls',scene);palette.tint('c1',orange).tint('c2',gold).bind('c3',dust.uniforms.color.value).tint('c3',traceMat).tint('c3',wordMat).bind('c4',light.color);
  return {update(t,dt,p,motion,card){
   palette.update(card);
   const nextKey=JSON.stringify([card.m,card.f,card.tm]);if(nextKey!==wordKey){wordKey=nextKey;wordGeo.attributes.target.array.set(messageTargets(w,h,card,SOULS_MESSAGE,wordCount));wordGeo.attributes.target.needsUpdate=true;}words.visible=card.tm!=='none'&&(card.m??SOULS_MESSAGE).length>0&&t>14&&t<18;wordMat.uniforms.time.value=t;
   const ignite=ease(t/2),reveal=ease((t-7)/3.5),bloom=ease((t-10)/3),wow=ease((t-11)/1.3)*(1-ease((t-14)/2));
   for(let i=0;i<banners.length;i++)banners[i].rotation.x=Math.sin(t*.55+i)*.045;
   head.visible=t>6.8;head.scale.setScalar(.78+.22*reveal);head.position.y=.28+.32*reveal;head.rotation.y=-.2*(1-reveal)+p.x*.15;
   light.intensity=ignite*(7+Math.sin(t*13)*.35);rim.intensity=2+reveal*7;gold.emissiveIntensity=.04+wow*.8;traceMat.uniforms.time.value=t;
   for(let i=0;i<candles.length;i++)candles[i].update(t+i,ease((t-i*.16)/1.4),camera);
   if(Math.abs(bloom-flowerStage)>.002){flowerStage=bloom;for(let f=0;f<flowerCount;f++)for(let j=0;j<per;j++){
    const a=j*2.39996,r=Math.sqrt(j/per)*.19,opening=bloom*.7+.15;dummy.position.copy(centers[f]).add(new T.Vector3(Math.cos(a)*r,.09*(1-j/per),Math.sin(a)*r));dummy.rotation.set(-Math.PI/2+Math.sqrt(j/per)*opening,a,0,'YXZ');dummy.scale.set(.24,.19+random(j+f)*.08,.23);dummy.updateMatrix();flowers.setMatrixAt(f*per+j,dummy.matrix);
   }flowers.instanceMatrix.needsUpdate=true;}
   for(let i=0;i<flying.count;i++){
    const s=random(i+78),age=(t*.075+s)%1,a=i*2.399+age*8,z=3-age*8;
    const spiral=ease((t-4)/4),r=.3+Math.sin(age*Math.PI)*1.3;
    dummy.position.set(Math.sin(a)*r*spiral+(1-spiral)*Math.sin(z)*.4,-.9+age*(1+spiral*3),z);
    if(wow>0){dummy.position.x+=Math.cos(a)*wow*2;dummy.position.z+=wow*s*5;}
    dummy.rotation.set(t*(.4+s)+i,a*.3,Math.sin(t+s*30));dummy.scale.setScalar((.08+s*.13)*ease((t-1.5)/3));dummy.updateMatrix();flying.setMatrixAt(i,dummy.matrix);
   }flying.instanceMatrix.needsUpdate=true;
   dust.uniforms.time.value=t;dust.uniforms.power.value=ease((t-3)/5)*(.35+wow);dust.uniforms.burst.value=wow*.35;dust.uniforms.touch.value.set(p.x*5,p.y*5+1);fog.update(t);
   const follow=ease((t-2)/5),pull=ease((t-12)/4),wide=w/h>1?1:1.32;
   camera.position.set(-1.7*(1-follow)+Math.sin(t*.12)*.12*pull+p.x*.3,.1+follow*1.8-pull*.35,((5.5-follow*1.2)+pull*2.3)*wide);
   camera.lookAt(-.9*(1-follow),.12+follow*.45,-.3);camera.fov=36;camera.updateProjectionMatrix();
  },reduce(){dust.reduce();flying.count=Math.min(flying.count,150);},stats:()=>({...palette.stats(),artwork:'eternal-souls',skull:'continuous-implicit-volume',petals:flying.count,flowers:flowerCount})};
 });
}
