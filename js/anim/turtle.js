// Browser turtle. Samples use world-space distance, including pen-up travel.
export class LightTurtle {
  constructor() { this.points=[]; this.x=0; this.y=0; this.z=0; this.angle=0; this.down=true; this.color=0; this.width=1; this.distance=0; this.break=true; }
  pen(up=false) { if(this.down===up)this.break=true;this.down=!up; return this; }
  ink(color,width=1) { this.color=color; this.width=width; return this; }
  turn(degrees) { this.angle+=degrees*Math.PI/180; return this; }
  move(x,y,z=0) { this.x=x;this.y=y;this.z=z;this.break=true;return this; }
  forward(distance) { return this.line(this.x+Math.cos(this.angle)*distance,this.y+Math.sin(this.angle)*distance,this.z); }
  line(x,y,z=this.z) {
    const a=[this.x,this.y,this.z], length=Math.hypot(x-a[0],y-a[1],z-a[2]), n=Math.max(1,Math.ceil(length/.018));
    if(this.break){this.points.push({x:this.x,y:this.y,z:this.z,d:this.distance,draw:this.down,c:this.color,w:this.width,start:true});this.break=false;}
    for(let i=1;i<=n;i++){const u=i/n;this.distance+=length/n;this.points.push({x:a[0]+(x-a[0])*u,y:a[1]+(y-a[1])*u,z:a[2]+(z-a[2])*u,d:this.distance,draw:this.down,c:this.color,w:this.width,start:false});}
    this.x=x;this.y=y;this.z=z;return this;
  }
  curve(cx,cy,x,y,z=this.z) {
    const a=[this.x,this.y,this.z];
    for(let i=1;i<=40;i++){const u=i/40,v=1-u;this.line(v*v*a[0]+2*v*u*cx+u*u*x,v*v*a[1]+2*v*u*cy+u*u*y,a[2]+(z-a[2])*u);}
    return this;
  }
  path(points,color=0,width=1) {this.ink(color,width).pen(true).move(...points[0]).pen();for(const p of points.slice(1))this.line(...p);return this;}
  ellipse(x,y,rx,ry,z=0,color=0) {const p=[];for(let i=0;i<=80;i++){const a=i/80*Math.PI*2;p.push([x+rx*Math.cos(a),y+ry*Math.sin(a),z]);}return this.path(p,color);}
}
