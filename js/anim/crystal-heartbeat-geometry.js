import * as T from '../vendor/three/three.module.min.js';
import {random} from './expert-runtime.js';

// An implicit 3D volume: rounded lobes, a recessed cleft, tapered lower chamber
// and continuous front/back curvature. No extrusion or joined spheres.
function field(x,y,z){const v=y-.035*x,a=x*x+2.4*z*z+v*v-1;return a*a*a-x*x*v*v*v-.12*z*z*v*v*v;}
function normal(x,y,z){const e=.0003;return new T.Vector3(field(x+e,y,z)-field(x-e,y,z),field(x,y+e,z)-field(x,y-e,z),field(x,y,z+e)-field(x,y,z-e)).normalize();}
export function heartFragments(){
 const nx=52,ny=58,nz=40,points=[],values=new Float32Array((nx+1)*(ny+1)*(nz+1)),strideX=nx+1,strideZ=(nx+1)*(ny+1);
 const id=(x,y,z)=>z*strideZ+y*strideX+x;
 for(let z=0;z<=nz;z++)for(let y=0;y<=ny;y++)for(let x=0;x<=nx;x++){const p=new T.Vector3(-1.4+x/nx*2.8,-1.25+y/ny*2.8,-.85+z/nz*1.7),i=id(x,y,z);points[i]=p;values[i]=field(p.x,p.y,p.z);}
 const vertices=[],normals=[],triangles=[],edges=new Map();
 const tetrahedra=[[0,5,1,6],[0,1,2,6],[0,2,3,6],[0,3,7,6],[0,7,4,6],[0,4,5,6]];
 const edge=(a,b)=>{
  const key=a<b?a+':'+b:b+':'+a;if(edges.has(key))return edges.get(key);
  const amount=values[a]/(values[a]-values[b]),p=points[a].clone().lerp(points[b],amount),n=normal(p.x,p.y,p.z),index=vertices.length;vertices.push(p);normals.push(n);edges.set(key,index);return index;
 };
 const triangle=(a,b,c)=>{const u=vertices[b].clone().sub(vertices[a]),v=vertices[c].clone().sub(vertices[a]);if(u.cross(v).dot(normals[a])<0)[b,c]=[c,b];triangles.push([a,b,c]);};
 for(let z=0;z<nz;z++)for(let y=0;y<ny;y++)for(let x=0;x<nx;x++){
  const cube=[id(x,y,z),id(x+1,y,z),id(x+1,y+1,z),id(x,y+1,z),id(x,y,z+1),id(x+1,y,z+1),id(x+1,y+1,z+1),id(x,y+1,z+1)];
  const inside=cube.filter(i=>values[i]<0).length;if(!inside||inside===8)continue;
  for(const tet of tetrahedra){const yes=tet.map(i=>cube[i]).filter(i=>values[i]<0),no=tet.map(i=>cube[i]).filter(i=>values[i]>=0);if(!yes.length||!no.length)continue;
   if(yes.length===1){triangle(...no.map(n=>edge(yes[0],n)));}
   else if(no.length===1){triangle(...yes.map(n=>edge(no[0],n)));}
   else{const a=edge(yes[0],no[0]),b=edge(yes[0],no[1]),c=edge(yes[1],no[0]),d=edge(yes[1],no[1]);triangle(a,b,c);triangle(b,d,c);}
  }
 }
 // The polynomial has a repeated root near its equator. Relax the sampled
 // isosurface and derive area-weighted normals from the actual surface rather
 // than its almost-zero analytic gradient, which creates optical pinching.
 const neighbors=vertices.map(()=>new Set());
 for(const tri of triangles)for(let j=0;j<3;j++){neighbors[tri[j]].add(tri[(j+1)%3]);neighbors[tri[j]].add(tri[(j+2)%3]);}
 for(let pass=0;pass<5;pass++){
  const next=vertices.map((p,i)=>{const average=new T.Vector3();for(const n of neighbors[i])average.add(vertices[n]);average.multiplyScalar(1/neighbors[i].size);return p.clone().lerp(average,.42);});
  for(let i=0;i<vertices.length;i++)vertices[i].copy(next[i]);
 }
 for(const n of normals)n.set(0,0,0);
 for(const [a,b,c]of triangles){const n=vertices[b].clone().sub(vertices[a]).cross(vertices[c].clone().sub(vertices[a]));normals[a].add(n);normals[b].add(n);normals[c].add(n);}
 for(const n of normals)n.normalize();
 for(let pass=0;pass<2;pass++){
  const next=normals.map((n,i)=>{const average=n.clone();for(const j of neighbors[i])average.add(normals[j]);return average.normalize();});
  for(let i=0;i<normals.length;i++)normals[i].copy(next[i]);
 }
 const seeds=Array.from({length:24},(_,i)=>{const y=1-2*(i+.5)/24,r=Math.sqrt(1-y*y),a=i*2.399963+random(i)*.2;return new T.Vector3(Math.cos(a)*r,y,Math.sin(a)*r);}),groups=seeds.map(()=>[]);
 for(const tri of triangles){const center=vertices[tri[0]].clone().add(vertices[tri[1]]).add(vertices[tri[2]]).multiplyScalar(1/3);center.y-=.12;center.normalize();let best=0,score=-10;for(let i=0;i<seeds.length;i++){const s=center.dot(seeds[i]);if(s>score){score=s;best=i;}}groups[best].push(tri);}
 const fragments=groups.map((tris,i)=>{
  const used=new Set(tris.flat()),center=new T.Vector3();for(const v of used)center.add(vertices[v]);center.multiplyScalar(1/used.size);
  const positions=[],normalData=[],global=[],indices=[],cut=[],map=new Map(),border=new Map();
  for(const v of used){map.set(v,positions.length/3);const p=vertices[v],n=normals[v];positions.push(p.x-center.x,p.y-center.y,p.z-center.z);global.push(p.x,p.y,p.z);normalData.push(n.x,n.y,n.z);cut.push(0);}
  const count=positions.length/3;
  for(const v of used){const p=vertices[v],n=normals[v],q=new T.Vector3(p.x*.94,(p.y-.05)*.94+.05,p.z*.94);positions.push(q.x-center.x,q.y-center.y,q.z-center.z);global.push(q.x,q.y,q.z);normalData.push(-n.x,-n.y,-n.z);cut.push(0);}
  for(const tri of tris){const [a,b,c]=tri.map(v=>map.get(v));indices.push(a,b,c,c+count,b+count,a+count);for(let j=0;j<3;j++){const x=tri[j],y=tri[(j+1)%3],k=x<y?x+':'+y:y+':'+x;if(border.has(k))border.delete(k);else border.set(k,[map.get(x),map.get(y)]);}}
  for(const [a,b] of border.values()){
   const ids=[b,a,a+count,b+count],base=positions.length/3,p=ids.map(v=>new T.Vector3(...positions.slice(v*3,v*3+3))),n=p[1].clone().sub(p[0]).cross(p[2].clone().sub(p[0])).normalize();
   for(const v of ids){positions.push(...positions.slice(v*3,v*3+3));global.push(...global.slice(v*3,v*3+3));normalData.push(n.x,n.y,n.z);cut.push(1);}
   indices.push(base,base+1,base+2,base,base+2,base+3);
  }
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('normal',new T.Float32BufferAttribute(normalData,3));geometry.setAttribute('aHeart',new T.Float32BufferAttribute(global,3));geometry.setAttribute('aCut',new T.Float32BufferAttribute(cut,1));geometry.setIndex(indices);
  return {geometry,center,direction:seeds[i],id:i};
 });
 // Once assembled, use the same outer volume as one uninterrupted optical
 // surface. Internal shard interfaces must not refract an already fused heart.
 const surface=new T.BufferGeometry(),positions=vertices.flatMap(p=>[p.x,p.y,p.z]);
 surface.setAttribute('position',new T.Float32BufferAttribute(positions,3));
 surface.setAttribute('normal',new T.Float32BufferAttribute(normals.flatMap(n=>[n.x,n.y,n.z]),3));
 surface.setAttribute('aHeart',new T.Float32BufferAttribute(positions,3));
 surface.setAttribute('aCut',new T.Float32BufferAttribute(new Float32Array(vertices.length),1));
 surface.setIndex(triangles.flat());fragments.surface=surface;
 return fragments;
}
