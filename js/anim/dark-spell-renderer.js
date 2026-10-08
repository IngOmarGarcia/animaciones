import {sceneColors} from './scene-colors.js';
import * as T from '../vendor/three/three.module.min.js';
import {expertRenderer,ease,random} from './expert-runtime.js';
import {workshop,candle,motes,bakeStatic} from './autumn-atmosphere.js';
import {forbiddenBook} from './dark-spell-book.js';
export const SPELL_MESSAGE='Que la magia de esta noche te acompañe. ✨';

function magicCircle(keep,radius,index){
 const m=keep(new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending,uniforms:{time:{value:0},power:{value:0}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:`varying vec2 vUv;uniform float time,power;float line(float d,float w){return 1.-smoothstep(w,w+.004,abs(d));}void main(){vec2 p=(vUv-.5)*2.;float r=length(p),a=atan(p.y,p.x);float rings=line(r-.91,.006)+line(r-.86,.003)+line(r-.68,.004);float sectors=mod(a*12./3.14159+time*.1,1.);float rune=step(.12,sectors)*step(sectors,.2)*step(.71,r)*step(r,.82);float star=line(r-(.46+.13*cos(a*6.)),.006);float fade=smoothstep(1.,.95,r);gl_FragColor=vec4(mix(vec3(.35,.12,.9),vec3(.9,.66,.28),.35)*1.7,(rings+rune+star)*power*fade);}`}));
 const mesh=new T.Mesh(keep(new T.PlaneGeometry(radius*2,radius*2)),m);mesh.rotation.x=-Math.PI/2+index*.17;return {mesh,m};
}

