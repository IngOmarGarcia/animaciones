import {sceneColors} from './scene-colors.js';
import {expertRenderer,ease} from './expert-runtime.js';
import {horizonFragment} from './event-horizon-shader.js';
export const HORIZON_MESSAGE='El universo es infinito, pero este momento es único.';
export function createHorizonRenderer(w,h,options={}){
 return expertRenderer(w,h,{...options,maxRatio:1.25,lowRatio:.8},({T,scene,camera,keep,low})=>{
  const uniforms={uDiskTint:{value:new T.Color(1,1,1)},uHotTint:{value:new T.Color(1,1,1)},uStarTint:{value:new T.Color(1,1,1)},uTime:{value:0},uAspect:{value:w/h},uFov:{value:Math.tan(18*Math.PI/180)},uOrigin:{value:new T.Vector3()},uRight:{value:new T.Vector3()},uUp:{value:new T.Vector3()},uBack:{value:new T.Vector3()},uMass:{value:0},uDisk:{value:0},uPulse:{value:0},uSteps:{value:low?72:112}};
  const material=keep(new T.ShaderMaterial({uniforms,vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',fragmentShader:horizonFragment,depthTest:false,depthWrite:false}));
  const quad=new T.Mesh(keep(new T.PlaneGeometry(2,2)),material);quad.frustumCulled=false;scene.add(quad);
  const palette=sceneColors('event-horizon',scene);palette.bind('c1',uniforms.uDiskTint.value).bind('c2',uniforms.uHotTint.value).bind('c3',uniforms.uStarTint.value);
  return {
   update(t,dt,pointer,motion,card){
    palette.update(card);
    const travel=motion?t:20,arrival=ease((t-.8)/5.6),distance=Math.max(20.5,17.8/(w/h))+(1-arrival)*3.8;
    const orbit=-.16+Math.sin(travel*.075)*.13+pointer.x*.20,elevation=.22+Math.sin(travel*.11)*.025+pointer.y*.06;
    camera.position.set(Math.sin(orbit)*distance,elevation*distance,Math.cos(orbit)*distance);camera.lookAt(0,-1.3,0);camera.updateMatrixWorld();
    uniforms.uOrigin.value.copy(camera.position);uniforms.uRight.value.setFromMatrixColumn(camera.matrixWorld,0);uniforms.uUp.value.setFromMatrixColumn(camera.matrixWorld,1);uniforms.uBack.value.setFromMatrixColumn(camera.matrixWorld,2);
    uniforms.uTime.value=travel;uniforms.uMass.value=ease((t-1.3)/3.4);uniforms.uDisk.value=ease((t-2.5)/3.2);uniforms.uPulse.value=ease((t-8.2)/3.4);
   },
   reduce(){uniforms.uSteps.value=72;},stats:()=>({...palette.stats(),raySteps:uniforms.uSteps.value,volume:'curved-rays-accretion-field'}),
  };
 });
}
