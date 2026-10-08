import * as T from '../vendor/three/three.module.min.js';
import {GLTFLoader} from '../vendor/three/GLTFLoader.js';

const base=new URL('../../assets/haunted-night/web/',import.meta.url);
const loader=new T.TextureLoader();
const mobile=typeof matchMedia==='function'&&matchMedia('(max-width: 600px)').matches;
const modest=mobile||globalThis.navigator?.connection?.saveData||globalThis.navigator?.deviceMemory<=4;
// This module is loaded only with Haunted Night. Templates never enter a renderer:
// every player owns its GPU resources; decoded image data can be safely shared.
let templates=null,loadError=null;
function available(){
 if(typeof document==='undefined')return false;
 const canvas=document.createElement('canvas'),gl=canvas.getContext('webgl2');
 if(!gl)return false;
 const supported=Boolean(gl.getExtension('EXT_color_buffer_float'));gl.getExtension('WEBGL_lose_context')?.loseContext();return supported;
}
if(available()){
 let timeout;
 try{
  const work=Promise.all([
   new GLTFLoader().loadAsync(new URL('dead-tree-trunk.glb',base).href),
   loader.loadAsync(new URL(`forest-diff-${modest?512:1024}.jpg`,base).href),
   modest?null:loader.loadAsync(new URL('forest-nor_gl-1024.jpg',base).href),
   modest?null:loader.loadAsync(new URL('forest-rough-1024.jpg',base).href),
  ]);
  templates=await Promise.race([work,new Promise((_,reject)=>{timeout=setTimeout(()=>reject(Error('Asset loading timeout')),12000);})]);
 }catch(error){loadError=error.message;console.warn('Haunted Night: entorno procedural de respaldo.',error.message);}
 finally{clearTimeout(timeout);}
}

export function addHauntedAssets({scene,keep,renderer,low}){
 if(!templates)return {ready:false,error:loadError||'No browser'};
 const [gltf,diff,normal,rough]=templates;
 const copies=new Map();
 const texture=(source,color=false)=>{
  if(!source)return null;
  if(copies.has(source))return copies.get(source);
  const t=keep(source.clone());t.colorSpace=color?T.SRGBColorSpace:T.NoColorSpace;
  t.anisotropy=Math.min(low?2:4,renderer.capabilities.getMaxAnisotropy());t.needsUpdate=true;copies.set(source,t);return t;
 };
 const groundMap=texture(diff,true),normalMap=low?null:texture(normal),roughnessMap=low?null:texture(rough);
 for(const t of [groundMap,normalMap,roughnessMap].filter(Boolean)){t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(18,18);}
 const groundMaterial=keep(new T.MeshStandardMaterial({map:groundMap,normalMap,roughnessMap,color:0x506078,roughness:.96,normalScale:new T.Vector2(.65,.65),envMapIntensity:.18}));
 const ground=new T.Mesh(keep(new T.PlaneGeometry(60,60)),groundMaterial);ground.rotation.x=-Math.PI/2;ground.position.y=-.055;ground.receiveShadow=true;scene.add(ground);
 gltf.scene.updateMatrixWorld(true);
 const bounds=new T.Box3().setFromObject(gltf.scene),size=bounds.getSize(new T.Vector3()),center=bounds.getCenter(new T.Vector3());
 const scale=3.7/Math.max(size.x,size.z),positions=[[-3.2,7.5,.23],[3.6,4.3,-.5],[-6.5,-6.5,1.05]];
 const count=low?2:3;
 gltf.scene.traverse(source=>{
  if(!source.isMesh)return;
  const geometry=keep(source.geometry.clone());geometry.applyMatrix4(source.matrixWorld);
  geometry.translate(-center.x,-bounds.min.y,-center.z);geometry.scale(scale,scale,scale);
  const material=keep(source.material.clone());
  for(const key of ['map','normalMap','roughnessMap','metalnessMap','aoMap','emissiveMap'])if(material[key])material[key]=texture(material[key],key==='map'||key==='emissiveMap');
  material.envMapIntensity=.4;material.normalScale?.set(.8,.8);
  const logs=new T.InstancedMesh(geometry,material,count);keep(logs);logs.castShadow=!low;logs.receiveShadow=true;
  const object=new T.Object3D();positions.slice(0,count).forEach(([x,z,yaw],i)=>{object.position.set(x,-.045,z);object.rotation.y=yaw;object.updateMatrix();logs.setMatrixAt(i,object.matrix);});
  scene.add(logs);
 });
 return {ready:true,logs:count,groundPixels:diff.image.width,tier:modest?'mobile':'desktop',reduce(){groundMaterial.normalMap=null;groundMaterial.roughnessMap=null;groundMaterial.needsUpdate=true;}};
}
