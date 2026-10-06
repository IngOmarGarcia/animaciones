// Original, deliberately simplified coastlines; not a geographic dataset.
// Coordinates are longitude/latitude, sampled on a sphere rather than a flat map.
export const LAND = [
 [[-168,65],[-157,71],[-143,69],[-133,60],[-122,71],[-105,77],[-82,82],[-61,68],[-53,52],[-65,46],[-73,45],[-80,33],[-81,25],[-87,30],[-97,26],[-97,22],[-93,18],[-87,21],[-86,17],[-91,16],[-97,16],[-105,20],[-110,25],[-114,29],[-112,31],[-117,32],[-121,39],[-125,49],[-137,58],[-152,59],[-164,60]],
 [[-115,32],[-111,30],[-110,25],[-109,23],[-112,26],[-114,29]],
 [[-91,17],[-87,17],[-83,15],[-83,11],[-78,9],[-77,8],[-81,8],[-85,11],[-89,14]],
 [[-81,12],[-73,11],[-67,10],[-60,8],[-51,4],[-35,-6],[-40,-21],[-48,-29],[-54,-39],[-65,-55],[-73,-51],[-75,-40],[-71,-29],[-77,-15],[-81,-5]],
 [[-53,59],[-43,60],[-21,71],[-24,80],[-42,83],[-60,77]],
 [[-17,15],[-17,27],[-7,36],[10,37],[32,31],[34,24],[43,12],[51,11],[42,-2],[35,-18],[28,-34],[18,-35],[11,-23],[8,-5],[-1,5],[-12,7]],
 [[-10,36],[-9,43],[-1,49],[5,53],[10,55],[7,62],[17,71],[29,70],[31,60],[44,56],[41,42],[28,40],[23,38],[20,40],[15,37],[8,44],[2,42]],
 [[30,60],[43,70],[70,74],[100,77],[140,72],[177,65],[169,55],[145,48],[140,36],[124,39],[121,22],[108,20],[104,9],[100,5],[96,20],[86,22],[78,8],[71,22],[62,25],[55,17],[45,12],[40,29],[34,34],[44,43]],
 [[113,-22],[123,-15],[134,-12],[143,-15],[153,-26],[150,-38],[135,-35],[123,-34],[114,-29]],
 [[47,-13],[50,-16],[48,-25],[44,-25],[43,-19]],
 [[-8,50],[-5,50],[0,54],[-3,59],[-6,58]],
 [[130,31],[135,33],[142,42],[145,44],[141,36]],
 [[-85,23],[-75,21],[-74,20],[-81,21]],
];
const radians=Math.PI/180;
const inside=(x,y,poly)=>{let result=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])result=!result;}return result;};
const sphere=(lon,lat,r=1)=>{const a=(lon+100)*radians,b=lat*radians;return [Math.sin(a)*Math.cos(b)*r,Math.sin(b)*r,Math.cos(a)*Math.cos(b)*r];};
const random=i=>{const n=Math.sin(i*127.1+311.7)*43758.5453;return n-Math.floor(n);};
export function buildLogoWorld(low=false){
 const points=[],nodes=[],lines=[];const add=(p,kind,i,size=1)=>points.push(...p,kind,random(i),size);
 const count=low?1100:2300;
 for(let i=0;i<count;i++){
  const lat=Math.asin(1-2*(i+.5)/count)/radians,lon=((i*137.507764)%360)-180;
  const land=LAND.some(poly=>inside(lon,lat,poly)),p=sphere(lon,lat,land?1.008:1);
  add(p,land?1:0,i,land?.7+random(i+7)*.45:.48);if(land)nodes.push(p);
 }
 // Extra surface samples around the opening camera: continental detail rather
 // than a handful of oversized dots when looking close to Mexico.
 const spacing=low?2.3:1.55;
 for(let lat=5;lat<37;lat+=spacing)for(let lon=-123;lon<-75;lon+=spacing){
  const index=Math.round((lat-5)*90+(lon+123)*7),x=lon+(random(index+73)-.5)*spacing*.4,y=lat+(random(index+19)-.5)*spacing*.4;
  if(LAND.some(poly=>inside(x,y,poly))){const p=sphere(x,y,1.01);add(p,1,index+18000,.35+random(index+30)*.22);nodes.push(p);}
 }
 for(const [index,poly] of LAND.entries())for(let j=0;j<poly.length;j++){
  const a=poly[j],b=poly[(j+1)%poly.length],steps=Math.max(1,Math.ceil(Math.hypot(a[0]-b[0],a[1]-b[1])/(low?2.4:1.65)));
  for(let k=0;k<steps;k++){const p=sphere(a[0]+(b[0]-a[0])*k/steps,a[1]+(b[1]-a[1])*k/steps,1.012);add(p,2,7000+index*100+j*10+k,.75);}
 }
 // Local neighbors construct a technological network on the land itself.
 for(let i=0;i<nodes.length;i+=low?4:2){const a=nodes[i];let best=-1,distance=.052;
  for(let j=i+1;j<nodes.length;j++){const b=nodes[j],d=(a[0]-b[0])**2+(a[1]-b[1])**2+(a[2]-b[2])**2;if(d<distance){distance=d;best=j;}}
  if(best>=0){for(const p of [a,nodes[best]])lines.push(...p,1,random(i),.6);}
 }
 const orbitStart=points.length/6;
 for(let plane=0;plane<3;plane++){
  const tilt=[-.38,.72,1.1][plane],n=low?65:125;
  for(let i=0;i<n;i++){const a=i/n*Math.PI*2,rr=1.43+plane*.065+.028*Math.sin(a*3+plane);const x=Math.cos(a)*rr,y=Math.sin(a)*rr;
   add([x,y*Math.sin(tilt),y*Math.cos(tilt)],3,10000+plane*500+i,.5+random(i+plane*900)*.7);
  }
 }
 return {points:new Float32Array(points),lines:new Float32Array(lines),surfaceCount:orbitStart,count:points.length/6,connections:lines.length/12,low};
}
