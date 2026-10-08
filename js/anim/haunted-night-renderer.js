import {sceneColors} from './scene-colors.js';
import * as T from '../vendor/three/three.module.min.js';
import {expertRenderer,ease,random} from './expert-runtime.js';
import {workshop,motes,fogBank,bakeStatic} from './autumn-atmosphere.js';
import {addHauntedAssets} from './haunted-night-assets.js';
export const HAUNTED_MESSAGE='Esta noche, las sombras tienen secretos. Happy Halloween.';

function arch(width,height){const s=new T.Shape(),r=width/2;s.moveTo(-r,0);s.lineTo(r,0);s.lineTo(r,height-r);s.absarc(0,height-r,r,0,Math.PI,false);s.lineTo(-r,0);return s;}

export function createHauntedRenderer(w,h,options={}){
 return expertRenderer(w,h,{...options,maxRatio:1.4},ctx=>{
  const {scene,camera,renderer,keep,low}=ctx,W=workshop(ctx);scene.background=new T.Color(0x090f1c);scene.fog=new T.FogExp2(0x101b2d,.025);
  const stone=W.mat('limestone',{color:0x363d49,roughness:.94,envMapIntensity:.15}),trim=W.mat('trim',{color:0x69717d,roughness:.8,envMapIntensity:.2}),roof=W.mat('slate',{color:0x161f30,roughness:.64,metalness:.15,envMapIntensity:.22}),wood=W.mat('wood',{color:0x191519,roughness:.9,envMapIntensity:.1});
  // Object-space weathering catches the lightning without texture downloads.
  for(const material of [stone,trim,roof])material.onBeforeCompile=s=>{s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vStone;').replace('#include <begin_vertex>','#include <begin_vertex>\nvStone=position;');s.fragmentShader=s.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vStone;').replace('#include <color_fragment>',`#include <color_fragment>
    float grain=fract(sin(dot(floor(vStone*90.),vec3(12.9,78.2,37.1)))*43758.5);float streak=sin(vStone.x*53.+sin(vStone.y*3.));diffuseColor.rgb*=.7+grain*.25+streak*.05;`);};
  const house=new T.Group();scene.add(house);house.position.z=-3;
  const build=new T.Group();house.add(build);const windows=[],panes=[],windowData=[];
  W.box(stone,build,0,2.4,0,5.4,4.8,3.5);W.box(stone,build,-3.5,1.8,.3,2.4,3.6,3);W.box(stone,build,3.5,1.8,.3,2.4,3.6,3);
  const pitched=(x,y,z,width,height,depth)=>{const s=new T.Shape();s.moveTo(-width/2,0);s.lineTo(width/2,0);s.lineTo(0,height);s.closePath();W.mesh(keep(new T.ExtrudeGeometry(s,{depth,bevelEnabled:false})),roof,build,x,y,z-depth/2);};
  pitched(0,4.8,0,5.9,2.4,4);pitched(-3.5,3.6,.3,2.9,1.5,3.5);pitched(3.5,3.6,.3,2.9,1.5,3.5);
  const tile=W.mat('tile',{color:0x273142,roughness:.83,metalness:.05,envMapIntensity:.13});
  for(let ix=0;ix<20;ix++)for(let iz=0;iz<12;iz++){const x=(ix-9.5)*.29,z=(iz-5.5)*.32,o=W.box(tile,build,x,4.85+(1-Math.abs(x)/2.95)*2.4,z,.28,.025,.30);o.rotation.z=-Math.sign(x)*Math.atan(2.4/2.95);}
  for(const x of [-2.62,2.62,-4.63,4.63])for(let j=0;j<12;j++)W.box(trim,build,x,.25+j*.34,1.88,.25+(j%2)*.12,.2,.17);
  for(const x of [-2.45,2.45]){
   W.mesh(W.geo('tower',()=>new T.CylinderGeometry(.85,.95,6,8)),stone,build,x,3,-.9);
   W.mesh(W.geo('spire',()=>new T.ConeGeometry(1.15,3.2,8)),roof,build,x,7.6,-.9);
   W.mesh(W.geo('finial',()=>new T.ConeGeometry(.07,.8,6)),trim,build,x,9.5,-.9);
   for(const y of [1.1,3.2,5.5])W.mesh(W.geo('cornice',()=>new T.CylinderGeometry(.98,.98,.12,8)),trim,build,x,y,-.9);
  }
  for(const y of [.25,2.5,4.7])W.box(trim,build,0,y,1.82,5.7,.12,.22);
  W.tube([new T.Vector3(-2.8,4.85,2.02),new T.Vector3(0,7.12,2.02),new T.Vector3(2.8,4.85,2.02)],.045,trim,build);
  W.mesh(W.geo('rose-frame',()=>new T.TorusGeometry(.48,.055,8,40)),trim,build,0,5.65,2.04);
  W.mesh(W.geo('rose-glass',()=>new T.CircleGeometry(.43,40)),W.mat('rose-glass',{color:0x172139,emissive:0x304769,emissiveIntensity:.18,roughness:.3}),build,0,5.65,2.02);
  for(let i=0;i<8;i++){const a=i/8*Math.PI*2;W.tube([new T.Vector3(0,5.65,2.07),new T.Vector3(Math.cos(a)*.41,5.65+Math.sin(a)*.41,2.07)],.018,trim,build);}
  for(const x of [-4.55,-2.55,2.55,4.55])W.box(trim,build,x,1.8,1.83,.16,3.6,.25);
  const paneGeo=keep(new T.ShapeGeometry(arch(.62,1.18),18)),frameShape=arch(.83,1.4);const hole=arch(.65,1.2);frameShape.holes.push(new T.Path(hole.getPoints().reverse()));const frameGeo=keep(new T.ExtrudeGeometry(frameShape,{depth:.13,bevelEnabled:true,bevelSize:.025,bevelThickness:.02,bevelSegments:1,steps:1}));
  const addWindow=(x,y,z)=>{
   W.mesh(frameGeo,trim,build,x,y,z);const material=keep(new T.MeshStandardMaterial({color:0x151d2b,emissive:0xffbc62,emissiveIntensity:0,roughness:.38,metalness:.1})),pane=W.mesh(paneGeo,material,house,x,y+.08,z+.03);panes.push(pane);windowData.push({material,on:false});
   W.box(wood,build,x,y+.6,z+.17,.035,1.12,.07);W.box(wood,build,x,y+.63,z+.18,.61,.035,.07);
   W.box(trim,build,x,y-.04,z,.98,.12,.35);windows.push(pane);
  };
  for(const x of [-1.65,0,1.65])for(const y of [1,3])if(x!==0||y!==1)addWindow(x,y,1.84);
  for(const x of [-3.5,3.5])addWindow(x,1.2,1.84);
  // Side windows reveal actual side walls during the dolly.
  for(const s of [-1,1])for(const z of [-.8,.6]){const g=new T.Group();g.position.set(s*4.72,1,z);g.rotation.y=s*Math.PI/2;build.add(g);W.mesh(frameGeo,trim,g);W.mesh(paneGeo,wood,g,0,.08,.01);}
  // Gothic portico, columns, stone treads and hinged double door.
  W.box(stone,build,0,.22,2.5,2.6,.44,1.5);pitched(0,2.65,2.45,2.7,.9,1.5);
  for(const x of [-1.05,1.05]){W.mesh(W.geo('column',()=>new T.CylinderGeometry(.12,.17,2.5,12)),trim,build,x,1.5,3);for(const y of [.3,2.65])W.box(trim,build,x,y,3,.4,.15,.4);}
  for(let i=0;i<4;i++)W.box(trim,build,0,.07+i*.06,3.3-i*.22,2.5-i*.1,.14,1);
  const doorway=W.mesh(keep(new T.ShapeGeometry(arch(1.48,2.4))),W.mat('void',{color:0x020309,roughness:1}),house,0,.3,1.89);
  const doors=[];for(const side of [-1,1]){const hinge=new T.Group();house.add(hinge);hinge.position.set(side*.7,.3,1.98);W.box(wood,hinge,-side*.35,1,0,.7,2,.12);for(const y of [.55,1.45])W.box(roof,hinge,-side*.35,y,.08,.52,.65,.04);W.sphere(trim,hinge,-side*.59,.95,.12,.04);doors.push({hinge,side});}
  const interior=W.light(0xffc378,0,0,1.3,-.75,5);
  // Instanced iron fence and silhouettes create near/mid/far depth layers.
  const iron=W.mat('iron',{color:0x151b26,roughness:.7,metalness:.5});
  const fence=new T.InstancedMesh(W.geo('picket',()=>new T.CylinderGeometry(.025,.035,1.6,5)),iron,60);scene.add(fence);const dummy=new T.Object3D();
  for(let i=0;i<60;i++){const x=(i-29.5)*.23;if(Math.abs(x)<1.4){dummy.scale.setScalar(0);}else dummy.scale.setScalar(1);dummy.position.set(x,.8,2);dummy.updateMatrix();fence.setMatrixAt(i,dummy.matrix);}for(const y of [.3,1.15])for(const s of [-1,1])W.box(iron,scene,s*4.1,y,2,5.2,.04,.04);
  const bark=W.mat('bark',{color:0x111722,roughness:1,envMapIntensity:.1}),treeGroups=[];
  for(let i=0;i<(low?10:18);i++){
   const g=new T.Group(),side=i%2?1:-1;g.position.set(side*(4+random(i+28)*5),0,5-i*1.3);scene.add(g);treeGroups.push(g);
   const length=4+random(i+42)*4;W.mesh(W.geo('trunk',()=>new T.CylinderGeometry(.08,.24,1,7)),bark,g,0,length/2,0,1,length,1);
   for(let j=0;j<8;j++){const y=length*(.28+j*.08),s=j%2?1:-1,z=(random(i*40+j)-.5)*2,reach=.7+random(i+j*7)*1.7;const tip=new T.Vector3(s*reach,y+.7+random(j+i)*.9,z);W.tube([new T.Vector3(0,y,0),new T.Vector3(s*reach*.45,y+.3,z*.3),tip],.035+random(i+j)*.025,bark,g);for(let k=0;k<2;k++)W.tube([tip.clone().multiplyScalar(.85),tip.clone().add(new T.Vector3((k?1:-1)*.35,.6,(random(k+i+j)-.5)*.8)),tip.clone().add(new T.Vector3((k?1:-1)*.6,.9,.1))],.017,bark,g);}
  }
  const assets=options.assets===false?{ready:false}:addHauntedAssets(ctx);
  if(!assets.ready)W.box(W.mat('ground',{color:0x080b11,roughness:.98,envMapIntensity:0}),scene,0,-.2,0,60,.25,60);
  for(let i=0;i<16;i++)W.box(trim,scene,(random(i)-.5)*.12,-.04,3+i*.5,1.5,.035,.42);
  const fog=fogBank(W,keep,scene,0x8195b4,low?10:18),dust=motes(ctx,low?350:950,0x9db9db,13);
  const moonMat=keep(new T.ShaderMaterial({uniforms:{},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:`varying vec2 vUv;void main(){vec2 p=vUv*2.-1.;float n=sin(p.x*36.+sin(p.y*23.))*sin(p.y*29.)*.04;float crater=exp(-length(p-vec2(.3,.1))*8.)*.24+exp(-length(p+vec2(.3,.2))*13.)*.17;gl_FragColor=vec4(vec3(.68,.78,.96)*(1.-crater+n),1.);}`}));
  const moon=W.mesh(W.geo('moon',()=>new T.SphereGeometry(1,40,32)),moonMat,scene,-6,12,-24,2.5,2.5,2.5);
  const clouds=fogBank(W,keep,scene,0x263044,5);clouds.group.position.set(0,12.2,-20);clouds.group.scale.set(1.5,1,1);
  const lunar=new T.DirectionalLight(0x9ab5ed,2.2);lunar.position.set(-6,12,4);scene.add(lunar);
  renderer.shadowMap.enabled=!low;renderer.shadowMap.type=T.PCFSoftShadowMap;lunar.castShadow=!low;lunar.shadow.mapSize.set(512,512);lunar.shadow.camera.left=-9;lunar.shadow.camera.right=9;lunar.shadow.camera.top=10;lunar.shadow.camera.bottom=-3;lunar.shadow.bias=-.001;
  build.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
  const lightning=new T.DirectionalLight(0xc2d7ff,0);lightning.position.set(6,12,7);scene.add(lightning);
  const ghostMaterial=keep(new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,uniforms:{alpha:{value:0},time:{value:0}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:`varying vec2 vUv;uniform float alpha,time;void main(){vec2 p=vUv-.5;float head=1.-smoothstep(.82,1.,length((p-vec2(0.,.25))/vec2(.105,.135)));float width=.13+max(0.,.1-p.y)*.26;float hem=-.38+.035*sin(p.x*35.+time);float robe=(1.-smoothstep(width,width+.045,abs(p.x)))*(1.-smoothstep(.1,.19,p.y))*smoothstep(hem,hem+.07,p.y);float folds=.65+.2*sin(p.x*48.+p.y*3.);float a=max(head*.75,robe*folds)*alpha*.72;gl_FragColor=vec4(.42,.56,.72,a);}`}));
  const ghost=W.mesh(keep(new T.PlaneGeometry(.62,1.15)),ghostMaterial,house,-1.65,3.65,1.9);
  const nearGhost=W.mesh(keep(new T.PlaneGeometry(.6,1.1)),ghostMaterial,house,1.65,3.65,1.9);
  bakeStatic(build,keep);for(const group of treeGroups)bakeStatic(group,keep);
  const raycaster=new T.Raycaster();let lastTap=0,lastCast=0,toggled=0;
  const palette=sceneColors('haunted-night',scene);palette.tint('c1',stone).tint('c2',trim).bind('c3',dust.uniforms.color.value).bind('c4',lunar.color);
  return {update(t,dt,p,motion,card){
   palette.update(card);
   const approach=ease((t-2)/8),retreat=ease((t-14)/4),open=ease((t-10)/3),flash=motion?Math.exp(-Math.pow((t-13.45)/.17,2))*4+Math.exp(-Math.pow((t-13.8)/.3,2))*1.5:0;
   const wide=w/h>1?1:1.25;camera.position.set(2.5*(1-approach)-retreat*1.1+p.x*.45,2.6+retreat*.9,(18-approach*10+retreat*6)*wide);camera.lookAt(0,2.9+retreat*.25,-2);camera.fov=43;camera.updateProjectionMatrix();
   for(const {hinge,side} of doors)hinge.rotation.y=side*open*1.1;interior.intensity=open*3;lightning.intensity=flash;
   ghost.position.x=-1.95+ease((t-6)/3)*.62;ghostMaterial.uniforms.alpha.value=(ease((t-6)/.8)*(1-ease((t-9)/.8)))*.8+flash*.2;ghostMaterial.uniforms.time.value=t;ghost.visible=t<10;nearGhost.visible=t>13.2&&t<14.2;
   if(card.__tap&&card.__tap.seq!==lastTap){lastTap=card.__tap.seq;camera.updateMatrixWorld(true);raycaster.setFromCamera(new T.Vector2(card.__tap.x*2-1,1-card.__tap.y*2),camera);house.updateMatrixWorld(true);const hit=raycaster.intersectObjects(panes)[0];if(hit){const i=panes.indexOf(hit.object);windowData[i].on=!windowData[i].on;toggled++;}}
   if(card.__cast!==undefined&&card.__cast!==lastCast){lastCast=card.__cast;const i=toggled%windows.length;windowData[i].on=!windowData[i].on;toggled++;}
   windowData.forEach((d,i)=>{const flicker= Math.sin(t*(.7+random(i)) + i*13)> .6;d.material.emissiveIntensity=d.on?1.4:(t>4+random(i)*4&&flicker?.55:0);});
   fog.update(t);clouds.update(t*.6);clouds.group.position.x=Math.sin(t*.08)*2;dust.uniforms.time.value=t;dust.uniforms.power.value=.25+open*.3;
   for(let i=0;i<treeGroups.length;i++)treeGroups[i].rotation.z=Math.sin(t*.31+i*.9)*.008;
  },reduce(){dust.reduce();assets.reduce?.();renderer.shadowMap.enabled=false;},dispose(){lunar.shadow.dispose();},stats:()=>{const p=panes[0].localToWorld(new T.Vector3(0,.6,0)).project(camera);return {...palette.stats(),artwork:'haunted-night',windows:windows.length,toggled,firstWindow:{x:(p.x+1)/2,y:(1-p.y)/2},architecture:'volumetric',shadows:renderer.shadowMap.enabled,environmentAssets:{ready:assets.ready,logs:assets.logs,groundPixels:assets.groundPixels,tier:assets.tier,error:assets.error}};}};
 });
}
