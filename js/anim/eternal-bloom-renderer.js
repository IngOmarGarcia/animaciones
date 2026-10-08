import {sceneColors} from './scene-colors.js';
import * as T from '../vendor/three/three.module.min.js';
import {rosePetals,petalGeometry,leafGeometry,smooth} from './eternal-bloom-geometry.js';
import {studioEnvironment,glassMaterial} from './eternal-bloom-light.js';
import {makeMotes} from './eternal-bloom-particles.js';

export function createBloomRenderer(w,h,{preview=false,low=false}={}){
 const canvas=document.createElement('canvas');
 const context=canvas.getContext('webgl2',{alpha:false,antialias:true,powerPreference:'high-performance'});
 if(!context)throw Error('WebGL 2 no disponible');
 if(!context.getExtension('EXT_color_buffer_float')){context.getExtension('WEBGL_lose_context')?.loseContext();throw Error('Renderizado HDR no disponible');}
 const renderer=new T.WebGLRenderer({canvas,context,antialias:true,alpha:false,powerPreference:'high-performance'});
 renderer.debug.onShaderError=()=>{throw Error('No se pudieron compilar los shaders de Eternal Bloom');};
 const resources=new Set(),keep=x=>(resources.add(x),x);
 let disposed=false,ratio=Math.min(devicePixelRatio||1,low?1:1.6),quality=low?'low':'high',mean=0,frameMean=16.7,samples=0,previousT=-1,stats={};
 try{
 const scene=new T.Scene();scene.background=new T.Color(0x010103);
 renderer.setPixelRatio(ratio);renderer.setSize(w,h,false);renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.10;renderer.outputColorSpace=T.SRGBColorSpace;
 renderer.transmissionResolutionScale=low?.35:.65;
 const env=keep(studioEnvironment(renderer));scene.environment=env.texture;
 const camera=new T.PerspectiveCamera(34,w/h,.1,60);
 const rose=new T.Group();scene.add(rose);rose.position.y=.05;
 const glass=keep(glassMaterial());
 const petals=rosePetals().map(p=>{
  const mesh=new T.Mesh(keep(petalGeometry(p)),glass);mesh.morphTargetInfluences[0]=1;rose.add(mesh);return {mesh,p};
 });
 const stemMat=keep(glassMaterial(0xc5d9cf));stemMat.transmission=.88;stemMat.opacity=.72;
 const stemCurve=new T.CatmullRomCurve3([new T.Vector3(.12,-2.05,0),new T.Vector3(-.08,-1.4,.03),new T.Vector3(.04,-.65,.015),new T.Vector3(0,.06,0)]);
 const stem=new T.Mesh(keep(new T.TubeGeometry(stemCurve,64,.035,12,false)),stemMat);rose.add(stem);
 const leaves=[[-1,-.73,.2],[1,-1.24,-.35]].map(([side,y,angle])=>{const mesh=new T.Mesh(keep(leafGeometry(side)),stemMat);mesh.position.set(0,y,0);mesh.rotation.y=angle;rose.add(mesh);
  // The raised midrib conforms to the curved leaf, separate from its silhouette.
  const points=[];for(let i=0;i<20;i++){const v=i/19;points.push(new T.Vector3(side*v*.95,v*.55,.13*Math.sin(v*Math.PI)+.008));}
  const vein=new T.Mesh(keep(new T.TubeGeometry(new T.CatmullRomCurve3(points),28,.006,5,false)),stemMat);mesh.add(vein);
  return mesh;
 });
 // Five tapered sepals under the corolla, rather than a disconnected sphere.
 const sepals=[];for(let i=0;i<5;i++){const s=new T.Mesh(keep(leafGeometry(1)),stemMat);s.scale.set(.42,.38,.25);s.position.y=.04;s.rotation.set(.7,i/5*Math.PI*2,Math.PI*.6);rose.add(s);sepals.push(s);}
 const key=new T.DirectionalLight(0xffe1ae,.7);key.position.set(-3,4,3);scene.add(key);
 const rim=new T.DirectionalLight(0xc7dcff,.6);rim.position.set(3,2,-2);scene.add(rim);
 const sweep=new T.PointLight(0xffd08a,7,7,2);scene.add(sweep);scene.add(new T.AmbientLight(0x63717d,.22));
 const dust=makeMotes(low?150:360,petals);keep(dust.geometry);keep(dust.material);rose.add(dust);
 const target=keep(new T.WebGLRenderTarget(Math.round(w*ratio),Math.round(h*ratio),{type:T.HalfFloatType,depthBuffer:true}));
 const post=new T.Scene(),postCamera=new T.OrthographicCamera(-1,1,1,-1,0,1);
 const postMat=keep(new T.ShaderMaterial({depthTest:false,depthWrite:false,uniforms:{tImage:{value:target.texture},uStep:{value:new T.Vector2(1/(w*ratio),1/(h*ratio))},uBloom:{value:low?0:.075},uFade:{value:1}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',fragmentShader:`
  uniform sampler2D tImage;uniform vec2 uStep;uniform float uBloom,uFade;varying vec2 vUv;
  void main(){vec3 col=texture2D(tImage,vUv).rgb,glow=vec3(0.);if(uBloom>.001){for(int i=-2;i<=2;i++)for(int j=-2;j<=2;j++){vec3 s=texture2D(tImage,vUv+vec2(float(i),float(j))*uStep*2.5).rgb;glow+=max(s-vec3(1.1),vec3(0.))/25.;}}col+=glow*uBloom;float vig=1.-.17*pow(length((vUv-.5)*vec2(.8,1.)),2.);gl_FragColor=vec4(col*vig*uFade,1.);
   #include <tonemapping_fragment>
   #include <colorspace_fragment>
  }
 `}));post.add(new T.Mesh(keep(new T.PlaneGeometry(2,2)),postMat));
 const palette=sceneColors('eternal-bloom',scene);palette.tint('c1',glass).tint('c2',stemMat).tint('c3',dust.material).bind('c4',key.color).bind('c4',sweep.color);
 let px=0,py=0;
 const lost=()=>{disposed=true;};canvas.addEventListener('webglcontextlost',lost);
 return {
  canvas,
  get stats(){return {...palette.stats(),renderer:'three-webgl2',quality,ratio,disposed,contextLost:disposed&&renderer.getContext().isContextLost(),petals:petals.length,particles:dust.geometry.drawRange.count===Infinity?dust.geometry.attributes.position.count:dust.geometry.drawRange.count,...stats,geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures,programs:renderer.info.programs.length};},
  draw(t,dt,pointer={x:.5,y:.5},motion=true,card={}){
   palette.update(card);
   if(disposed||renderer.getContext().isContextLost())throw Error('Contexto de Eternal Bloom no disponible');
   const start=performance.now(),reset=t<previousT;previousT=t;
   const damping=motion?1-Math.exp(-Math.min(dt||.016,.1)*3):0;
   if(reset){px=0;py=0;}px+=(pointer.x-.5-px)*damping;py+=(pointer.y-.5-py)*damping;
   const pull=smooth((t-.9)/2.7),bloom=smooth((t-3.9)/5.8),settle=smooth((t-6.5)/4.2);
   const grow=smooth((t-2.2)/2.7);stem.visible=grow>.001;stem.scale.y=Math.max(.0001,grow);stem.position.y=-2.05*(1-grow);
   for(const sepal of sepals)sepal.visible=t>3.1;
   for(let i=0;i<leaves.length;i++){const unfold=smooth((t-3.1-i*.35)/2);leaves[i].visible=unfold>.001;leaves[i].scale.setScalar(Math.max(.001,unfold));leaves[i].rotation.z=motion?Math.sin(t*.35+i)*.018:0;}
   for(const {mesh,p} of petals){
    const appear=smooth((t-3.2-p.ring*.24)/1.6),open=smooth((t-4.4-p.ring*.39)/3.4);
    mesh.visible=appear>.001;mesh.scale.setScalar(Math.max(.001,appear));mesh.morphTargetInfluences[0]=1-open;
    const flight=(1-appear);mesh.position.set(Math.sin(p.angle+flight*1.1)*flight*.55,flight*.5,Math.cos(p.angle+flight*1.1)*flight*.55);
    mesh.rotation.y=motion?Math.sin(t*.22+p.phase)*.009*open:0;
   }
   const travel=motion?t:12;rose.rotation.set(.08+Math.sin(travel*.17)*.018,.18+Math.sin(travel*.10)*.15,Math.sin(travel*.15)*.012);
   const distance=Math.max(8.4,5.8/(w/h))+(1-bloom)*.65;
   camera.position.set((Math.sin(travel*.09)*.24+px*.65)*distance*.14,2.55+py*.45,distance);camera.lookAt(0,-.8,0);
   sweep.position.set(Math.cos(travel*.42)*2,1+Math.sin(travel*.42)*1.2,Math.sin(travel*.42)*2.2+1);
   sweep.intensity=.7+.5*Math.pow(Math.sin(travel*.28),2);
   if(glass.userData.shader)glass.userData.shader.uniforms.uSweep.value=(t*.12)%1.5-.2;
   dust.material.uniforms.uTime.value=t;dust.material.uniforms.uRatio.value=ratio;
   dust.material.uniforms.uPull.value=pull;dust.material.uniforms.uSettle.value=settle;
   postMat.uniforms.uFade.value=1;
   renderer.setRenderTarget(target);renderer.render(scene,camera);stats={triangles:renderer.info.render.triangles,calls:renderer.info.render.calls};renderer.setRenderTarget(null);renderer.render(post,postCamera);
   const cost=performance.now()-start;mean=mean*.94+cost*.06;samples++;
   if(motion&&dt>0)frameMean=frameMean*.96+Math.min(dt*1000,100)*.04;
   if(samples>90&&(mean>22||frameMean>27)&&quality==='high'){
    quality='low';ratio=1;renderer.setPixelRatio(ratio);renderer.setSize(w,h,false);renderer.transmissionResolutionScale=.35;target.setSize(w,h);postMat.uniforms.uStep.value.set(1/w,1/h);postMat.uniforms.uBloom.value=0;dust.geometry.setDrawRange(0,150);
   }
  },
  dispose(){if(!resources.size)return;canvas.removeEventListener('webglcontextlost',lost);for(const r of resources)r.dispose();resources.clear();renderer.renderLists.dispose();renderer.dispose();renderer.forceContextLoss();disposed=true;},
 };
 }catch(error){for(const r of resources)r.dispose();renderer.dispose();renderer.forceContextLoss();throw error;}
}
