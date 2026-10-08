import * as T from '../vendor/three/three.module.min.js';
import {random} from './expert-runtime.js';

export function workshop({keep,scene,renderer}) {
 const geometry=new Map(),materials=new Map();
 const geo=(key,make)=>{if(!geometry.has(key))geometry.set(key,keep(make()));return geometry.get(key);};
 const mat=(key,options)=>{if(!materials.has(key))materials.set(key,keep(new T.MeshStandardMaterial(options)));return materials.get(key);};
 const mesh=(g,m,parent=scene,x=0,y=0,z=0,sx=1,sy=1,sz=1)=>{const o=new T.Mesh(g,m);o.position.set(x,y,z);o.scale.set(sx,sy,sz);parent.add(o);return o;};
 const box=(m,parent,x,y,z,sx,sy,sz)=>mesh(geo('box',()=>new T.BoxGeometry(1,1,1)),m,parent,x,y,z,sx,sy,sz);
 const sphere=(m,parent,x,y,z,sx,sy=sx,sz=sx)=>mesh(geo('sphere',()=>new T.SphereGeometry(1,32,24)),m,parent,x,y,z,sx,sy,sz);
 const tube=(points,r,m,parent=scene,closed=false)=>mesh(keep(new T.TubeGeometry(new T.CatmullRomCurve3(points,closed),Math.max(24,points.length*3),r,5,closed)),m,parent);
 const light=(color,power,x,y,z,distance=20)=>{const l=new T.PointLight(color,power,distance,2);l.position.set(x,y,z);scene.add(l);return l;};
 const envScene=new T.Scene();envScene.background=new T.Color(0x10121d);
 for(const [x,y,z,color,power] of [[-4,3,1,0xffcd88,7],[3,1,-2,0x928bff,4],[0,5,0,0xffffff,5]]){
  const p=new T.Mesh(new T.PlaneGeometry(3,5),new T.MeshBasicMaterial({color}));p.material.color.multiplyScalar(power);p.position.set(x,y,z);p.lookAt(0,0,0);envScene.add(p);
 }
 const pmrem=new T.PMREMGenerator(renderer),env=keep(pmrem.fromScene(envScene,.15));scene.environment=env.texture;pmrem.dispose();envScene.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});
 scene.add(new T.HemisphereLight(0x7e90b9,0x14101f,.65));
 return {geo,mat,mesh,box,sphere,tube,light};
}

export function candle(W,keep,parent,x,y,z,height=1) {
 const group=new T.Group();group.position.set(x,y,z);parent.add(group);
 const waxGroup=new T.Group();group.add(waxGroup);
 const wax=W.mat('wax',{color:0xf5dfb9,roughness:.7});
 W.mesh(W.geo('candle',()=>new T.CylinderGeometry(.13,.15,1,20)),wax,waxGroup,0,height/2,0,1,height,1);
 for(let i=0;i<5;i++){const a=i*2.399,drip=.05+random(i+height*20)*height*.3;W.mesh(W.geo('wax-drip',()=>new T.CapsuleGeometry(.018,1,3,6)),wax,waxGroup,Math.cos(a)*.127,height-drip/2,Math.sin(a)*.127,1,drip,1);}
 bakeStatic(waxGroup,keep);
 const flameMaterial=keep(new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending,uniforms:{time:{value:0},strength:{value:1}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:`varying vec2 vUv;uniform float time,strength;void main(){float y=vUv.y;float x=(vUv.x-.5)+sin(y*7.-time*5.)*.035*y;float width=.25*pow(max(.001,1.-y),.7);float a=exp(-pow(x/width,2.)*3.)*smoothstep(0.,.12,y)*pow(1.-y,.45);vec3 c=mix(vec3(1.,.15,.015),vec3(1.,.85,.4),exp(-x*x*250.)*(1.-y));gl_FragColor=vec4(c*2.,a*strength);}`}));
 const flame=W.mesh(W.geo('flame',()=>new T.PlaneGeometry(.26,.48)),flameMaterial,group,0,height+.20,0);
 return {group,flame,update(t,strength,camera){flameMaterial.uniforms.time.value=t;flameMaterial.uniforms.strength.value=strength;flame.quaternion.copy(camera.quaternion);}};
}

