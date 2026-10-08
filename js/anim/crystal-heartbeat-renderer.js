import {sceneColors} from './scene-colors.js';
import {expertRenderer,ease,random,pointMaterial,moteFragment} from './expert-runtime.js';
import {heartFragments} from './crystal-heartbeat-geometry.js';
import {heartbeatEnvironment,heartbeatGlass} from './crystal-heartbeat-material.js';
export const HEARTBEAT_MESSAGE='Cada latido guarda un poquito de ti. ❤️';
function heartbeat(t){const p=((t%1.32)+1.32)%1.32/1.32;return Math.exp(-Math.pow((p-.16)/.055,2))*.8+Math.exp(-Math.pow((p-.34)/.075,2))*.48;}
export function createHeartbeatRenderer(w,h,options={}){return expertRenderer(w,h,{maxRatio:1.5,lowRatio:.8,...options},({T,renderer,scene,camera,keep,low})=>{
 const environment=keep(heartbeatEnvironment(renderer));scene.environment=environment.texture;
 const heart=new T.Group();heart.position.y=.28;scene.add(heart);
 const pieces=heartFragments(),glass=keep(heartbeatGlass()),solidGlass=keep(heartbeatGlass());
 const solid=new T.Mesh(keep(pieces.surface),solidGlass);solid.visible=false;heart.add(solid);
 const fragments=pieces.map(p=>{const mesh=new T.Mesh(keep(p.geometry),glass);heart.add(mesh);return {...p,mesh};});
 const key=new T.DirectionalLight(0xffe4eb,1);key.position.set(-3,4,4);scene.add(key);const rim=new T.DirectionalLight(0xa0baff,.65);rim.position.set(3,1,-3);scene.add(rim);
 const innerLight=new T.PointLight(0xff3659,1.2,5,2);innerLight.position.set(0,.4,.1);scene.add(innerLight);
 // The small first light is an irregular plasma knot. It remains behind the
 // assembled shell, while the circulating energy follows the heart's volume.
 const coreMaterial=keep(new T.ShaderMaterial({transparent:true,depthWrite:false,blending:T.AdditiveBlending,uniforms:{uTime:{value:0},uIntensity:{value:0}},vertexShader:`varying vec3 vNormal;varying vec3 vPosition;uniform float uTime;void main(){vec3 p=position*(1.+sin(position.x*21.+uTime)*.12+sin(position.y*29.-uTime*.7)*.08);vPosition=p;vNormal=normal;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,fragmentShader:`varying vec3 vNormal,vPosition;uniform float uTime,uIntensity;void main(){float f=.4+.6*pow(abs(vNormal.z),2.);vec3 c=mix(vec3(.65,.008,.035),vec3(2.,.17,.22),f);gl_FragColor=vec4(c*uIntensity,.35*uIntensity);}`}));
 const core=new T.Mesh(keep(new T.SphereGeometry(.14,32,24)),coreMaterial);core.position.set(0,.08,0);heart.add(core);
 const count=low?650:1800,positions=new Float32Array(count*3),ids=new Float32Array(count),normals=new Float32Array(count*3);
 for(let i=0;i<count;i++){const f=fragments[i%fragments.length],a=f.geometry.attributes.aHeart,n=f.geometry.attributes.normal,j=Math.floor(random(i+49)*a.count/2);positions.set([a.getX(j),a.getY(j),a.getZ(j)],i*3);normals.set([n.getX(j),n.getY(j),n.getZ(j)],i*3);ids[i]=i;}
 const geo=keep(new T.BufferGeometry());geo.setAttribute('position',new T.BufferAttribute(positions,3));geo.setAttribute('aNormal',new T.BufferAttribute(normals,3));geo.setAttribute('aId',new T.BufferAttribute(ids,1));
 const energyMat=keep(pointMaterial({uTime:{value:0},uBeat:{value:0},uReveal:{value:0},uRatio:{value:1}},`
  attribute float aId;attribute vec3 aNormal;uniform float uTime,uBeat,uReveal,uRatio;varying vec3 vColor;varying float vAlpha;
  void main(){float q=fract(aId*.618),phase=uTime*.55+aId*2.39996;vec3 p;
   if(q<.72){vec3 stream=vec3(sin(phase)*.44,cos(phase)*.57+.06,cos(phase*1.3)*.22);p=mix(position*.45,stream,.7);p.x+=sin(phase*1.4)*.035;p.z+=sin(phase*.7)*.03;}
   else{float age=fract((uTime-6.)/1.32+q);p=position+aNormal*(age*.55+.03*uBeat);}
   vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;gl_PointSize=clamp(uRatio*(1.+fract(aId*.19))*17./-mv.z,1.,6.);
   vColor=mix(vec3(.7,.025,.07),vec3(1.8,.35,.5),fract(aId*.13));vAlpha=uReveal*(.2+.5*uBeat)*(q<.72?1.:pow(1.-fract((uTime-6.)/1.32+q),2.)*.4);
  }`,moteFragment));heart.add(new T.Points(geo,energyMat));
 const palette=sceneColors('crystal-heartbeat',scene);palette.tint('c1',glass).tint('c1',solidGlass).bind('c2',rim.color).tint('c3',energyMat).tint('c4',coreMaterial).bind('c4',innerLight.color);
 return {
  update(t,dt,pointer,motion,card,ratio){
   palette.update(card);
   const travel=motion?t:20,assembly=ease((t-1.8)/4.8),fused=ease((t-6)/.9),beat=heartbeat(travel-6)*ease((t-5.8)/1.5),first=ease((t-.3)/.8);
   for(const f of fragments){const arrive=ease((t-1.8-random(f.id+19)*1.3)/3.2),flight=1-arrive;f.mesh.visible=arrive>.001&&fused<.999;f.mesh.position.copy(f.center).addScaledVector(f.direction,flight*(1.0+random(f.id)*1.8));f.mesh.rotation.set(flight*Math.sin(f.id)*.65,flight*Math.cos(f.id)*.7,flight*.35*Math.sin(f.id*3));f.mesh.scale.setScalar(.65+.35*arrive);}
   solid.visible=fused>.001;
   for(const [material,reveal] of [[glass,assembly*(1-fused)],[solidGlass,fused]]){
    material.userData.uniforms.uReveal.value=reveal;material.userData.uniforms.uBeat.value=beat;material.userData.uniforms.uTime.value=travel;material.userData.uniforms.uJoined.value=ease((t-5.2)/1.3);
   }
   heart.rotation.set(.05+Math.sin(travel*.13)*.025,.28+Math.sin(travel*.12)*.18+pointer.x*.22,Math.sin(travel*.17)*.018);
   coreMaterial.uniforms.uTime.value=travel;coreMaterial.uniforms.uIntensity.value=first*(.4+heartbeat(travel)*.65)*(1-assembly);core.scale.setScalar(1+beat*.12);
   innerLight.intensity=first*(.40+beat*.45);
   energyMat.uniforms.uTime.value=travel;energyMat.uniforms.uBeat.value=beat;energyMat.uniforms.uReveal.value=ease((t-3.4)/2.4);energyMat.uniforms.uRatio.value=ratio;
   const distance=Math.max(7.1,4.7/(w/h))+(1-assembly)*5;camera.position.set(pointer.x*.35,.65+pointer.y*.4,distance);camera.lookAt(0,-.5,0);
  },
  reduce(){geo.setDrawRange(0,650);},stats:()=>({...palette.stats(),fragments:fragments.length,particles:Math.min(count,geo.drawRange.count),surface:'implicit-closed-volume'}),
 };
});}
