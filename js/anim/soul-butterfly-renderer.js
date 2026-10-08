import {sceneColors} from './scene-colors.js';
import {expertRenderer,ease,random,pointMaterial,moteFragment} from './expert-runtime.js';
import {wingGeometry,wingMaterial} from './soul-butterfly-geometry.js';
import {messageTargets} from './expert-typography.js';
export const SOUL_MESSAGE='Hay personas que iluminan nuestra vida. Tú eres una de ellas.';

export function createSoulRenderer(w,h,options={}){return expertRenderer(w,h,{maxRatio:1.5,lowRatio:.85,...options},({T,scene,camera,keep,low})=>{
 const butterfly=new T.Group();scene.add(butterfly);
 const membrane=keep(wingMaterial()),wings=[];
 for(const side of [-1,1])for(const kind of ['fore','hind']){
  const group=new T.Group();group.scale.x=side;butterfly.add(group);const geometry=keep(wingGeometry(kind)),mesh=new T.Mesh(geometry,membrane);group.add(mesh);wings.push({group,mesh,kind,side});
 }
 const bodyMat=keep(new T.MeshPhysicalMaterial({color:0x101a29,roughness:.25,metalness:.4,iridescence:.7,clearcoat:1}));
 const bodyPoints=[[-.86,.008],[-.74,.045],[-.55,.066],[-.30,.079],[-.1,.12],[.1,.13],[.25,.095],[.38,.075],[.48,.01]].map(([y,r])=>new T.Vector2(r,y));
 butterfly.add(new T.Mesh(keep(new T.LatheGeometry(bodyPoints,32)),bodyMat));
 const filament=keep(new T.MeshStandardMaterial({color:0x9ccdd4,emissive:0x246a73,emissiveIntensity:.3,roughness:.4}));
 for(const side of [-1,1]){
  const curve=new T.CatmullRomCurve3([new T.Vector3(side*.04,.33,.04),new T.Vector3(side*.14,.64,.1),new T.Vector3(side*.27,.82,.07),new T.Vector3(side*.32,.78,.04)]);
  butterfly.add(new T.Mesh(keep(new T.TubeGeometry(curve,30,.009,6,false)),filament));
 }
 const key=new T.DirectionalLight(0xc5f6ff,3);key.position.set(-3,4,4);scene.add(key);
 const rim=new T.DirectionalLight(0xab72ed,2.8);rim.position.set(3,1,-2);scene.add(rim);scene.add(new T.AmbientLight(0x667a91,.6));
 const count=low?1100:3000,positions=new Float32Array(count*3),targets=new Float32Array(count*3),ids=new Float32Array(count),sideAttr=new Float32Array(count),hind=new Float32Array(count);
 for(let i=0;i<count;i++){
  positions.set([(random(i+20)-.5)*10,(random(i+4000)-.5)*9,(random(i+7000)-.5)*9],i*3);ids[i]=i;
  const wing=wings[i%4],a=wing.mesh.geometry.attributes.position,v=Math.floor(random(i+17)*a.count/2);targets.set([a.getX(v)*wing.side,a.getY(v),a.getZ(v)],i*3);sideAttr[i]=wing.side;hind[i]=wing.kind==='hind'?1:0;
 }
 const geo=keep(new T.BufferGeometry());geo.setAttribute('position',new T.BufferAttribute(positions,3));geo.setAttribute('aTarget',new T.BufferAttribute(targets,3));geo.setAttribute('aId',new T.BufferAttribute(ids,1));geo.setAttribute('aSide',new T.BufferAttribute(sideAttr,1));geo.setAttribute('aHind',new T.BufferAttribute(hind,1));geo.setAttribute('aMessage',new T.BufferAttribute(new Float32Array(count*3),3));
 const mat=keep(pointMaterial({uTime:{value:0},uForm:{value:0},uBurst:{value:0},uMessage:{value:0},uRatio:{value:1},uOrigin:{value:new T.Vector3()},uFlap:{value:0},uRoll:{value:0},uTilt:{value:0},uScale:{value:1}},`
  attribute vec3 aTarget,aMessage;attribute float aId,aSide,aHind;
  uniform float uTime,uForm,uBurst,uMessage,uRatio,uFlap,uRoll,uTilt,uScale;uniform vec3 uOrigin;
  varying vec3 vColor;varying float vAlpha;
  void main(){float phase=aId*2.39996;vec3 free=position+vec3(sin(uTime*.2+phase),cos(uTime*.17+phase),sin(uTime*.13+phase))*.15;
   float flap=uFlap*aSide*(1.-aHind*.13),c=cos(flap),s=sin(flap);vec3 target=vec3(aTarget.x*c+aTarget.z*s,aTarget.y,-aTarget.x*s+aTarget.z*c);
   target.xy=mat2(cos(uRoll),sin(uRoll),-sin(uRoll),cos(uRoll))*target.xy;
   target.yz=mat2(cos(uTilt),sin(uTilt),-sin(uTilt),cos(uTilt))*target.yz;target=target*uScale+uOrigin;
   vec3 p=mix(free,target,uForm);p+=normalize(aTarget+vec3(.01))*uBurst*(.6+fract(aId*.618)*1.2);
   vec4 clip=projectionMatrix*modelViewMatrix*vec4(p,1.);gl_Position=mix(clip,vec4(aMessage,1.),uMessage);
   gl_PointSize=mix(clamp((1.+fract(aId*.37)*1.8)*uRatio*13./max(1.,clip.w),1.,5.),2.2*uRatio,uMessage);
   vColor=mix(mix(vec3(.08,.55,.77),vec3(.54,.19,.79),.5+.5*sin(phase)),vec3(.35,.72,1.1),uMessage);vAlpha=mix(mix(.35,.72,uForm),.95,uMessage);
  }`,moteFragment));scene.add(new T.Points(geo,mat));
 // A persistent pool follows the actual flight history, with no per-frame objects.
 const trailCount=low?130:340,trailPositions=new Float32Array(trailCount*3),trailIds=Float32Array.from({length:trailCount},(_,i)=>i);
 const trailGeo=keep(new T.BufferGeometry());trailGeo.setAttribute('position',new T.BufferAttribute(trailPositions,3));trailGeo.setAttribute('aId',new T.BufferAttribute(trailIds,1));
 const trailMat=keep(pointMaterial({uTime:{value:0},uAlpha:{value:0},uRatio:{value:1}},`attribute float aId;uniform float uTime,uAlpha,uRatio;varying vec3 vColor;varying float vAlpha;void main(){vec4 p=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*p;gl_PointSize=clamp(uRatio*17./-p.z,1.,5.);vColor=mix(vec3(.12,.7,.85),vec3(.5,.2,.8),fract(aId*.618));vAlpha=uAlpha*(.1+.5*fract(aId*.37));}`,moteFragment));scene.add(new T.Points(trailGeo,trailMat));
 const originSample=new T.Vector3(),trailSample=new T.Vector3();
 function flight(t,out){const f=ease((t-6.8)/4.4),a=f*Math.PI*2;return out.set(Math.sin(a)*.6*Math.sin(f*Math.PI),.45+Math.sin(a*1.1)*.55*Math.sin(f*Math.PI),Math.sin(f*Math.PI)*1.25);}
 let cardKey='',messageAvailable=false;
 const palette=sceneColors('soul-butterfly',scene);palette.tint('c1',membrane).bind('c2',rim.color).tint('c3',mat).tint('c3',trailMat).bind('c4',key.color);
 return {
  update(t,dt,pointer,motion,card,ratio){
   palette.update(card);
   const still=motion?t:20,form=ease((t-.6)/3.8),reveal=ease((t-2.4)/2.8),flightP=motion?ease((t-6.8)/4.4):1;
   const origin=flight(still,originSample),roll=Math.sin(flightP*Math.PI*2)*.28*Math.sin(flightP*Math.PI),flap=(.28+.65*Math.pow(.5+.5*Math.sin(still*4.5+Math.sin(still*.7)*.3),1.5))*(1-ease((t-10.8)/1)*.6);
   butterfly.position.copy(origin);butterfly.rotation.z=roll;butterfly.rotation.x=.12+Math.sin(still*.2)*.06;
   const dissolve=ease((t-11.5)/.8)*(1-ease((t-14)/2.4));butterfly.scale.setScalar(1-dissolve*.15);butterfly.visible=reveal>.001;
   for(const wing of wings)wing.group.rotation.y=flap*wing.side*(wing.kind==='hind'?.87:1);
   membrane.userData.uniforms.uTime.value=still;membrane.userData.uniforms.uReveal.value=reveal*(1-dissolve*.88);
   const key=JSON.stringify([card.m,card.f,card.tm]);if(key!==cardKey){cardKey=key;geo.attributes.aMessage.array.set(messageTargets(w,h,card,SOUL_MESSAGE,count));geo.attributes.aMessage.needsUpdate=true;messageAvailable=card.tm!=='none';}
   mat.uniforms.uTime.value=still;mat.uniforms.uForm.value=form;mat.uniforms.uFlap.value=flap;mat.uniforms.uRoll.value=roll;mat.uniforms.uTilt.value=butterfly.rotation.x;mat.uniforms.uScale.value=butterfly.scale.x;mat.uniforms.uOrigin.value.copy(origin);mat.uniforms.uRatio.value=ratio;
   mat.uniforms.uBurst.value=Math.sin(Math.PI*ease((t-11.2)/1.6))*.8;
   mat.uniforms.uMessage.value=messageAvailable?ease((t-12.2)/2.3)*(1-ease((t-16.2)/1.4)):0;
   if(t>17){mat.uniforms.uForm.value=.82;mat.uniforms.uBurst.value=.08;}
   for(let i=0;i<trailCount;i++){const age=i/trailCount*1.6,p=flight(still-age,trailSample);trailPositions[i*3]=p.x+(random(i+1)-.5)*age*.3;trailPositions[i*3+1]=p.y+(random(i+42)-.5)*age*.3;trailPositions[i*3+2]=p.z+(random(i+81)-.5)*age*.4;}trailGeo.attributes.position.needsUpdate=true;
   trailMat.uniforms.uAlpha.value=ease((t-7)/.7)*(1-ease((t-12)/1));trailMat.uniforms.uRatio.value=ratio;
   const distance=Math.max(8.8,6.6/(w/h));camera.position.set(pointer.x*.85+Math.sin(still*.10)*.18,pointer.y*.55+.25,distance);camera.lookAt(0,-.45,0);
  },
  reduce(){geo.setDrawRange(0,1100);trailGeo.setDrawRange(0,130);},
  stats:()=>({...palette.stats(),wings:4,particles:Math.min(count,geo.drawRange.count)}),
 };
});}
