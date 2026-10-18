// The exact additive-point / trails / bloom renderer used by Corazón de energía.
import { getParticleRenderer, drawParticles2D, viewProjection, PARTICLE_TAN } from './util.js';

export function createEmotionalEnergyRenderer(ctx,w,h,dpr,capacity,{preview=false,fallback=false}={}){
  const renderer=fallback?null:getParticleRenderer();
  const pos=new Float32Array(capacity*4),col=new Float32Array(capacity*4),vp=new Float32Array(16);
  const distance=4,unit=2*PARTICLE_TAN*distance/h;
  let count=0,lastTime=-1;
  return {
    webgl:!!renderer,
    begin(){count=0;},
    point(x,y,z,intensity,color,size){
      if(count>=capacity||intensity<=.001)return;
      const q=count++*4;
      pos[q]=(x-w*.5)*unit;pos[q+1]=(h*.5-y)*unit;pos[q+2]=z*unit;pos[q+3]=intensity;
      col[q]=color[0];col[q+1]=color[1];col[q+2]=color[2];col[q+3]=size*unit;
    },
    draw({time,glow,formation,resolution,shock,palette,quality,calm=false,portalV=.23,portal=true}){
      const yaw=calm||preview?0:Math.sin(time*.16)*.065*resolution;
      const eye=[Math.sin(yaw)*distance,.15*resolution,Math.cos(yaw)*distance];
      viewProjection(vp,eye,[0,0,0],w/h);
      ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
      if(renderer&&!renderer.gl.isContextLost()){
        const scale=Math.min(dpr,preview?1:1.5)*(quality<.65?.7:.9);
        renderer.render({
          width:Math.max(2,Math.round(w*scale)),height:Math.max(2,Math.round(h*scale)),
          vp,pos,col,count,px:h*scale/(2*PARTICLE_TAN),focus:distance,
          aperture:calm||preview?0:.018+resolution*.025,maxSize:32*scale,
          trail:calm||preview?0:shock>.02?.56:resolution>.2?.22:formation<.8?.3:.05,
          flash:calm||preview?0:shock*.035*glow,
          glow:[.5,.53,(.06+resolution*.2)*glow],
          beam:[.5,portalV,(preview||calm||!portal?0:.06+resolution*.26)*glow],
          bg:[.001,.002,.006],glowColor:palette[0].map(c=>c*.035),
          beamColor:palette[1].map(c=>c*.13),flashColor:palette[2].map(c=>c*.5),
          exposure:1.3, time,reset:lastTime<0||time<lastTime||calm||preview,owner:pos,
        });
        ctx.drawImage(renderer.canvas,0,0,w,h);
      }else drawParticles2D(ctx,w,h,vp,pos,col,count,distance,.025,'#010207');
      lastTime=time;
      return count;
    },
  };
}
