// Original, bounded, approximate gravitational ray integration. The accretion
// flow is a spatial density field, not a glowing circle or a billboard texture.
export const horizonFragment=`
 precision highp float;
 varying vec2 vUv;
 uniform vec3 uOrigin,uRight,uUp,uBack,uDiskTint,uHotTint,uStarTint;
 uniform float uTime,uAspect,uFov,uMass,uDisk,uPulse,uSteps;
 float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);}
 float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
 vec3 starLayer(vec3 rd,vec3 ro,float depth,float grid){
  vec2 plane=rd.xy/(abs(rd.z)+.22)*grid+ro.xy/depth*grid;
  vec2 cell=floor(plane),f=fract(plane),center=vec2(hash(cell+3.1),hash(cell+8.4))*.70+.15;
  float seed=hash(cell+depth),enabled=step(.990,seed);
  vec2 delta=f-center,aa=max(fwidth(plane)*.65,vec2(.012));
  float star=exp(-dot(delta/aa,delta/aa)*2.)*enabled;
  return mix(vec3(.36,.47,.68),vec3(.94,.83,.66),hash(cell+11.))*star*(.35+hash(cell+14.)*.65);
 }
 vec3 background(vec3 rd,vec3 ro){
  vec3 stars=starLayer(rd,ro,45.,28.)+starLayer(rd,ro,95.,72.)*.7+starLayer(rd,ro,170.,165.)*.48;
  float mist=noise(rd.xy*6.+ro.xy*.005)*noise(rd.xy*14.);
  return stars*uStarTint+vec3(.0018,.0023,.0045)*mist;
 }
 vec3 temperature(float r,float doppler){
  float hot=1.-smoothstep(1.65,3.65,r);
  vec3 c=mix(vec3(1.7,.30,.035),vec3(2.4,1.35,.60),hot);
  c=mix(c,vec3(2.2,2.3,2.55),pow(hot,3.)*.65);
  return mix(c,c*vec3(.56,.77,1.25),smoothstep(.38,.85,doppler)*hot*.7)*mix(uDiskTint,uHotTint,hot);
 }
 void main(){
  vec2 screen=vUv*2.-1.;vec3 ray=normalize(-uBack+uRight*screen.x*uAspect*uFov+uUp*screen.y*uFov);
  vec3 p=uOrigin,dir=ray,color=vec3(0.);float transmission=1.,minimum=100.;bool captured=false;
  float closest=length(cross(uOrigin,ray));
  if(uMass<.01||closest>6.2){color=background(ray,uOrigin);}else{
   for(int i=0;i<112;i++){
    if(float(i)>=uSteps)break;
    float radius=length(p);minimum=min(minimum,radius);
    if(radius<max(.05,uMass)){captured=true;break;}
    float ds=clamp((radius-uMass)*.20,.035,mix(1.0,.78,step(80.,uSteps)));
    // Resolve the thin flow near the disk plane instead of stepping through it.
    if(radius<5.)ds=min(ds,max(.035,abs(p.y)/max(abs(dir.y),.08)*.45));
    dir=normalize(dir-p*(1.13*uMass/max(radius*radius*radius,.12))*ds);
    p+=dir*ds;
    float r=length(p.xz);
    if(r>1.62&&r<3.95){
     float angle=atan(p.z,p.x),warp=.018*sin(angle*3.+r*2.-uTime*.18),height=.055+.016*r;
     if(abs(p.y-warp)<height*4.){
     float orbit=angle-uTime*.55/pow(r,1.5);
     float turbulence=noise(vec2(orbit*5.,r*15.-uTime*.12))*.65+noise(vec2(orbit*13.,r*32.+uTime*.15))*.35;
     float threads=.20+.80*pow(.5+.5*sin(r*74.+turbulence*9.+sin(orbit*12.)*1.8),2.);
     float boundary=smoothstep(1.62,1.85,r)*(1.-smoothstep(3.2,3.95,r));
     float density=exp(-pow((p.y-warp)/height,2.))*boundary*(.5+turbulence*.9)*threads*uDisk;
     vec3 velocity=normalize(vec3(-p.z,0.,p.x));float doppler=dot(velocity,-dir);
     float boost=clamp(1.+doppler*.66,.36,1.75);
     float pulse=exp(-pow((r-(3.75-uPulse*2.1))/.13,2.))*sin(uPulse*3.14159)*.45;
     float emission=density*ds*2.4*(1.+pulse)*boost;
     color+=transmission*temperature(r,doppler)*emission;
     transmission*=exp(-density*ds*2.8);
     }
    }
    if(length(p)>length(uOrigin)+8.||transmission<.008)break;
   }
   if(!captured)color+=transmission*background(dir,uOrigin);
   // A narrow, restrained photon glow follows escaping rays, not screen radius.
   if(!captured)color+=vec3(.5,.34,.15)*exp(-pow((minimum-uMass*1.18)*16.,2.))*uDisk*.12;
  }
  gl_FragColor=vec4(color,1.);
 }
`;
