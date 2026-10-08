import * as T from '../vendor/three/three.module.min.js';

export function heartbeatEnvironment(renderer){
 const w=512,h=256,data=new Float32Array(w*h*4);
 const panels=[[-1.0,1.1,.14,.60,5,[.92,.95,1]],[1.45,1.45,.08,.56,3.7,[1,.55,.65]],[.1,.45,.55,.12,4,[.98,.93,.94]],[-2.6,1.4,.22,.70,2.5,[.65,.75,.96]]];
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const k=(y*w+x)*4,lon=x/w*6.283185-3.14159,lat=y/h*3.14159;data[k]=.013;data[k+1]=.015;data[k+2]=.025;data[k+3]=1;for(const [cx,cy,sx,sy,power,color]of panels){const dx=Math.atan2(Math.sin(lon-cx),Math.cos(lon-cx))/sx,dy=(lat-cy)/sy,f=Math.exp(-Math.pow(Math.abs(dx),6)-Math.pow(Math.abs(dy),6))*power;for(let c=0;c<3;c++)data[k+c]+=color[c]*f;}}
 const image=new T.DataTexture(data,w,h,T.RGBAFormat,T.FloatType);image.mapping=T.EquirectangularReflectionMapping;image.needsUpdate=true;
 const pmrem=new T.PMREMGenerator(renderer),target=pmrem.fromEquirectangular(image);image.dispose();pmrem.dispose();return target;
}
export function heartbeatGlass(){
 const material=new T.MeshPhysicalMaterial({color:0xf8f2f5,metalness:0,roughness:.065,transmission:.94,thickness:.19,ior:1.5,attenuationColor:0xf6d8df,attenuationDistance:5,clearcoat:.25,clearcoatRoughness:.1,dispersion:.035,envMapIntensity:1.35,transparent:true,opacity:.79,depthWrite:false,side:T.DoubleSide});material.forceSinglePass=true;
 const uniforms={uBeat:{value:0},uTime:{value:0},uReveal:{value:0},uJoined:{value:0}};material.userData.uniforms=uniforms;
 material.onBeforeCompile=shader=>{
  Object.assign(shader.uniforms,uniforms);
  shader.vertexShader=shader.vertexShader.replace('#include <common>',`#include <common>
   attribute vec3 aHeart;attribute float aCut;varying vec3 vHeart;varying float vCut;uniform float uBeat;
  `).replace('#include <begin_vertex>',`#include <begin_vertex>
   vHeart=aHeart;vCut=aCut;float chamber=smoothstep(-.9,.5,aHeart.y);
   vec3 strain=vec3(1.+uBeat*(.025+.025*chamber),1.-uBeat*.025,1.+uBeat*.065);
   transformed+=aHeart*(strain-1.);
  `).replace('#include <beginnormal_vertex>',`#include <beginnormal_vertex>
   objectNormal/=vec3(1.+uBeat*.04,1.-uBeat*.025,1.+uBeat*.065);
  `);
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
   varying vec3 vHeart;varying float vCut;uniform float uBeat,uTime,uReveal,uJoined;
   float h21(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
   float fracture(vec2 p){vec2 g=floor(p),f=fract(p);float first=10.,second=10.;for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){vec2 b=vec2(float(x),float(y)),o=vec2(h21(g+b),h21(g+b+4.7));float d=length(b+o-f);if(d<first){second=first;first=d;}else second=min(second,d);}return 1.-smoothstep(.012,.028,second-first);}
  `).replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
   float crack=fracture(vHeart.xy*3.8+vHeart.z*.35);
   float traveling=exp(-pow((vHeart.y-(sin(uTime*.7)*1.2))/.24,2.));
   totalEmissiveRadiance+=vec3(.26,.035,.055)*crack*(uBeat*.25+traveling*.035)*uReveal;
  `).replace('#include <opaque_fragment>',`diffuseColor.a*=uReveal*(1.-vCut*uJoined)*(.20+.80*pow(1.-abs(dot(normal,normalize(vViewPosition))),1.25));
   #include <opaque_fragment>`);
 };
 return material;
}
