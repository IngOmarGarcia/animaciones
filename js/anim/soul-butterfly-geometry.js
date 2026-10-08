import * as T from '../vendor/three/three.module.min.js';

// Two distinct anatomical lobes per side, closed curved membranes. Polar
// tessellation preserves the scalloped silhouette and the root articulation.
const outlines={fore:[[.06,.08],[.24,.65],[.75,1.40],[1.45,1.63],[1.93,1.28],[2.02,.79],[1.80,.30],[1.24,.06],[.36,-.12]],hind:[[.07,-.05],[.62,.06],[1.40,-.04],[1.61,-.48],[1.45,-.92],[1.04,-1.35],[.64,-1.51],[.26,-1.19],[.08,-.46]]};
export function wingGeometry(kind){
 const curve=new T.CatmullRomCurve3(outlines[kind].map(([x,y])=>new T.Vector3(x,y,0)),true,'centripetal'),nu=100,nv=26,pos=[],uv=[],indices=[];
 for(let j=0;j<=nv;j++)for(let i=0;i<=nu;i++){
  const u=i/nu,v=j/nv,p=curve.getPoint(u),scallop=1-.017*Math.pow(Math.sin(u*Math.PI*13),2)*Math.pow(v,5);
  const x=p.x*v*scallop,y=p.y*v,z=.20*Math.sin(v*Math.PI*.92)*(1+.25*Math.sin(u*6.28))+.065*Math.sin(u*18.84)*v*v;
  pos.push(x,y,z);uv.push(u,v);
 }
 const row=nu+1,count=pos.length/3;
 for(let j=0;j<nv;j++)for(let i=0;i<nu;i++){const a=j*row+i,b=a+row;indices.push(a,b,a+1,b,b+1,a+1);}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setIndex(indices);g.computeVertexNormals();
 const normals=g.attributes.normal.array;
 for(let i=0;i<count;i++){for(let k=0;k<3;k++)pos.push(pos[i*3+k]-normals[i*3+k]*.014);uv.push(uv[i*2],uv[i*2+1]);}
 const front=indices.slice();for(let i=0;i<front.length;i+=3)indices.push(front[i+2]+count,front[i+1]+count,front[i]+count);
 for(let i=0;i<nu;i++){const a=nv*row+i,b=a+1;indices.push(a,b,a+count,b,b+count,a+count);}
 g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return g;
}
export function wingMaterial(){
 const material=new T.MeshPhysicalMaterial({color:0x75dbea,metalness:.18,roughness:.32,clearcoat:.7,clearcoatRoughness:.15,iridescence:.8,iridescenceIOR:1.35,side:T.DoubleSide,transparent:true,opacity:.86,depthWrite:false});material.forceSinglePass=true;material.defines={...material.defines,USE_UV:''};
 const uniforms={uTime:{value:0},uReveal:{value:0}};material.userData.uniforms=uniforms;
 material.onBeforeCompile=s=>{
  Object.assign(s.uniforms,uniforms);material.userData.shader=s;
  s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nuniform float uTime;varying vec2 vWing;').replace('#include <begin_vertex>',`#include <begin_vertex>
   vWing=position.xy;
   transformed.z+=sin(uv.y*5.-uTime*3.2+uv.x*3.)*.045*uv.y*uv.y;
  `);
  s.fragmentShader=s.fragmentShader.replace('#include <common>','#include <common>\nuniform float uTime,uReveal;varying vec2 vWing;').replace('#include <color_fragment>',`#include <color_fragment>
   float radial=vUv.y,angle=vUv.x;
   float branch=abs(sin(angle*3.14159*13.+sin(radial*3.8)*.65));
   float veins=1.-smoothstep(.018,.070,branch);
   float cross=abs(sin(radial*3.14159*8.+sin(angle*81.)*.18));
   float capillary=(1.-smoothstep(.015,.05,cross))*.17;
   float scallop=pow(.5+.5*sin(angle*163.+radial*13.),8.);
   float margin=smoothstep(.75,.88,radial),pearls=margin*scallop;
   float cells=smoothstep(.08,.42,branch)*(1.-.65*margin);
   vec3 pigment=mix(vec3(.018,.055,.12),mix(vec3(.07,.53,.66),vec3(.33,.10,.55),smoothstep(.1,.75,angle)),cells);
   pigment+=vec3(.38,.72,.82)*veins*.45+vec3(.35,.34,.65)*capillary+pearls*vec3(.62,.72,.85)*.5;
   vec2 eyeCenter=vWing.y>0.?vec2(1.30,1.08):vec2(.86,-.91);
   float eye=length((vWing-eyeCenter)/vec2(.22,.28));
   pigment=mix(pigment,vec3(.015,.035,.065),1.-smoothstep(.65,.88,eye));
   pigment+=exp(-pow((eye-1.)*9.,2.))*vec3(.16,.29,.40);
   pigment*=.94+.06*sin(vWing.x*270.+sin(vWing.y*170.));
   diffuseColor.rgb=pigment;
   diffuseColor.a*=uReveal*(.55+.45*max(veins,margin));
  `).replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
   totalEmissiveRadiance+=pigment*(.32+veins*.45+pearls*.28);
  `);
 };return material;
}
