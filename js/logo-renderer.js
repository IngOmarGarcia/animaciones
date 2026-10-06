import {buildLogoWorld} from './logo-world.js';
const vertex=`
attribute vec3 position;attribute float kind;attribute float seed;attribute float size;
uniform float camera;uniform float pitch;uniform float yaw;uniform float orbit;uniform float clock;uniform float reveal;uniform float aspect;uniform float pixels;uniform float quality;
varying vec4 color;
void main(){
 vec3 p=position;float angle=kind>2.5?orbit:yaw;
 if(kind>2.5)p*=1.0+.004*sin(clock*.7+seed*6.28);
 else p*=1.0+.0012*sin(clock*.6+seed*12.0);
 p=vec3(p.x*cos(angle)+p.z*sin(angle),p.y,-p.x*sin(angle)+p.z*cos(angle));
 p=vec3(p.x,p.y*cos(pitch)-p.z*sin(pitch),p.y*sin(pitch)+p.z*cos(pitch));
 float depth=max(.025,camera-p.z),alpha=1.0;
 if(kind<2.5&&p.z*camera<.995)alpha=0.0;
 if(kind>2.5){vec3 ray=normalize(p-vec3(0.,0.,camera));float b=camera*ray.z,disc=b*b-camera*camera+1.;if(disc>0.&&-b-sqrt(disc)<length(p-vec3(0.,0.,camera))-.018)alpha=0.;alpha*=smoothstep(0.,1.,reveal);}
 float light=.42+.58*max(0.,dot(normalize(p),normalize(vec3(-.4,.65,1.))));
 vec3 tint=kind<.5?vec3(.06,.29,.55):kind<2.5?mix(vec3(.09,.53,.95),vec3(.43,.91,1.),seed):mix(vec3(.1,.58,1.),vec3(.66,.24,.85),seed*.52);
 alpha*=kind<.5?.2:kind<1.5?.78:kind<2.5?.93:.67;
 if(kind<.5&&seed>quality)alpha=0.;
 color=vec4(tint*light,alpha);
 gl_Position=vec4(p.x*2.8/aspect,p.y*2.8,0.,depth);
 gl_PointSize=clamp(size*pixels*2.8/depth, .7,7.*pixels);
}`;
const pointFragment=`precision mediump float;varying vec4 color;void main(){float r=length(gl_PointCoord-.5);float alpha=smoothstep(.5,.18,r);gl_FragColor=vec4(color.rgb,color.a*alpha);}`;
const lineFragment=`precision mediump float;varying vec4 color;void main(){gl_FragColor=vec4(color.rgb,color.a*.2);}`;
const sphereVertex=`attribute vec2 position;varying vec2 screen;void main(){screen=position;gl_Position=vec4(position,0.,1.);}`;
const sphereFragment=`precision mediump float;varying vec2 screen;uniform float camera;uniform float aspect;
void main(){vec3 ray=normalize(vec3(screen.x*aspect/2.8,screen.y/2.8,-1.));float b=camera*ray.z,disc=b*b-camera*camera+1.;if(disc<0.)discard;vec3 p=vec3(0.,0.,camera)+ray*(-b-sqrt(disc));float light=max(0.,dot(p,normalize(vec3(-.4,.65,1.))));float rim=pow(1.-max(0.,dot(p,-ray)),3.);vec3 tint=vec3(.003,.012,.033)+vec3(.002,.024,.051)*light+vec3(.012,.09,.15)*rim;gl_FragColor=vec4(tint,1.);}`;
export function createLogoRenderer(canvas,{low=false}={}){
 const gl=canvas.getContext('webgl',{alpha:true,antialias:false,depth:false,stencil:false,preserveDrawingBuffer:false,powerPreference:'low-power'});
 if(!gl)throw Error('WebGL no disponible');
 const buffers=[],programs=[],shaders=[];
 const shader=(type,source)=>{const s=gl.createShader(type);shaders.push(s);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error('Shader del logo: '+gl.getShaderInfoLog(s));return s;};
 const program=(v,f)=>{const p=gl.createProgram();programs.push(p);gl.attachShader(p,shader(gl.VERTEX_SHADER,v));gl.attachShader(p,shader(gl.FRAGMENT_SHADER,f));gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error('Programa del logo no disponible');return p;};
 const buffer=data=>{const b=gl.createBuffer();buffers.push(b);gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);return b;};
 const dispose=()=>{for(const b of buffers)gl.deleteBuffer(b);for(const p of programs)gl.deleteProgram(p);for(const s of shaders)gl.deleteShader(s);};
 try{
  const world=buildLogoWorld(low),points=buffer(world.points),lines=buffer(world.lines),quad=buffer(new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]));
  const prepare=(p,names)=>({p,locations:Object.fromEntries(names.map(n=>[n,gl.getUniformLocation(p,n)])),attributes:Object.fromEntries(['position','kind','seed','size'].map(n=>[n,gl.getAttribLocation(p,n)]))});
  const attrs=['camera','pitch','yaw','orbit','clock','reveal','aspect','pixels','quality'];
  const dot=prepare(program(vertex,pointFragment),attrs),net=prepare(program(vertex,lineFragment),attrs),body=prepare(program(sphereVertex,sphereFragment),['camera','aspect']);
  let width=0,height=0,ratio=low?1:Math.min(devicePixelRatio||1,1.5),quality=low?.45:1;
  const bind=(config,b)=>{gl.useProgram(config.p);gl.bindBuffer(gl.ARRAY_BUFFER,b);for(const [name,count,offset] of [['position',3,0],['kind',1,12],['seed',1,16],['size',1,20]]){const a=config.attributes[name];if(a>=0){gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,count,gl.FLOAT,false,24,offset);}}};
  return {
   stats:{particles:world.count,connections:world.connections,drawCalls:3,low},
   resize(w,h){width=w;height=h;ratio=this.stats.low?1:Math.min(devicePixelRatio||1,1.5);canvas.width=Math.max(1,Math.round(w*ratio));canvas.height=Math.max(1,Math.round(h*ratio));gl.viewport(0,0,canvas.width,canvas.height);},
   lowerQuality(){quality=.4;this.stats.low=true;this.resize(width,height);},
   draw(state){
    if(gl.isContextLost())throw Error('Contexto del logo perdido');
    const uniforms={...state,aspect:width/height,pixels:ratio*height/48,quality};gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.disable(gl.BLEND);
    gl.useProgram(body.p);gl.bindBuffer(gl.ARRAY_BUFFER,quad);const pos=body.attributes.position;gl.enableVertexAttribArray(pos);gl.vertexAttribPointer(pos,2,gl.FLOAT,false,0,0);for(const n of ['camera','aspect'])gl.uniform1f(body.locations[n],uniforms[n]);gl.drawArrays(gl.TRIANGLES,0,6);
    gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
    for(const [config,b,type,count] of [[net,lines,gl.LINES,world.lines.length/6],[dot,points,gl.POINTS,world.count]]){bind(config,b);for(const n of attrs)if(config.locations[n]!==null)gl.uniform1f(config.locations[n],uniforms[n]);gl.drawArrays(type,0,count);}
   },
   destroy(){dispose();gl.getExtension('WEBGL_lose_context')?.loseContext();},
  };
 }catch(error){dispose();gl.getExtension('WEBGL_lose_context')?.loseContext();throw error;}
}
