/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import * as THREE from './vendor/three.module.js';
/** CPU triangle renderer for WebGL-disabled browsers. Uses the SAME live mesh
 * geometry, matrices and perspective camera. No reference images or sprites. */
export class Software3DRenderer {
 constructor(canvas){this.domElement=canvas;this.ctx=canvas.getContext('2d',{alpha:false});if(!this.ctx)throw new Error('Canvas unavailable');this.cache=new WeakMap();this.width=1;this.height=1;this.isSoftware=true;this.info={render:{triangles:0}};this.maps=new WeakMap();this.mvp=new THREE.Matrix4();this.vp=new THREE.Matrix4();this.world=new THREE.Matrix4();this.instance=new THREE.Matrix4();}
 setSize(w,h){this.width=w;this.height=h;this.domElement.width=Math.round(w);this.domElement.height=Math.round(h);this.width=this.domElement.width;this.height=this.domElement.height;this.image=this.ctx.createImageData(this.width,this.height);this.pixels=new Uint32Array(this.image.data.buffer);this.depth=new Float32Array(this.width*this.height);}
 geometry(g){if(this.cache.has(g))return this.cache.get(g);const p=g.attributes.position,n=g.attributes.normal,uv=g.attributes.uv,idx=g.index?.array;const count=idx?idx.length:p.count,out=[];for(let i=0;i<count;i+=3){const a=idx?idx[i]:i,b=idx?idx[i+1]:i+1,c=idx?idx[i+2]:i+2;const ax=p.getX(a),ay=p.getY(a),az=p.getZ(a),bx=p.getX(b),by=p.getY(b),bz=p.getZ(b),cx=p.getX(c),cy=p.getY(c),cz=p.getZ(c);let nx,ny,nz;if(n){nx=(n.getX(a)+n.getX(b)+n.getX(c))/3;ny=(n.getY(a)+n.getY(b)+n.getY(c))/3;nz=(n.getZ(a)+n.getZ(b)+n.getZ(c))/3;}else{nx=(by-ay)*(cz-az)-(bz-az)*(cy-ay);ny=(bz-az)*(cx-ax)-(bx-ax)*(cz-az);nz=(bx-ax)*(cy-ay)-(by-ay)*(cx-ax)}const len=Math.hypot(nx,ny,nz)||1;out.push([ax,ay,az,bx,by,bz,cx,cy,cz,nx/len,ny/len,nz/len,uv?uv.getX(a):0,uv?uv.getY(a):0,uv?uv.getX(b):0,uv?uv.getY(b):0,uv?uv.getX(c):0,uv?uv.getY(c):0]);}this.cache.set(g,out);return out;}
 render(scene,camera){
 const ctx=this.ctx,w=this.width,h=this.height,faces=[];this.pixels.fill(0xff141c10);this.depth.fill(Infinity);scene.updateMatrixWorld();camera.updateMatrixWorld();this.vp.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);
 const shade=(v)=>Math.round(255*Math.pow(Math.min(1,Math.max(0,v)),.4545));
 const add=(object,matrix)=>{
 const material=Array.isArray(object.material)?object.material[0]:object.material;if(!material||material.visible===false||material.opacity===0)return;
 this.mvp.multiplyMatrices(this.vp,matrix);const e=this.mvp.elements,me=matrix.elements,tri=this.geometry(object.geometry),base=material.color||new THREE.Color(1,1,1),em=material.emissive;const opacity=material.opacity??1,unlit=material.isMeshBasicMaterial;let texture=null;if(material.map?.image?.getContext){if(!this.maps.has(material.map)){const source=material.map.image;this.maps.set(material.map,{pixels:source.getContext('2d').getImageData(0,0,source.width,source.height).data,w:source.width,h:source.height,rx:material.map.repeat.x,ry:material.map.repeat.y});}texture=this.maps.get(material.map);}
 for(let j=0;j<tri.length;j++){
 const t=tri[j],points=[],zs=[],depths=[],invs=[];let skip=false;
 for(let k=0;k<9;k+=3){const x=t[k],y=t[k+1],z=t[k+2],cw=e[3]*x+e[7]*y+e[11]*z+e[15];if(cw<.25){skip=true;break}const px=(e[0]*x+e[4]*y+e[8]*z+e[12])/cw,py=(e[1]*x+e[5]*y+e[9]*z+e[13])/cw;points.push((px+1)*w*.5,(1-py)*h*.5);zs.push(cw);depths.push((e[2]*x+e[6]*y+e[10]*z+e[14])/cw);invs.push(1/cw);}
 if(skip)continue;const [ax,ay,bx,by,cx,cy]=points;
 if(Math.max(ax,bx,cx)<0||Math.min(ax,bx,cx)>w||Math.max(ay,by,cy)<0||Math.min(ay,by,cy)>h)continue;
 const area=(bx-ax)*(cy-ay)-(by-ay)*(cx-ax);if(material.side!==THREE.DoubleSide&&area>=0)continue;if(Math.abs(area)<.13)continue;
 let nx=me[0]*t[9]+me[4]*t[10]+me[8]*t[11],ny=me[1]*t[9]+me[5]*t[10]+me[9]*t[11],nz=me[2]*t[9]+me[6]*t[10]+me[10]*t[11];const nl=Math.hypot(nx,ny,nz)||1;nx/=nl;ny/=nl;nz/=nl;
 const illumination=unlit?1:.29+.73*Math.max(0,nx*-.35+ny*.77+nz*.53)+.26*Math.max(0,nx*.7+ny*.25-nz*.65);
 const spec=unlit?0:Math.pow(Math.max(0,nx*-.12+ny*.64+nz*.76),18)*(material.metalness||0)*.34;
 const emi=material.emissiveIntensity||0,z=(zs[0]+zs[1]+zs[2])/3,fog=Math.min(.42,z*.003);
 const r=shade((base.r*illumination+spec+(em?.r||0)*emi)*(1-fog)+.006*fog),g=shade((base.g*illumination+spec+(em?.g||0)*emi)*(1-fog)+.012*fog),b=shade((base.b*illumination+spec*.8+(em?.b||0)*emi)*(1-fog)+.008*fog);
 faces.push({p:points,z,d:depths,i:invs,c:[r,g,b],a:opacity,uv:t.slice(12),texture});
 }
 };
 scene.traverseVisible(o=>{if(!o.isMesh||o.userData.skipSoftware)return;if(o.isInstancedMesh){for(let i=0;i<o.count;i++){o.getMatrixAt(i,this.instance);this.world.multiplyMatrices(o.matrixWorld,this.instance);add(o,this.world)}}else add(o,o.matrixWorld)});
 const opaque=faces.filter(f=>f.a>=.99),transparent=faces.filter(f=>f.a<.99).sort((a,b)=>b.z-a.z);
 const pixels=this.pixels,depth=this.depth;
 const raster=(f)=>{
  const [ax,ay,bx,by,cx,cy]=f.p;
  const minX=Math.max(0,Math.floor(Math.min(ax,bx,cx))),maxX=Math.min(w-1,Math.ceil(Math.max(ax,bx,cx))),minY=Math.max(0,Math.floor(Math.min(ay,by,cy))),maxY=Math.min(h-1,Math.ceil(Math.max(ay,by,cy)));
  const denom=(by-cy)*(ax-cx)+(cx-bx)*(ay-cy);if(Math.abs(denom)<.001)return;const ia=1/denom;
  const aDx=(by-cy)*ia,bDx=(cy-ay)*ia;
  const col=f.c,tex=f.texture,alpha=f.a;
  for(let y=minY;y<=maxY;y++){
   let wa=((by-cy)*(minX+.5-cx)+(cx-bx)*(y+.5-cy))*ia,wb=((cy-ay)*(minX+.5-cx)+(ax-cx)*(y+.5-cy))*ia;
   for(let x=minX;x<=maxX;x++,wa+=aDx,wb+=bDx){const wc=1-wa-wb;if(wa<-.00001||wb<-.00001||wc<-.00001)continue;const z=wa*f.d[0]+wb*f.d[1]+wc*f.d[2],index=y*w+x;if(z>=depth[index])continue;
    let r=col[0],g=col[1],b=col[2];
    if(tex){const denomUV=wa*f.i[0]+wb*f.i[1]+wc*f.i[2];let u=(wa*f.uv[0]*f.i[0]+wb*f.uv[2]*f.i[1]+wc*f.uv[4]*f.i[2])/denomUV*tex.rx,v=(wa*f.uv[1]*f.i[0]+wb*f.uv[3]*f.i[1]+wc*f.uv[5]*f.i[2])/denomUV*tex.ry;u=((u%1)+1)%1;v=((v%1)+1)%1;const ti=(Math.min(tex.h-1,Math.floor((1-v)*tex.h))*tex.w+Math.floor(u*tex.w))*4;r=r*tex.pixels[ti]/255;g=g*tex.pixels[ti+1]/255;b=b*tex.pixels[ti+2]/255;}
    if(alpha<.99){const old=pixels[index],inv=1-alpha;r=r*alpha+(old&255)*inv;g=g*alpha+((old>>8)&255)*inv;b=b*alpha+((old>>16)&255)*inv;}else depth[index]=z;
    pixels[index]=0xff000000|((b|0)<<16)|((g|0)<<8)|(r|0);
   }
  }
 };
 opaque.forEach(raster);transparent.forEach(raster);ctx.putImageData(this.image,0,0);this.info.render.triangles=faces.length;
 }
 dispose(){this.cache=new WeakMap();this.maps=new WeakMap();this.image=null;this.pixels=null;this.depth=null;}
}
