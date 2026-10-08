import * as T from '../vendor/three/three.module.min.js';

// Smooth implicit bone volume with real recessed orbital cavities and a hollow
// nasal opening. Marching tetrahedra keeps the cranium, cheeks and jaw continuous.
export function skullGeometry(keep) {
 const ell=(x,y,z,cx,cy,cz,rx,ry,rz)=>(Math.sqrt(((x-cx)/rx)**2+((y-cy)/ry)**2+((z-cz)/rz)**2)-1)*Math.min(rx,ry,rz);
 const blend=(a,b,k=.18)=>{const h=Math.max(k-Math.abs(a-b),0)/k;return Math.min(a,b)-h*h*k*.25;};
 const field=(x,y,z)=>{
  let d=ell(x,y,z,0,.45,0,1.04,1.16,.79);
  d=blend(d,ell(x,y,z,0,-.65,.1,.78,.65,.61),.3);
  for(const s of [-1,1])d=blend(d,ell(x,y,z,s*.68,-.18,.34,.42,.43,.5));
  for(const s of [-1,1])d=Math.max(d,-ell(x,y,z,s*.43,.17,.72,.32,.37,.4));
  d=Math.max(d,-ell(x,y,z,0,-.22,.75,.17,.28,.29));
  d=Math.max(d,-ell(x,y,z,0,-.76,.63,.6,.09,.15));return d;
 };
 const n=49,points=[],values=[],index=(x,y,z)=>x+(n+1)*(y+(n+1)*z);
 for(let z=0;z<=n;z++)for(let y=0;y<=n;y++)for(let x=0;x<=n;x++){const p=new T.Vector3(-1.3+x/n*2.6,-1.4+y/n*3.2,-1+z/n*2.2);points.push(p);values.push(field(p.x,p.y,p.z));}
 const out=[],tetra=[[0,5,1,6],[0,1,2,6],[0,2,3,6],[0,3,7,6],[0,7,4,6],[0,4,5,6]];
 const cross=(a,b)=>points[a].clone().lerp(points[b],values[a]/(values[a]-values[b]));
 const tri=(a,b,c)=>{const center=a.clone().add(b).add(c).multiplyScalar(1/3),e=.002,normal=new T.Vector3(field(center.x+e,center.y,center.z)-field(center.x-e,center.y,center.z),field(center.x,center.y+e,center.z)-field(center.x,center.y-e,center.z),field(center.x,center.y,center.z+e)-field(center.x,center.y,center.z-e));if(b.clone().sub(a).cross(c.clone().sub(a)).dot(normal)<0)[b,c]=[c,b];out.push(...a.toArray(),...b.toArray(),...c.toArray());};
 for(let z=0;z<n;z++)for(let y=0;y<n;y++)for(let x=0;x<n;x++){
  const c=[index(x,y,z),index(x+1,y,z),index(x+1,y+1,z),index(x,y+1,z),index(x,y,z+1),index(x+1,y,z+1),index(x+1,y+1,z+1),index(x,y+1,z+1)];
  if(c.every(i=>values[i]>0)||c.every(i=>values[i]<=0))continue;
  for(const t of tetra){const a=t.map(i=>c[i]).filter(i=>values[i]<=0),b=t.map(i=>c[i]).filter(i=>values[i]>0);if(a.length===1)tri(...b.map(i=>cross(a[0],i)));else if(b.length===1)tri(...a.map(i=>cross(i,b[0])));else if(a.length===2){const p=cross(a[0],b[0]),q=cross(a[0],b[1]),r=cross(a[1],b[0]),s=cross(a[1],b[1]);tri(p,q,r);tri(q,s,r);}}
 }
 const normals=[],e=.003;for(let i=0;i<out.length;i+=3){const [x,y,z]=out.slice(i,i+3),v=new T.Vector3(field(x+e,y,z)-field(x-e,y,z),field(x,y+e,z)-field(x,y-e,z),field(x,y,z+e)-field(x,y,z-e)).normalize();normals.push(v.x,v.y,v.z);}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(out,3));g.setAttribute('normal',new T.Float32BufferAttribute(normals,3));return keep(g);
}

export function ornamentPaths() {
 const paths=[];
 for(const side of [-1,1]){
  const eye=[];for(let i=0;i<=100;i++){const a=i/100*Math.PI*2,r=.4+.035*Math.cos(a*12);eye.push(new T.Vector3(side*.43+Math.cos(a)*r,.17+Math.sin(a)*r*1.08,.76+Math.sin(a)*.025));}paths.push(eye);
  for(let j=0;j<4;j++){const p=[];for(let i=0;i<=48;i++){const a=i/48*5.8,r=.015+i/48*.17;p.push(new T.Vector3(side*(.53+j*.065+Math.cos(a)*r),-.29-j*.12+Math.sin(a)*r,.69-j*.015));}paths.push(p);}
 }
 for(let j=0;j<8;j++){const p=[];for(let i=0;i<=35;i++){const a=i/35*Math.PI*2,r=.13+.075*Math.cos(a*5);p.push(new T.Vector3(Math.sin(j*Math.PI/4)*.31+Math.cos(a)*r,.94+Math.cos(j*Math.PI/4)*.29+Math.sin(a)*r,.68-Math.abs(Math.sin(j*Math.PI/4))*.07));}paths.push(p);}
 const crest=[];for(let i=0;i<=100;i++){const a=i/100*Math.PI;crest.push(new T.Vector3(Math.cos(a)*.83,.72+Math.sin(a)*.63,.51));}paths.push(crest);
 return paths;
}
