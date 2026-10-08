import * as T from '../vendor/three/three.module.min.js';

export const ease=x=>{x=Math.max(0,Math.min(1,x));return x*x*x*(x*(x*6-15)+10);};
export const random=n=>{const v=Math.sin(n*127.1+311.7)*43758.5453;return v-Math.floor(v);};

// Rendering infrastructure only. Each artwork owns its geometry, material,
// camera, simulation and narrative; Eternal Bloom does not use this module.
export function expertRenderer(w,h,{low=false,preview=false,maxRatio=1.6,lowRatio=1}={},build){
 const canvas=document.createElement('canvas');
 const gl=canvas.getContext('webgl2',{alpha:false,antialias:true,powerPreference:preview?'low-power':'high-performance'});
 if(!gl)throw Error('WebGL 2 no disponible');
 if(!gl.getExtension('EXT_color_buffer_float')){gl.getExtension('WEBGL_lose_context')?.loseContext();throw Error('HDR no disponible');}
 const renderer=new T.WebGLRenderer({canvas,context:gl,alpha:false,antialias:true});
 renderer.debug.onShaderError=()=>{throw Error('No se pudieron compilar los shaders Expert');};
 const resources=new Set(),keep=r=>(resources.add(r),r);
 let ratio=Math.min(devicePixelRatio||1,preview?Math.min(1,lowRatio):low?lowRatio:maxRatio),disposed=false,quality=low||preview?'low':'high',samples=0,frameMs=16.7,cpuMs=0;
 renderer.setPixelRatio(ratio);renderer.setSize(w,h,false);renderer.toneMapping=T.ACESFilmicToneMapping;renderer.outputColorSpace=T.SRGBColorSpace;renderer.transmissionResolutionScale=quality==='low'?.35:.6;
 const scene=new T.Scene();scene.background=new T.Color(0x010106);
 const camera=new T.PerspectiveCamera(36,w/h,.1,160);
 const target=keep(new T.WebGLRenderTarget(Math.round(w*ratio),Math.round(h*ratio),{type:T.HalfFloatType,depthBuffer:true}));
 let artwork;
 const dispose=()=>{if(disposed)return;disposed=true;canvas.removeEventListener('webglcontextlost',lost);artwork?.dispose?.();for(const r of resources)r.dispose();resources.clear();renderer.renderLists.dispose();renderer.dispose();renderer.forceContextLoss();};
 const lost=()=>{artwork?.contextLost?.();};canvas.addEventListener('webglcontextlost',lost);
 try{
  artwork=build({T,renderer,scene,camera,keep,w,h,low:quality==='low',preview});
  const postScene=new T.Scene(),postCamera=new T.OrthographicCamera(-1,1,1,-1,0,1);
  const post=keep(new T.ShaderMaterial({depthTest:false,depthWrite:false,uniforms:{tScene:{value:target.texture},uPixel:{value:new T.Vector2(1/(w*ratio),1/(h*ratio))},uBloom:{value:quality==='low'?0:.12}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',fragmentShader:`
   varying vec2 vUv;uniform sampler2D tScene;uniform vec2 uPixel;uniform float uBloom;
   void main(){vec3 c=texture2D(tScene,vUv).rgb,g=vec3(0.);if(uBloom>.001){for(int i=-2;i<=2;i++)for(int j=-2;j<=2;j++){vec3 p=texture2D(tScene,vUv+vec2(float(i),float(j))*uPixel*2.8).rgb;g+=max(p-vec3(1.25),vec3(0.))/25.;}}c+=g*uBloom;float vignette=1.-.2*dot(vUv-.5,vUv-.5);gl_FragColor=vec4(c*vignette,1.);
   #include <tonemapping_fragment>
   #include <colorspace_fragment>
  }`}));postScene.add(new T.Mesh(keep(new T.PlaneGeometry(2,2)),post));
  let px=0,py=0,lastT=-1,drawStats={};
  return {
   canvas,
   draw(t,dt,pointer={x:.5,y:.5},motion=true,card={}){
    if(disposed||gl.isContextLost())throw Error('Contexto Expert no disponible');
    if(t<lastT){px=0;py=0;}lastT=t;
    const start=performance.now(),d=motion?1-Math.exp(-Math.min(dt||.016,.1)*3):0;
    px+=((pointer?.x??.5)-.5-px)*d;py+=((pointer?.y??.5)-.5-py)*d;
    artwork.update(t,dt,{x:px,y:py},motion,card,ratio);
    renderer.setRenderTarget(target);renderer.render(scene,camera);
    drawStats={calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,points:renderer.info.render.points};
    artwork.afterRender?.(renderer,camera);
    renderer.setRenderTarget(null);renderer.render(postScene,postCamera);
    cpuMs=cpuMs*.94+(performance.now()-start)*.06;if(motion&&dt>0)frameMs=frameMs*.96+Math.min(dt*1000,100)*.04;samples++;
    if(samples>90&&quality==='high'&&(frameMs>27||cpuMs>22)){
     quality='low';ratio=Math.min(devicePixelRatio||1,lowRatio);renderer.setPixelRatio(ratio);renderer.setSize(w,h,false);target.setSize(Math.round(w*ratio),Math.round(h*ratio));post.uniforms.uPixel.value.set(1/(w*ratio),1/(h*ratio));post.uniforms.uBloom.value=0;renderer.transmissionResolutionScale=.35;artwork.reduce?.();
    }
   },
   dispose,
    get stats(){return {renderer:'three-webgl2',quality,ratio,disposed,contextLost:gl.isContextLost(),...drawStats,...artwork.stats?.(),geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures,programs:renderer.info.programs.length};},
  };
 }catch(error){dispose();throw error;}
}

export function pointMaterial(uniforms,vertexShader,fragmentShader){
 return new T.ShaderMaterial({uniforms,vertexShader,fragmentShader,transparent:true,depthWrite:false,blending:T.AdditiveBlending});
}
export const moteFragment=`varying vec3 vColor;varying float vAlpha;void main(){float d=length(gl_PointCoord-.5);float a=exp(-d*d*35.)+.12*exp(-d*d*9.);gl_FragColor=vec4(vColor,a*vAlpha);}`;
