import * as T from '../vendor/three/three.module.min.js';
import {seed} from './eternal-bloom-geometry.js';
export function makeMotes(count,petals){
 const positions=new Float32Array(count*3),ids=new Float32Array(count),sizes=new Float32Array(count);
 for(let i=0;i<count;i++){ids[i]=i;positions.set([(seed(i+1)-.5)*7,(seed(i+700)-.5)*7,(seed(i+1001)-.5)*5],i*3);sizes[i]=.65+seed(i+33)*1.45;}
 const targets=new Float32Array(count*3),closed=new Float32Array(count*3),layers=new Float32Array(count);
 for(let i=0;i<count;i++){const petal=petals[i%petals.length],geometry=petal.mesh.geometry,v=Math.floor(seed(i+147)*geometry.attributes.position.count/2);for(let c=0;c<3;c++){targets[i*3+c]=geometry.attributes.position.array[v*3+c];closed[i*3+c]=geometry.morphAttributes.position[0].array[v*3+c];}layers[i]=petal.p.ring;}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(positions,3));g.setAttribute('aId',new T.BufferAttribute(ids,1));g.setAttribute('aSize',new T.BufferAttribute(sizes,1));g.setAttribute('aTarget',new T.BufferAttribute(targets,3));g.setAttribute('aClosed',new T.BufferAttribute(closed,3));g.setAttribute('aLayer',new T.BufferAttribute(layers,1));
 const m=new T.ShaderMaterial({transparent:true,depthWrite:false,blending:T.AdditiveBlending,uniforms:{uTime:{value:0},uRatio:{value:1},uPull:{value:0},uSettle:{value:0},uCount:{value:count}},vertexShader:`
  attribute float aId;attribute float aSize;attribute vec3 aTarget;attribute vec3 aClosed;attribute float aLayer;uniform float uTime,uRatio,uPull,uSettle,uCount;varying float vAlpha;varying float vGold;
  float rnd(float n){return fract(sin(n*127.1+311.7)*43758.5453);}
  void main(){
   float q=aId/uCount,phase=rnd(aId+91.)*6.283185;
   vec3 free=position+vec3(sin(uTime*.13+phase),cos(uTime*.11+phase)*.8,sin(uTime*.09+phase*2.))*.14;
   float turn=phase+uTime*(.28+q*.19),r=1.65*(1.-uSettle)+.16;
   vec3 spiral=vec3(cos(turn)*r, q*3.5-1.9,sin(turn)*r);
   vec3 orbit=vec3(cos(phase+uTime*.15)*(1.5+rnd(aId+9.)*.7),.45+sin(phase*2.+uTime*.12)*1.2,sin(phase+uTime*.15)*1.45);
   float build=step(.28,rnd(aId+37.)),opened=smoothstep(4.4+aLayer*.39,7.8+aLayer*.39,uTime);
   vec3 target=mix(aClosed,aTarget,opened);
   vec3 p=mix(free,spiral,uPull*build);p=mix(p,target,smoothstep(3.1,7.4,uTime)*build);
   float release=step(.70,rnd(aId+71.));p=mix(p,orbit,uSettle*release*build);
   vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;
   gl_PointSize=clamp(aSize*uRatio*20./-mv.z,1.,8.);vAlpha=(.16+.6*rnd(aId+5.))*(.7+.3*sin(uTime*.5+phase));vGold=rnd(aId+11.);
  }`,fragmentShader:`varying float vAlpha;varying float vGold;void main(){float r=length(gl_PointCoord-.5);float core=exp(-r*r*45.),halo=exp(-r*r*12.)*.22;gl_FragColor=vec4(mix(vec3(.77,.42,.12),vec3(1.,.86,.57),vGold),vAlpha*(core+halo));}`});
 return new T.Points(g,m);
}
