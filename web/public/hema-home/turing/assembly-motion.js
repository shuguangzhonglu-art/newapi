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

export const clamp = (v,a=0,b=1)=>Math.max(a,Math.min(b,v));
export const smooth = (a,b,v)=>{const t=clamp((v-a)/(b-a));return t*t*(3-2*t)};
export function assemblyState(progress){
 const p=clamp(progress);
 let chapter=0;
 if(p>=.68) chapter=3;
 else if(p>=.4) chapter=2;
 else if(p>=.18) chapter=1;
 return {p,approach:smooth(.10,.35,p),shell:smooth(.32,.55,p),drums:smooth(.45,.83,p),hardware:smooth(.59,.98,p),chapter};
}
export function assemblyView(aspect,progress){
 const s=assemblyState(progress),portrait=aspect<1.05;
 const distance=portrait?Math.max(29,18.5/aspect):22.8;
 const spread=smooth(.42,.98,progress);
 const z=distance-(portrait?1.2:4)*s.approach+(portrait?44:14)*s.shell;
 const pos=new THREE.Vector3(11.2-5.0*s.approach+7*spread,1.25+4.2*s.approach+5*spread,z);
 const target=new THREE.Vector3(.4,portrait?9.7-5.1*s.approach:6.35-2.1*s.approach+1.1*spread,1+1.9*spread);
 const fov=44;
 const camera=new THREE.PerspectiveCamera(fov,aspect,.2,140);camera.position.copy(pos);camera.lookAt(target);camera.updateMatrixWorld();
 const center=new THREE.Vector3(.9,3.7,1).project(camera);
 const desiredX=portrait?.5:.615-.10*s.approach;
 const shift=desiredX-(center.x+1)/2;
 const filmOffset=-shift*2*camera.getFilmWidth()*Math.tan(THREE.MathUtils.degToRad(fov/2))*aspect;
 return {position:pos,target,fov,filmOffset,state:s};
}
