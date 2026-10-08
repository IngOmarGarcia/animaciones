import * as T from '../vendor/three/three.module.min.js';
import {random} from './expert-runtime.js';
import {bakeStatic} from './autumn-atmosphere.js';

export function forbiddenBook(W,keep,scene){
 const root=new T.Group();scene.add(root);
 const leather=W.mat('leather',{color:0x281a28,roughness:.76,metalness:.03,envMapIntensity:.4});
 leather.onBeforeCompile=s=>{s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vLeather;').replace('#include <begin_vertex>','#include <begin_vertex>\nvLeather=position;');s.fragmentShader=s.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vLeather;').replace('#include <color_fragment>',`#include <color_fragment>
  float grain=fract(sin(dot(floor(vLeather.xz*400.),vec2(27.1,71.7)))*43758.5);float wear=pow(abs(sin(vLeather.x*3.14159)),14.);diffuseColor.rgb*=.68+grain*.4;diffuseColor.rgb+=vec3(.1,.045,.015)*wear;`);};
 const gold=W.mat('antique-brass',{color:0xb89a54,metalness:.86,roughness:.34,envMapIntensity:.8});
 const paper=W.mat('parchment',{color:0xc2a576,roughness:.92,side:T.DoubleSide,envMapIntensity:.13});
 paper.onBeforeCompile=s=>{s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vPaper;').replace('#include <begin_vertex>','#include <begin_vertex>\nvPaper=position;');s.fragmentShader=s.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vPaper;').replace('#include <color_fragment>',`#include <color_fragment>
  float fibers=fract(sin(dot(floor(vPaper.xz*900.),vec2(18.9,41.7)))*43758.5);float edges=pow(abs(vPaper.z)/.8,8.);diffuseColor.rgb*=.83+fibers*.17-edges*.25;`);};
 const left=new T.Group(),right=new T.Group();root.add(left,right);
 for(const [group,side] of [[left,-1],[right,1]]){
  W.box(leather,group,side*.57,0,0,1.13,.1,1.72);
  for(const z of [-.77,.77])W.box(gold,group,side*.57,.055,z,1.07,.025,.025);
  for(const x of [side*.08,side*1.06])W.box(gold,group,x,.055,0,.025,.025,1.55);
  for(const x of [side*.16,side*.98])for(const z of [-.67,.67]){const m=W.mesh(W.geo('corner',()=>new T.ConeGeometry(.12,.025,4)),gold,group,x,.068,z);m.rotation.y=Math.PI/4;}
  W.box(paper,group,side*.55,.14,0,1.02,.18,1.56);
  // Page edges are actual thin alternating strata with a worn fore-edge.
  for(let i=0;i<15;i++)W.box(W.mat('page-edge',{color:0x8d734b,roughness:1,envMapIntensity:.05}),group,side*1.065,.065+i*.011,0,.009,.002,1.55);
 }
 W.mesh(W.geo('spine',()=>new T.CylinderGeometry(.12,.12,1.74,18)),leather,root,0,.05,0,1,1,1).rotation.x=Math.PI/2;
 for(const z of [-.65,-.3,.3,.65]){const band=W.mesh(W.geo('spine-band',()=>new T.TorusGeometry(.125,.018,6,20)),gold,root,0,.05,z);}
 const emboss=new T.Group();left.add(emboss);emboss.position.y=-.065;
 const energy=W.mat('cover-energy',{color:0xb88d62,metalness:.65,roughness:.32,emissive:0x8d34ed,emissiveIntensity:.1});
 for(let j=0;j<3;j++){
  const points=[];for(let i=0;i<=100;i++){const a=i/100*Math.PI*2,r=.2+j*.12;points.push(new T.Vector3(-.57+Math.cos(a)*r,0,Math.sin(a)*r));}W.tube(points,.012,j===1?energy:gold,emboss,true);
 }
 for(let j=0;j<8;j++){const a=j*Math.PI/4,r=.32;W.tube([new T.Vector3(-.57+Math.cos(a)*r,0,Math.sin(a)*r),new T.Vector3(-.57+Math.cos(a+.2)*.45,0,Math.sin(a+.2)*.45),new T.Vector3(-.57+Math.cos(a-.12)*.4,0,Math.sin(a-.12)*.4)],.012,energy,emboss);}
 // A generated ink texture is an ornament on 3D curved pages, never a scene replacement.
 const canvas=document.createElement('canvas');canvas.width=512;canvas.height=768;const c=canvas.getContext('2d');c.fillStyle='#c5aa7e';c.fillRect(0,0,512,768);c.strokeStyle='#5f483b';c.lineWidth=2;c.strokeRect(35,35,442,698);
 c.font='26px Georgia';c.fillStyle='#584335';c.textAlign='center';c.fillText('NOCTIS · MEMORIA',256,85);
 for(let j=0;j<25;j++){c.globalAlpha=.3+random(j)*.3;c.fillRect(65,135+j*19,270+random(j+30)*110,2);}
 c.globalAlpha=.8;c.translate(256,385);for(let j=0;j<3;j++){c.beginPath();c.arc(0,0,45+j*24,0,Math.PI*2);c.stroke();}for(let j=0;j<7;j++){const a=j/7*Math.PI*2,b=a+Math.PI*6/7;c.beginPath();c.moveTo(Math.cos(a)*80,Math.sin(a)*80);c.lineTo(Math.cos(b)*80,Math.sin(b)*80);c.stroke();}
 const tex=keep(new T.CanvasTexture(canvas));tex.colorSpace=T.SRGBColorSpace;
 const ink=keep(new T.MeshStandardMaterial({map:tex,color:0xb99a6e,roughness:.94,side:T.DoubleSide,envMapIntensity:.1}));
 bakeStatic(left,keep);bakeStatic(right,keep);
 const leaves=[];
 for(let j=0;j<7;j++){
  const g=keep(new T.PlaneGeometry(1,1.54,24,12)),a=g.attributes.position,uv=g.attributes.uv;
  const base=[];for(let i=0;i<a.count;i++)base.push({u:uv.getX(i),z:(uv.getY(i)-.5)*1.54});
  const page=W.mesh(g,ink,root);leaves.push({g,a,base,page,index:j});
 }
 return {root,update(t,opening,spell){
  left.rotation.z=-Math.PI*(1-opening);left.position.y=.3*(1-opening);root.position.set(-.5*(1-opening),1.5+opening*.4+Math.sin(t*.65)*.025,0);root.rotation.y=-.2+opening*.28;
  energy.emissiveIntensity=.15+Math.sin(t*2.2)*.1+spell*1.8;
  for(const leaf of leaves){const {a,g,base,index}=leaf;leaf.page.visible=opening>.08;const flip=index===0?0:Math.max(0,Math.min(1,(opening*1.6-index*.11)));const angle=flip*Math.PI;
   for(let i=0;i<a.count;i++){const {u,z}=base[i],curl=Math.sin(u*Math.PI)*Math.sin(angle)*.65,theta=angle+curl;const x=u*1.03*Math.cos(theta),y=.25+index*.004+u*Math.sin(theta)*.75+Math.sin(u*Math.PI)*.05+Math.sin(z*4+t*1.3+index)*.008*opening;a.setXYZ(i,x,y,z+Math.sin(u*Math.PI)*Math.sin(angle)*.04);}
   a.needsUpdate=true;g.computeVertexNormals();
  }
 },leaves,materials:{leather,gold}};
}
