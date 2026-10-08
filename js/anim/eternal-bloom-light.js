import * as T from '../vendor/three/three.module.min.js';

// Original procedural studio lighting, generated locally. Broad softboxes,
// narrow champagne strips and a cool rim produce legible reflections on glass.
export function studioEnvironment(renderer){
 const w=512,h=256,data=new Float32Array(w*h*4);
 const panels=[[-1.05,1.24,.20,.58,4.8,[.95,.97,1]],[1.3,1.4,.075,.7,4,[.68,.83,1]],[.1,.53,.48,.11,3.2,[1,.95,.85]],[2.7,1.25,.28,.45,2.4,[.79,.89,1]],[-.4,2.2,.4,.15,.32,[1,.7,.4]]];
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const lon=x/w*Math.PI*2-Math.PI,lat=y/h*Math.PI,k=(y*w+x)*4;
  data[k]=.065;data[k+1]=.075;data[k+2]=.09;data[k+3]=1;
  for(const [cx,cy,sx,sy,power,color] of panels){const dx=Math.atan2(Math.sin(lon-cx),Math.cos(lon-cx))/sx,dy=(lat-cy)/sy;const f=Math.exp(-Math.pow(Math.abs(dx),6)-Math.pow(Math.abs(dy),6))*power;for(let c=0;c<3;c++)data[k+c]+=color[c]*f;}
 }
 const tex=new T.DataTexture(data,w,h,T.RGBAFormat,T.FloatType);tex.mapping=T.EquirectangularReflectionMapping;tex.needsUpdate=true;
 const pmrem=new T.PMREMGenerator(renderer),target=pmrem.fromEquirectangular(tex);tex.dispose();pmrem.dispose();return target;
}
export function glassMaterial(color=0xf2f6ff){
 const material=new T.MeshPhysicalMaterial({color,roughness:.095,metalness:0,transmission:.95,thickness:.10,ior:1.46,attenuationColor:0xe6eefc,attenuationDistance:4,clearcoat:.18,clearcoatRoughness:.11,envMapIntensity:1.8,side:T.DoubleSide,dispersion:.025,transparent:true,opacity:.72,depthWrite:false});
 material.forceSinglePass=true;
 material.onBeforeCompile=shader=>{
  // Fine petal striation and a light sweep become part of the reflected surface.
  shader.uniforms.uSweep={value:0};material.userData.shader=shader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nuniform float uSweep;');
  shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
   float vein=sin(vUv.x*170.0+sin(vUv.y*18.0)*1.5)*sin(vUv.y*3.14159);
   roughnessFactor+=vein*.016;
  `).replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
   float sweep=exp(-pow((vUv.y-uSweep)*16.0,2.0));
   totalEmissiveRadiance+=vec3(.44,.24,.065)*sweep*.28;
  `).replace('#include <opaque_fragment>',`diffuseColor.a *= .26+.74*pow(1.-abs(dot(normal,normalize(vViewPosition))),1.2);
  #include <opaque_fragment>`);
 };
 // Explicit UV define: no external texture is necessary for the shader detail.
 material.defines={...material.defines,USE_UV:''};return material;
}
