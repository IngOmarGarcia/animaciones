import * as T from '../vendor/three/three.module.min.js';

export const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*x*(x*(x*6-15)+10);};
export const seed=n=>{const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x);};

// Nested asymmetric cupped surfaces, not ellipses or planes. The two skins and
// sewn rim give each petal a closed, thin solid; morphs retain its curved volume.
function surface(u,v,p,closed){
 const shoulder=Math.pow(Math.sin(v*Math.PI*.5),.72);
 const opening=closed?.18:1;
 const angle=p.angle+u*p.arc*shoulder+.12*Math.sin(v*2.8+p.phase)*v;
 const fold=Math.pow(Math.max(0,(v-.78)/.22),2);
 const ripple=Math.sin(u*11+p.phase)*.014*v*v+Math.sin(u*5.5+v*9+p.phase)*.018*v;
 const radius=p.base+p.reach*opening*Math.pow(v,.86)*(1-.24*u*u*v)+.045*u*u*Math.sin(v*Math.PI)-fold*.065*opening;
 const y=p.y+p.height*Math.sin(v*1.62)-p.droop*opening*Math.pow(v,3.5)-.28*u*u*Math.pow(v,1.5)+fold*.055+ripple*.4;
 return new T.Vector3(Math.sin(angle)*radius,y,Math.cos(angle)*radius);
}
export function petalGeometry(p){
 const nu=32,nv=24,front=[],closed=[],uv=[],index=[];
 for(let j=0;j<=nv;j++)for(let i=0;i<=nu;i++){
  const u=i/nu*2-1,v=j/nv;
  front.push(...surface(u,v,p,false));closed.push(...surface(u,v,p,true));uv.push(i/nu,v);
 }
 for(let j=0;j<nv;j++)for(let i=0;i<nu;i++){const a=j*(nu+1)+i,b=a+nu+1;index.push(a,b,a+1,b,b+1,a+1);}
 const make=positions=>{const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setIndex(index);g.computeVertexNormals();return g;};
 const a=make(front),b=make(closed),count=front.length/3;
 function thicken(g){
  const pos=Array.from(g.attributes.position.array),norm=g.attributes.normal.array;
  for(let i=0;i<count;i++)for(let c=0;c<3;c++)pos.push(pos[i*3+c]-norm[i*3+c]*.018);
  return pos;
 }
 const indices=[...index,...index.map((n,i)=>index[i-i%3+(2-i%3)]+count)];
 const edge=[];for(let i=0;i<=nu;i++)edge.push(i);for(let j=1;j<=nv;j++)edge.push(j*(nu+1)+nu);for(let i=nu-1;i>=0;i--)edge.push(nv*(nu+1)+i);for(let j=nv-1;j>0;j--)edge.push(j*(nu+1));
 for(let i=0;i<edge.length;i++){const x=edge[i],y=edge[(i+1)%edge.length];indices.push(x,y,x+count,y,y+count,x+count);}
 const open=new T.BufferGeometry(),shut=new T.BufferGeometry();
 for(const [g,src] of [[open,a],[shut,b]]){g.setAttribute('position',new T.Float32BufferAttribute(thicken(src),3));g.setAttribute('uv',new T.Float32BufferAttribute([...uv,...uv],2));g.setIndex(indices);g.computeVertexNormals();}
 open.morphAttributes.position=[shut.attributes.position];open.morphAttributes.normal=[shut.attributes.normal];
 a.dispose();b.dispose();return open;
}
export function rosePetals(){
 const layers=[{n:8,reach:1.23,height:.92,droop:.56,base:.11,y:0,arc:.61},{n:7,reach:.99,height:1.12,droop:.35,base:.09,y:.045,arc:.65},{n:6,reach:.69,height:1.25,droop:.23,base:.07,y:.10,arc:.74},{n:5,reach:.40,height:1.30,droop:.11,base:.035,y:.12,arc:.92},{n:3,reach:.20,height:1.28,droop:.07,base:.025,y:.15,arc:1.16}];
 return layers.flatMap((layer,ring)=>Array.from({length:layer.n},(_,i)=>{
  const id=ring*11+i,angle=i/layer.n*Math.PI*2+ring*2.39996+.13*seed(id+1);
  return {...layer,angle,ring,id,phase:id*1.77,height:layer.height*(.94+seed(id+5)*.12),reach:layer.reach*(.94+seed(id+9)*.12)};
 }));
}
export function leafGeometry(side=1){
 const pos=[],uv=[],idx=[],nx=20,ny=28;
 for(let j=0;j<=ny;j++)for(let i=0;i<=nx;i++){
  const v=j/ny,u=i/nx*2-1,width=Math.pow(Math.sin(v*Math.PI),.85)*.33*(1+.025*Math.sin(v*170));
  pos.push(side*(v*.95+u*width*.28),v*.55-.24*u*u*Math.sin(v*Math.PI),u*width+.13*Math.sin(v*3.14));uv.push(i/nx,v);
 }
 for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){const a=j*(nx+1)+i,b=a+nx+1;idx.push(a,b,a+1,b,b+1,a+1);}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return g;
}