export function createSpellRenderer(w,h,options={}){
 return expertRenderer(w,h,{...options,maxRatio:1.45},ctx=>{
  const {scene,camera,keep,low}=ctx,W=workshop(ctx);scene.background=new T.Color(0x0b0815);scene.fog=new T.FogExp2(0x100c20,.055);
  const walnut=W.mat('walnut',{color:0x271b22,roughness:.85,envMapIntensity:.12}),stone=W.mat('stone',{color:0x3e3742,roughness:.89,envMapIntensity:.15}),brass=W.mat('brass',{color:0x987449,roughness:.4,metalness:.75,envMapIntensity:.5});
  const library=new T.Group();scene.add(library);
  W.box(stone,library,0,-.2,-2,18,.3,18);W.box(walnut,library,0,3.2,-5,16,6.5,.3);
  const spines=new T.InstancedMesh(W.geo('volume',()=>new T.BoxGeometry(1,1,1)),W.mat('spines',{color:0xffffff,roughness:.82,envMapIntensity:.15}),576);library.add(spines);const dummy=new T.Object3D(),color=new T.Color();let bi=0;
  for(let k=0;k<6;k++){
   const x=(k-2.5)*2.1;
   for(const side of [-1,1])W.box(walnut,library,x+side*.95,2.65,-4.6,.12,5.3,.7);
   for(let level=0;level<4;level++){
    const y=.45+level*1.15;W.box(walnut,library,x,y,-4.6,2,.13,.8);W.box(brass,library,x,y+.065,-4.12,2,.025,.025);
    for(let j=0;j<24;j++){const s=random(k*100+level*24+j),height=.62+s*.35;dummy.position.set(x-.87+j*.075,y+height/2+.08,-4.4);dummy.scale.set(.045+s*.024,height,.37+s*.1);dummy.rotation.z=(random(j+k+level)-.5)*.1;dummy.updateMatrix();spines.setMatrixAt(bi,dummy.matrix);color.setHSL(.02+s*.12,.16+s*.22,.08+s*.1);spines.setColorAt(bi++,color);}
   }
   const arch=[];for(let i=0;i<=40;i++){const a=i/40*Math.PI;arch.push(new T.Vector3(x+Math.cos(a)*.95,4.6+Math.sin(a)*.85,-4.08));}W.tube(arch,.065,brass,library);
  }
  for(const x of [-3,3]){W.mesh(W.geo('pillar',()=>new T.CylinderGeometry(.22,.3,5.5,12)),stone,library,x,2.65,-1.8);W.mesh(W.geo('capital',()=>new T.CylinderGeometry(.4,.3,.22,12)),brass,library,x,5.3,-1.8);}
  bakeStatic(library,keep); // instanced books remain instanced
  W.mesh(W.geo('pedestal-base',()=>new T.CylinderGeometry(1.1,1.25,.24,8)),stone,scene,0,.06,0);
  W.mesh(W.geo('pedestal',()=>new T.CylinderGeometry(.55,.85,1.1,8)),stone,scene,0,.68,0);
  W.mesh(W.geo('capital-top',()=>new T.CylinderGeometry(1.18,1,.2,8)),brass,scene,0,1.26,0);
  W.mesh(W.geo('slab',()=>new T.CylinderGeometry(1.22,1.22,.12,8)),stone,scene,0,1.38,0);
  const pedestalDetail=new T.Group();scene.add(pedestalDetail);
  for(let i=0;i<16;i++){const a=i/16*Math.PI*2;W.tube([new T.Vector3(Math.cos(a)*.76,.2,Math.sin(a)*.76),new T.Vector3(Math.cos(a+.03)*.63,.65,Math.sin(a+.03)*.63),new T.Vector3(Math.cos(a)*.55,1.15,Math.sin(a)*.55)],.022,brass,pedestalDetail);}
  for(const [y,r]of [[.18,.89],[1.19,.74],[1.4,1.17]]){const ring=W.mesh(W.geo('pedestal-ring-'+r,()=>new T.TorusGeometry(r,.028,6,64)),brass,pedestalDetail,0,y,0);ring.rotation.x=Math.PI/2;}bakeStatic(pedestalDetail,keep);
  const candles=[];for(const x of [-2.1,2.1]){for(let j=0;j<3;j++)candles.push(candle(W,keep,scene,x+(j-1)*.27,.05,-.8-j*.35,.8+j*.3));W.light(0xffad4e,3.2,x,1.2,-1,7);}
  const arcane=W.light(0x9455ff,0,0,3.5,-.3,8),blue=W.light(0x4879d8,5,2,4,-2,9);
  const book=forbiddenBook(W,keep,scene),circles=[magicCircle(keep,1.65,0),magicCircle(keep,1.4,1),magicCircle(keep,1.1,2)];circles.forEach((o,i)=>{o.mesh.position.y=1.65+i*.36;scene.add(o.mesh);});
  const dust=motes(ctx,low?500:1700,0xb39af5,8);
  const pulseMaterial=keep(new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.BackSide,blending:T.AdditiveBlending,uniforms:{strength:{value:0},time:{value:0}},vertexShader:'varying vec3 vN,vV,vP;void main(){vec4 v=modelViewMatrix*vec4(position,1.);vN=normalize(normalMatrix*normal);vV=normalize(-v.xyz);vP=position;gl_Position=projectionMatrix*v;}',fragmentShader:`varying vec3 vN,vV,vP;uniform float strength,time;void main(){float rim=pow(1.-abs(dot(normalize(vN),normalize(vV))),2.5);float veins=pow(.5+.5*sin(vP.y*28.+sin(vP.x*19.+time)*2.),8.);gl_FragColor=vec4(mix(vec3(.32,.12,1.),vec3(.9,.64,.26),veins)*2.,rim*strength*(.12+veins*.15));}`}));
  const pulse=W.mesh(keep(new T.SphereGeometry(1,36,24)),pulseMaterial,scene,0,2.3,0);
  // Every letter is a real sprite in space. It becomes an arcane glyph during
  // convergence, follows a three-dimensional orbit, then regains its own letter.
  const letters=new T.Group();scene.add(letters);let letterKey='',sprites=[],letterTextures=[];
  const makeGlyph=(text)=>{const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d');g.textAlign='center';g.textBaseline='middle';g.font='bold 82px Georgia';g.shadowColor='#ad74ff';g.shadowBlur=10;g.fillStyle='#f4dcad';g.fillText(text,64,65);const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;letterTextures.push(tex);return tex;};
  const symbols=['✧','♆','☽','⋈','⊹','♁'];let castSeq=0,castStart=null,spellReveal=0,casting=false,activationCount=0;
  function rebuild(card){const text=card.tm==='none'?'':String(card.p||card.m||SPELL_MESSAGE).slice(0,40);if(text===letterKey)return;letterKey=text;for(const s of sprites){s.userData.letterMaterial.dispose();s.userData.glyphMaterial.dispose();s.removeFromParent();}for(const t of letterTextures)t.dispose();letterTextures=[];sprites=[];for(const [i,ch]of Array.from(text).entries()){const m=new T.SpriteMaterial({map:makeGlyph(ch),transparent:true,depthWrite:false,opacity:0,blending:T.AdditiveBlending}),s=new T.Sprite(m);s.userData.letterMaterial=m;s.userData.glyphMaterial=new T.SpriteMaterial({map:makeGlyph(symbols[i%symbols.length]),transparent:true,depthWrite:false,opacity:0,blending:T.AdditiveBlending});letters.add(s);sprites.push(s);}}
  const palette=sceneColors('dark-spell',scene);palette.tint('c1',book.materials.leather).tint('c2',book.materials.gold).bind('c3',dust.uniforms.color.value).bind('c4',arcane.color);for(const c of circles)palette.tint('c4',c.m);palette.tint('c4',pulseMaterial);
  return {update(t,dt,p,motion,card){
   palette.update(card);
   const approach=ease(t/5),opening=ease((t-5)/4);rebuild(card);
   if(card.__demo&&castStart===null)castStart=12;
   if(card.__cast!==undefined&&card.__cast!==castSeq){castSeq=card.__cast;castStart=t;activationCount++;}
   const age=castStart===null?-1:t-castStart,charge=age<0?0:ease(age/2.2)*(1-ease((age-3.5)/2)),flash=age<0?0:Math.exp(-Math.pow((age-3.7)/.34,2));
   spellReveal=card.__still?1:age<0?0:ease((age-5)/1.2);casting=age>=0&&age<6.2;
   const shock=age<0?0:Math.max(0,Math.min(1,(age-3.5)/1.3));pulse.visible=motion&&shock>0&&shock<1;pulse.scale.setScalar(.2+shock*2.5);pulseMaterial.uniforms.strength.value=Math.sin(shock*Math.PI);pulseMaterial.uniforms.time.value=t;
   book.update(t,opening,charge);arcane.intensity=opening*(2+charge*7+flash*7);
   for(let i=0;i<circles.length;i++){const o=circles[i];o.mesh.visible=opening>.01;o.m.uniforms.time.value=t;o.m.uniforms.power.value=opening*(.20+charge*.4);o.mesh.rotation.z=(i%2?-1:1)*(t*.055+charge*.8);o.mesh.position.y=(i===0?1.7:2.65+i*.32)+charge*i*.07;}
   for(let i=0;i<sprites.length;i++){
    const s=sprites[i],n=sprites.length,offset=(i-(n-1)/2)*Math.min(.19,Math.min(4.4,w/h*4.5)/Math.max(n,1)),orbit=ease((age-.7)/1.2)*(1-ease((age-3.8)/1.5)),a=i/Math.max(n,1)*Math.PI*2+age*1.6,r=(w/h>1?1.4:1.05)+Math.sin(i*7)*.1;
    s.position.set(offset*(1-orbit)+Math.cos(a)*r*orbit,3.45+Math.sin(a)*.45*orbit,Math.sin(a)*r*orbit+.4*(1-orbit));
    const glyph=age>1.2&&age<4.6;s.material=glyph?s.userData.glyphMaterial:s.userData.letterMaterial;s.material.opacity=card.tm==='none'?0:card.__still?0:age<0?0:ease(age/.7)*(1-ease((age-6.2)/1));s.visible=s.material.opacity>.001;s.scale.setScalar(.27+orbit*.06);
   }
   dust.uniforms.time.value=t;dust.uniforms.power.value=.18+opening*.24+charge*.7;dust.uniforms.burst.value=flash*.3;
   for(let i=0;i<candles.length;i++)candles[i].update(t+i,1,camera);
   const wide=w/h>1?1:1.27,pull=spellReveal*.4;camera.position.set(2*(1-approach)+.45+p.x*.3,3.7+approach*.3,((8.5-approach*2)+pull)*wide);camera.lookAt(0,1.75+approach*.45,0);camera.fov=39;camera.updateProjectionMatrix();
  },reduce(){dust.reduce();},dispose(){for(const s of sprites){s.userData.letterMaterial.dispose();s.userData.glyphMaterial.dispose();}for(const t of letterTextures)t.dispose();},stats:()=>({...palette.stats(),artwork:'dark-spell',spellReveal,casting,activationCount,letters:sprites.length,pages:book.leaves.length,books:576})};
 });
}