export function fogBank(W,keep,scene,color=0x7586ad,count=12) {
 const material=keep(new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,uniforms:{time:{value:0},color:{value:new T.Color(color)}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:`varying vec2 vUv;uniform float time;uniform vec3 color;float n(vec2 p){return sin(p.x*3.+sin(p.y*4.))*sin(p.y*2.-p.x*.7); }void main(){vec2 p=vUv;float edge=pow(max(0.,sin(p.x*3.14159)*sin(p.y*3.14159)),1.5);float f=.5+.24*n(p*5.+vec2(time*.035,0.))+.12*n(p*13.-time*.017);gl_FragColor=vec4(color,edge*f*.16);}`}));
 const group=new T.Group();scene.add(group);
 for(let i=0;i<count;i++){const p=W.mesh(W.geo('fog',()=>new T.PlaneGeometry(24,3)),material,group,(random(i)*2-1)*4,.15+random(i+8)*1.7,-i*1.8);p.rotation.y=(random(i+5)-.5)*.3;}
 return {group,update(t){material.uniforms.time.value=t;}};
}

export function motes({keep,scene},count,color,spread=8) {
 const positions=new Float32Array(count*3),seeds=new Float32Array(count);
 for(let i=0;i<count;i++){positions[i*3]=(random(i+10)-.5)*spread;positions[i*3+1]=random(i+36)*spread*.8;positions[i*3+2]=(random(i+63)-.5)*spread;seeds[i]=random(i+97);}
 const g=keep(new T.BufferGeometry());g.setAttribute('position',new T.BufferAttribute(positions,3));g.setAttribute('seed',new T.BufferAttribute(seeds,1));
 const m=keep(new T.ShaderMaterial({transparent:true,depthWrite:false,blending:T.AdditiveBlending,uniforms:{time:{value:0},power:{value:1},color:{value:new T.Color(color)},burst:{value:0},touch:{value:new T.Vector2(0,0)}},vertexShader:`attribute float seed;uniform float time,power,burst;uniform vec2 touch;varying float alpha;void main(){vec3 p=position;p.y=mod(p.y+time*(.08+seed*.12),7.);p.x+=sin(time*.4+seed*34.+p.y)*.15;p.z+=cos(time*.27+seed*53.)*.2;float d=length(p.xy-touch);p.xy+=(p.xy-touch)*exp(-d*d)*.35;p*=1.+burst*seed*2.;vec4 v=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*v;gl_PointSize=clamp((5.+seed*13.)/-v.z,1.,5.);alpha=power*(.35+.65*seed);}`,fragmentShader:'uniform vec3 color;varying float alpha;void main(){float d=length(gl_PointCoord-.5);gl_FragColor=vec4(color*2.,exp(-d*d*30.)*alpha);}'}));
 const p=new T.Points(g,m);scene.add(p);return {object:p,uniforms:m.uniforms,reduce(){p.geometry.setDrawRange(0,Math.floor(count*.5));}};
}

// A curved, cupped petal. Shared by instanced flowers and airborne petals.
export function petalGeometry(keep) {
 const g=new T.PlaneGeometry(1,1,4,6),a=g.attributes.position;
 for(let i=0;i<a.count;i++){const u=a.getX(i)*2,v=a.getY(i)+.5,width=Math.sin(Math.PI*v)**.6; a.setXYZ(i,u*.19*width,v*.68,Math.sin(v*Math.PI)*.16+u*u*.09+Math.sin(v*9.)*.014);}
 g.computeVertexNormals();return keep(g);
}

// Bake only static architecture, retaining separate materials and local space.
export function bakeStatic(group,keep){
 group.updateMatrixWorld(true);const inverse=group.matrixWorld.clone().invert(),batches=new Map(),old=[];
 group.traverse(o=>{if(!o.isMesh||o.isInstancedMesh)return;old.push(o);const matrix=inverse.clone().multiply(o.matrixWorld),g=(o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone()).applyMatrix4(matrix);let b=batches.get(o.material);if(!b){b={position:[],normal:[],uv:[]};batches.set(o.material,b);}for(const name of ['position','normal','uv']){const a=g.attributes[name];if(a)for(let i=0;i<a.array.length;i++)b[name].push(a.array[i]);}g.dispose();});
 for(const o of old)o.removeFromParent();
 for(const [material,b] of batches){const g=keep(new T.BufferGeometry());g.setAttribute('position',new T.Float32BufferAttribute(b.position,3));g.setAttribute('normal',new T.Float32BufferAttribute(b.normal,3));if(b.uv.length)g.setAttribute('uv',new T.Float32BufferAttribute(b.uv,2));const m=new T.Mesh(g,material);m.castShadow=m.receiveShadow=true;group.add(m);}
}
