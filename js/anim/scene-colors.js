import * as T from '../vendor/three/three.module.min.js';
import {paletteDefaults} from '../scene-palettes.js';

// Install once, mutate uniforms/colors only on edits. Default = exact original.
export function sceneColors(id,scene){
 const defaults=paletteDefaults(id),bindings=[],values={},scratch=new T.Color();let revision=0;
 const bind=(key,color)=>{if(!color?.isColor)throw Error(`Invalid color binding ${id}:${key}`);bindings.push({key,color,original:color.clone()});return api;};
 const tint=(key,material)=>{
  const uniform={value:new T.Color(1,1,1)},mix={value:0},original=material.onBeforeCompile;
  const inject=shader=>{shader.uniforms.uSceneTint=uniform;shader.uniforms.uSceneTintMix=mix;shader.fragmentShader='uniform vec3 uSceneTint;uniform float uSceneTintMix;\n'+shader.fragmentShader;const end=shader.fragmentShader.lastIndexOf('}');shader.fragmentShader=shader.fragmentShader.slice(0,end)+'\ngl_FragColor.rgb=mix(gl_FragColor.rgb,dot(gl_FragColor.rgb,vec3(.2126,.7152,.0722))*uSceneTint,uSceneTintMix);\n'+shader.fragmentShader.slice(end);};
  if(material.isShaderMaterial)inject(material); // shaders retain their internal gradients
  else{material.onBeforeCompile=function(shader,...args){original.call(this,shader,...args);inject(shader);};material.customProgramCacheKey=()=>`scene-tint:${id}:${key}`;}
  bindings.push({key,color:uniform.value,original:new T.Color(1,1,1),tint:true,mix});return api;
 };
 const api={bind,tint,group(key,group){const seen=new Set();group.traverse(o=>{for(const m of (Array.isArray(o.material)?o.material:[o.material]))if(m&&!seen.has(m)){seen.add(m);tint(key,m);}});return api;},update(card={}){
  for(const control of Object.keys(defaults)){
   const value=/^#[0-9a-f]{6}$/i.test(card[control]||'')?card[control].toLowerCase():defaults[control];
   if(values[control]===value)continue;values[control]=value;revision++;
   scratch.set(value);
   for(const b of bindings)if(b.key===control){
    if(b.mix)b.mix.value=value===defaults[control]?0:.9;
    if(value===defaults[control])b.color.copy(b.original);
    else if(b.tint){
     // Hue tint with bounded luminance: preserve detail in HDR and dark materials.
     const luminance=Math.max(scratch.r*.2126+scratch.g*.7152+scratch.b*.0722,.025);
     b.color.copy(scratch).multiplyScalar(Math.min(4,1/luminance));
    }else {b.color.copy(scratch);if(control==='c6'){const peak=Math.max(b.color.r,b.color.g,b.color.b);if(peak>.045)b.color.multiplyScalar(.045/peak);}}
   }
  }
 },stats:()=>({palette:{...values},paletteRevision:revision})};
 if(scene?.background?.isColor)bind('c6',scene.background);
 if(scene?.fog?.color)bind('c6',scene.fog.color);
 return api;
}
