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
import {createTuringFigure} from './turing-figure.js';

/** Everything visible is modeled geometry. Each recorded part has a reversible
 * assembly transform; even the fasteners and cable looms separate independently. */
export function buildAssembly(scene,{low=false}={}){
 const root=new THREE.Group();root.position.x=-.55;scene.add(root);
 const parts=[],pickables=[],disposables=new Set(),rotors=[],lights=[];
 const M=(color,metalness=.5,roughness=.48,extra={})=>{const m=new THREE.MeshStandardMaterial({color,metalness,roughness,...extra});disposables.add(m);return m};
 const green=M(0x27382b,.72,.43),edge=M(0x526049,.75,.35),dark=M(0x101a16,.55,.6),brass=M(0xb59a5e,.82,.29),gold=M(0x817046,.8,.4),copper=M(0x875846,.78,.38),silver=M(0xb2b5a3,.8,.31),steel=M(0x485148,.7,.42),black=M(0x10140e,.25,.73),wire=M(0x66362c,.18,.62),ivory=M(0xc9c7a8,.05,.9);
 const geometry=new Map();
 const geo=(key,fn)=>{if(!geometry.has(key)){const g=fn();geometry.set(key,g);disposables.add(g)}return geometry.get(key)};
 const B=(w,h,d)=>geo(`b${w},${h},${d}`,()=>new THREE.BoxGeometry(w,h,d));
 const C=(r,h,n=low?12:32)=>geo(`c${r},${h},${n}`,()=>new THREE.CylinderGeometry(r,r,h,n));
 const T=(r,t,n=low?12:36)=>geo(`t${r},${t},${n}`,()=>new THREE.TorusGeometry(r,t,low?4:8,n));
 function mesh(g,m,p=[0,0,0],parent=root){const o=new THREE.Mesh(g,m);o.position.set(...p);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o}
 function part(o,{name='钢制连接件',kind='hardware',delta,turn=[0,0,0],spin=0,rotor=null}={}){
 const pos=o.position.clone();const direction=delta||[pos.x*.42,pos.y>3.5?1.8:-.4,2.3];
 const entry={o,base:pos,quaternion:o.quaternion.clone(),delta:new THREE.Vector3(...direction),turn:new THREE.Euler(...turn),kind,spin,rotor};parts.push(entry);o.userData.part=entry;o.userData.name=name;o.userData.kind=kind;pickables.push(o);return o;
 }
 function box(w,h,d,m,p,opts){return part(mesh(B(w,h,d),m,p),opts)}
 function cyl(r,h,m,p,opts){const o=mesh(C(r,h),m,p);o.rotation.x=Math.PI/2;return part(o,opts)}
 function ring(r,t,m,p,opts){return part(mesh(T(r,t),m,p),opts)}
 function cable(points,r,index,opts={}){const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));const g=new THREE.TubeGeometry(curve,low?22:60,r,low?4:7,false);disposables.add(g);const o=mesh(g,index%4===0?black:wire);return part(o,{name:'织物绝缘铜线束',kind:'shell',delta:[(index-5)*.4,3.8+index*.16,-2.3],turn:[.06,0,(index-5)*.025],...opts});}
 function tex(w,h,draw){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;disposables.add(t);return t;}
 const paint=tex(256,256,(ctx,w,h)=>{ctx.fillStyle='#c0c3af';ctx.fillRect(0,0,w,h);let seed=29;for(let i=0;i<9000;i++){seed=seed*16807%2147483647;const x=seed%w;seed=seed*16807%2147483647;ctx.fillStyle=i%3?'#acb39f20':'#f5f5da28';ctx.fillRect(x,seed%h,1,1)}});paint.wrapS=paint.wrapT=THREE.RepeatWrapping;paint.repeat.set(3,3);green.map=paint;green.bumpMap=paint;green.bumpScale=.018;
 // Six independent shell panels around an actual open frame.
 box(7.9,.13,1.85,green,[0,7.05,0],{name:'机柜顶盖',kind:'shell',delta:[0,5.3,-1.6],turn:[-.08,0,.03]});
 box(7.9,.13,1.85,green,[0,.23,0],{name:'机柜底板',kind:'shell',delta:[0,1,1.3]});
 box(.12,6.8,1.85,green,[-3.92,3.65,0],{name:'左侧检修盖',kind:'shell',delta:[-6,1.7,-.2],turn:[0,-.4,0]});
 box(.12,6.8,1.85,green,[3.92,3.65,0],{name:'右侧检修盖',kind:'shell',delta:[6,1.7,-.6],turn:[0,.4,0]});
 box(7.7,6.6,.10,dark,[0,3.6,-.86],{name:'背部接线底板',kind:'shell',delta:[0,2,-5],turn:[.1,0,0]});
 // Four load-bearing verticals and transverse rails.
 for(const x of [-3.86,3.86])for(const z of [-.83,.87])box(.14,6.9,.14,edge,[x,3.65,z],{name:'铆接钢框立柱',delta:[Math.sign(x)*4.3,1.3,z>0?2.4:-3.5],turn:[0,0,Math.sign(x)*-.1]});
 for(const y of [.27,1.45,3.22,5.12,7.03])for(const z of [-.82,.88])box(7.8,.1,.12,edge,[0,y,z],{name:'钢制承重横梁',delta:[0,(y-3.5)*.9+1.5,z>0?3.2:-3.4]});
 for(let bank=0;bank<3;bank++)box(7.56,1.67,.09,green,[0,5.86-bank*1.82,.88],{name:`${String.fromCharCode(65+bank)} 组转子安装板`,kind:'shell',delta:[(bank-1)*.5,(1-bank)*2+1.7,-2.2-bank*.5]});
 box(7.6,1.03,.08,dark,[0,.84,.91],{name:'电机通风面板',kind:'shell',delta:[0,-.5,3.7],turn:[-.3,0,0]});
 // All bolts and vents are geometric, not a painted cabinet image.
 for(const x of [-3.87,3.87])for(let j=0;j<26;j++)cyl(.025,.026,brass,[x,.4+j*.255,1.0],{name:'黄铜六角紧固件',delta:[Math.sign(x)*5,1.8+(j/25-.5)*4,3.2]});
 for(const y of [.27,1.46,7.03])for(let j=0;j<29;j++)cyl(.023,.026,brass,[-3.7+j*.265,y,1.0],{name:'框架铆钉',delta:[(j-14)*.18,(y-3.5)*.8+1.5,3.5]});
 // Lower grille. A sparse geometry grid reads correctly at the hero distance.
 for(let i=0;i<46;i++)box(.018,.83,.015,steel,[-3.65+i*.162,.85,.968],{name:'通风格栅',delta:[(i-23)*.06,-.4,4.1]});
 for(let i=0;i<9;i++)box(7.4,.015,.015,steel,[0,.47+i*.09,.97],{name:'通风格栅',delta:[0,-.5+(i-4)*.06,4.3]});
 // Three fans: separate cages, hubs, motors and sculpted blades.
 for(let i=0;i<3;i++){
 const x=(i-1)*2.53,delta=[(i-1)*2.1,-.5,4.8];
 cyl(.35,.08,black,[x,.88,1],{name:'风扇电机外壳',delta:[...delta.slice(0,2),2]});
 for(const radius of [.33,.28,.21])ring(radius,.012,gold,[x,.88,1.07],{name:'风扇同心防护圈',delta});
 for(let b=0;b<3;b++){const o=mesh(B(.14,.27,.025),gold,[x+Math.sin(b*2.094)*.14,.88+Math.cos(b*2.094)*.14,1.1]);o.rotation.z=-b*2.094+.4;part(o,{name:'三叶散热叶片',delta:[delta[0]+Math.sin(b*2.094)*.38,delta[1]+Math.cos(b*2.094)*.38,5.3]})}
 cyl(.065,.14,brass,[x,.88,1.13],{name:'风扇中心轴',delta:[delta[0],delta[1],6.1]});
 }
 for(const x of [-3.2,3.2]){box(.28,.36,1.6,steel,[x,.06,0],{name:'减震支座',delta:[Math.sign(x)*2,.8,-.2]});box(.65,.12,1.9,dark,[x,-.07,0],{name:'机脚底垫',delta:[Math.sign(x)*3,1.1,1]});}
 // Relay rack: panels, switches, porcelain sockets and individual copper pins.
 box(.7,5.94,1.8,green,[4.35,3.98,0],{name:'继电器机架',kind:'shell',delta:[7.1,2.1,-1],turn:[0,.2,0]});
 for(let i=0;i<15;i++){
 const y=1.55+i*.34;
 box(.52,.26,.07,dark,[4.35,y,.96],{name:'继电器安装模块',delta:[5.9+i*.08,1.7+(i-7)*.16,2]});
 for(const dx of [-.16,.16]){cyl(.05,.1,brass,[4.35+dx,y,1.08],{name:'接线端子',delta:[6.4+dx*4,1.7+(i-7)*.18,3.5]});}
 }
 // Detail lettering is a generated texture on a real metal plate.
 const label=tex(1024,128,(ctx,w,h)=>{ctx.fillStyle='#ad965d';ctx.fillRect(0,0,w,h);ctx.strokeStyle='#55482f';ctx.lineWidth=5;ctx.strokeRect(8,8,w-16,h-16);ctx.font='bold 42px monospace';ctx.fillStyle='#20271c';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('CHRISTOPHER · MK IV',w/2,h/2)});
 const lm=M(0xb59a5e,.6,.45,{map:label});const plaque=mesh(B(2,.20,.03),lm,[0,1.45,1.01]);part(plaque,{name:'Christopher 铭牌',delta:[0,-.4,5.4]});
 const faces=[];
 for(let row=0;row<3;row++){
  const base=['#7a533e','#a39367','#909a84'][row];
  const map=tex(256,256,(ctx,w,h)=>{ctx.clearRect(0,0,w,h);ctx.fillStyle=base;ctx.fillRect(0,0,w,h);ctx.strokeStyle='#ded4a9';ctx.lineWidth=2;for(let a=0;a<26;a++){ctx.save();ctx.translate(128,128);ctx.rotate(a/26*Math.PI*2);ctx.beginPath();ctx.moveTo(0,-108);ctx.lineTo(0,-119);ctx.stroke();ctx.fillStyle='#e8deba';ctx.font='11px monospace';ctx.textAlign='center';ctx.fillText(String.fromCharCode(65+a),0,-93);ctx.restore()}ctx.fillStyle='#273028';ctx.beginPath();ctx.arc(128,128,64,0,Math.PI*2);ctx.fill()});
  faces.push(M(0xffffff,.66,.35,{map}));
 }
 // 108 drums. Seven separable precision components plus three radial contacts.
 for(let bank=0;bank<3;bank++){for(let row=0;row<3;row++){for(let col=0;col<12;col++){
  const x=-3.18+col*.568,y=6.42-bank*1.82-row*.52,idx=rotors.length,r={bank,row,col,x,y,index:idx};rotors.push(r);
  const spreadX=x*.74,spreadY=(y-3.55)*.68+2.2;
  const desc=`转子 ${String.fromCharCode(65+bank)}${row+1} · ${String(col+1).padStart(2,'0')}`;
  const opt=(layer,name,spin=0)=>({name:`${desc} / ${name}`,kind:'drums',delta:[spreadX,spreadY,layer],rotor:r,spin});
  cyl(.246,.24,black,[x,y,1.01],opt(-.7,'绝缘外壳'));
  ring(.226,.029,brass,[x,y,1.155],opt(1.2,'黄铜锁环'));
  ring(.242,.012,copper,[x,y,.94],opt(-1.5,'后端触点环'));
  const face=mesh(geo('rotor-face',()=>new THREE.CircleGeometry(.21,low?12:40)),faces[row],[x,y,1.167]);part(face,opt(2.6,'字母刻度盘',.15+(idx%7)*.012));
  ring(.134,.011,gold,[x,y,1.19],opt(3.25,'内侧校准环',.15));
  cyl(.066,.13,silver,[x,y,1.232],opt(4.1,'驱动轮毂',.15));
  cyl(.026,.20,steel,[x,y,1.33],opt(5.2,'精密中心轴',.15));
  for(let k=0;k<3;k++){const a=k*Math.PI*2/3;const o=mesh(B(.028,.105,.025),silver,[x+Math.sin(a)*.065,y+Math.cos(a)*.065,1.235]);o.rotation.z=-a;part(o,{...opt(4.5,'三向金属触点'),delta:[spreadX+Math.sin(a)*.13,spreadY+Math.cos(a)*.13,4.5]});}
  // Physical index notch remains visible when the textured face turns away.
  box(.018,.048,.018,ivory,[x,y+.174,1.198],opt(2.8,'定位标记'));
 }}}
 for(let i=0;i<11;i++){const k=i*.044;cable([[-3.76,5.9-i*.16,.8],[-4.12-k,6.6,0],[-3.42,7.17+k,-.22],[2.4,7.14+k,-.24],[4.12+k,6.87+k,.1],[4.76+k,5.6,.22]],.026,i);}
 for(let i=0;i<8;i++){const k=i*.071;cable([[4.35,2.0+k,.9],[4.65+k,1.1,.6],[4.8+k,.12,1.4],[3.7-k,.08,1.6]],.029,i,{delta:[4.6+i*.12,1.5,-.2+i*.14],turn:[0,.25,0]});}
 for(let i=0;i<6;i++)box(.10,.22,.3,brass,[-2.9+i*1.06,7.23,-.14],{name:'铜制线束束带',kind:'shell',delta:[(i-2.5)*.55,5.5,-1]});
 for(let i=0;i<9;i++){
 const y=6.4-Math.floor(i/3)*1.82-(i%3)*.52;const m=M(0xadac6d,.25,.32,{emissive:0x9d8a3f,emissiveIntensity:.3});
 const light=cyl(.047,.06,m,[3.56,y,1.03],{name:'机械状态指示灯',delta:[3.6,2.1+(y-3.5)*.5,3]});lights.push(light);
 }
 // The figure provides scale, with collar, braces, fingers, face and paper notes.
 const turing=createTuringFigure(THREE);turing.position.set(6.7,-.04,1.17);turing.scale.setScalar(1.23);turing.rotation.y=-1.05;scene.add(turing);
 turing.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;o.userData.name='Alan Turing · 人类的好奇心';o.userData.kind='human';pickables.push(o)}});
 // Monumental hall. Tall fins, massive bases and a real aperture above the machine.
 const stone=M(0xe8e5cd,.03,.9),stoneSide=M(0x929680,.04,.92),wall=M(0x18281c,.08,.87),wallEdge=M(0x46543d,.08,.91);
 const marble=tex(256,256,(ctx,w,h)=>{ctx.fillStyle='#d4d3c3';ctx.fillRect(0,0,w,h);let seed=91;const rnd=()=>{seed=seed*16807%2147483647;return seed/2147483647};for(let i=0;i<75;i++){ctx.beginPath();let x=rnd()*w;ctx.moveTo(x,0);for(let y=0;y<h;y+=18){x+=(rnd()-.5)*20;ctx.lineTo(x,y)}ctx.strokeStyle='#515c4720';ctx.lineWidth=.6;ctx.stroke()}for(let i=0;i<9000;i++){ctx.fillStyle=i%2?'#faffea16':'#303f2910';ctx.fillRect(rnd()*w,rnd()*h,1,1)}});marble.wrapS=marble.wrapT=THREE.RepeatWrapping;marble.repeat.set(3,4);for(const m of [stone,stoneSide,wall,wallEdge]){m.map=marble;m.bumpMap=marble;m.bumpScale=.023;}
 const envbox=(w,h,d,m,p)=>mesh(B(w,h,d),m,p,scene);
 // A five-sided plinth: its forward corner anchors the low-perspective composition.
 const outline=[[-25,-13],[25,-13],[25,1],[0,6.6],[-25,1]],topPositions=[0,-.22,-3],topIndex=[];
 for(const [x,z] of outline)topPositions.push(x,-.22,z);
 for(let i=0;i<5;i++)topIndex.push(0,(i+1)%5+1,i+1);
 const topGeo=new THREE.BufferGeometry();topGeo.setAttribute('position',new THREE.Float32BufferAttribute(topPositions,3));topGeo.setIndex(topIndex);topGeo.computeVertexNormals();disposables.add(topGeo);mesh(topGeo,stone,[0,0,0],scene);
 const sidePositions=[],sideIndex=[];
 for(let i=0;i<5;i++){const a=outline[i],b=outline[(i+1)%5],k=i*4;sidePositions.push(a[0],-.22,a[1],a[0],-2.4,a[1],b[0],-.22,b[1],b[0],-2.4,b[1]);sideIndex.push(k,k+2,k+1,k+2,k+3,k+1);}
 const sideGeo=new THREE.BufferGeometry();sideGeo.setAttribute('position',new THREE.Float32BufferAttribute(sidePositions,3));sideGeo.setIndex(sideIndex);sideGeo.computeVertexNormals();disposables.add(sideGeo);mesh(sideGeo,stoneSide,[0,0,0],scene);
 for(let i=0;i<5;i++){const a=outline[i],b=outline[(i+1)%5],mid=[(a[0]+b[0])/2,-.22,(a[1]+b[1])/2],length=Math.hypot(a[0]-b[0],a[1]-b[1]);const lip=envbox(length,.045,.055,ivory,mid);lip.rotation.y=-Math.atan2(b[1]-a[1],b[0]-a[0]);}

 envbox(90,48,.8,wall,[-1,20,-11.8]);
 for(const [i,x] of [-29,-21,-13,-5,3,11,19,27].entries()){
  envbox(2.45,34,4.1,i%3?wallEdge:stoneSide,[x,15,-10.4]);envbox(3.8,1.65,5,stoneSide,[x,.5,-9.9]);
 }
 for(const x of [-20,-10,18]){envbox(2.7,38,3.6,wall,[x,17,-4.2]);envbox(4,1.4,4.9,stoneSide,[x,.4,-3.9]);}
 envbox(30,.6,8,wall,[-12.8,26,-5]);envbox(31,.6,8,wall,[18.8,26,-5]);
 const opening=mesh(B(.65,.09,8),new THREE.MeshBasicMaterial({color:0xfff4d1}),[2.7,25.6,-5],scene);opening.castShadow=false;
 const shaft=new THREE.MeshBasicMaterial({color:0xf5edc9,transparent:true,opacity:.07,side:THREE.DoubleSide,depthWrite:false});disposables.add(shaft);
 const beam=mesh(geo('beam',()=>new THREE.PlaneGeometry(.65,25.7)),shaft,[2.7,12.7,-4.8],scene);beam.castShadow=false;
 const halo=mesh(geo('halo',()=>new THREE.PlaneGeometry(3.0,26)),new THREE.MeshBasicMaterial({color:0xd8d9ad,transparent:true,opacity:.025,side:THREE.DoubleSide,depthWrite:false}),[2.7,12.7,-5],scene);halo.castShadow=false;
 const glow=mesh(geo('glow',()=>new THREE.PlaneGeometry(.22,25.7)),new THREE.MeshBasicMaterial({color:0xfff4d2,transparent:true,opacity:.86,side:THREE.DoubleSide,depthWrite:false}),[2.7,12.7,-4.7],scene);glow.castShadow=false;
 // Contact grounding is transparent geometry, including on the CPU renderer.
 const shadowMat=new THREE.MeshBasicMaterial({color:0x0b150d,transparent:true,opacity:.28,depthWrite:false});
 const contact=mesh(new THREE.CircleGeometry(1,32),shadowMat,[.15,-.211,.3],scene);contact.rotation.x=-Math.PI/2;contact.scale.set(5.6,1.5,1);contact.castShadow=false;
 const footshadow=mesh(new THREE.CircleGeometry(1,20),shadowMat,[6.8,-.21,1.25],scene);footshadow.rotation.x=-Math.PI/2;footshadow.scale.set(.7,.5,1);footshadow.castShadow=false;
 scene.add(new THREE.HemisphereLight(0xe9e5cc,0x112317,1.15));
 const key=new THREE.DirectionalLight(0xffefcc,3.2);key.position.set(-5,12,12);key.castShadow=true;key.shadow.mapSize.set(2048,2048);Object.assign(key.shadow.camera,{left:-15,right:15,top:18,bottom:-9,near:1,far:60});key.shadow.normalBias=.025;key.shadow.bias=-.0003;scene.add(key);
 const slitlight=new THREE.SpotLight(0xffeac1,950,60,.27,.8,1.4);slitlight.position.set(2.7,17.3,-4);slitlight.target.position.set(3.5,0,2);scene.add(slitlight,slitlight.target);
 const rim=new THREE.DirectionalLight(0xa4b69c,1.4);rim.position.set(10,9,-6);scene.add(rim);
 // A studio-like radiance environment gives brass real reflections without photos.
 const envScene=new THREE.Scene();envScene.background=new THREE.Color(0x3a4334);
 for(const [p,s,c] of [[[0,10,3],[9,4,1],0xd6cbb1],[[-8,4,8],[3,9,1],0x89947b],[[7,5,-4],[4,8,1],0x46533e]]){const m=new THREE.MeshBasicMaterial({color:c,side:THREE.DoubleSide});const o=new THREE.Mesh(new THREE.PlaneGeometry(s[0],s[1]),m);o.position.set(...p);o.lookAt(0,3,0);envScene.add(o);disposables.add(m);disposables.add(o.geometry)}
 // A broader cabinet matches the reference proportions without stretching drums.
 const widened=new Set();
 for(const p of parts){p.o.position.x*=1.18;p.base.x*=1.18;p.delta.x*=1.18;const g=p.o.geometry;if(!widened.has(g)&&(g.type==='TubeGeometry'||(g.type==='BoxGeometry'&&g.parameters.width>1))){g.scale(1.18,1,1);widened.add(g);}}
 // Batch repeated geometry on the GPU, retaining individual instance transforms.
 const batches=[];
 if(!low){const grouped=new Map();for(const p of parts){const key=`${p.o.geometry.uuid}|${p.o.material.uuid}`;if(!grouped.has(key))grouped.set(key,[]);grouped.get(key).push(p);}
  const human=pickables.filter(o=>o.userData.kind==='human');pickables.length=0;pickables.push(...human);
  for(const group of grouped.values()){const first=group[0].o,batch=new THREE.InstancedMesh(first.geometry,first.material,group.length);batch.instanceMatrix.setUsage(THREE.DynamicDrawUsage);batch.castShadow=true;batch.receiveShadow=true;batch.frustumCulled=false;batch.boundingSphere=new THREE.Sphere(new THREE.Vector3(0,5,2),35);batch.userData.sourceParts=group;root.add(batch);batches.push(batch);pickables.push(batch);group.forEach((p,i)=>{p.o.visible=false;p.o.userData.batched=true;p.batch=batch;p.slot=i;});}
 }
 let selected=null;const spinQ=new THREE.Quaternion(),turnQ=new THREE.Quaternion(),turnEuler=new THREE.Euler();
 function update(state,time){
  for(const p of parts){const amount=state[p.kind]??state.hardware;const t=amount;p.o.position.copy(p.base).addScaledVector(p.delta,t);turnEuler.set(p.turn.x*t,p.turn.y*t,p.turn.z*t);turnQ.setFromEuler(turnEuler);p.o.quaternion.copy(p.quaternion).multiply(turnQ);if(p.spin){spinQ.setFromAxisAngle(new THREE.Vector3(0,0,1),time*p.spin);p.o.quaternion.premultiply(spinQ)}if(p===selected)p.o.position.z+=.12;if(p.batch){p.o.updateMatrix();p.batch.setMatrixAt(p.slot,p.o.matrix);}}for(const b of batches)b.instanceMatrix.needsUpdate=true;
  for(let i=0;i<lights.length;i++)lights[i].material.emissiveIntensity=.4+Math.max(0,Math.sin(time*1.6-i*.8))*.9;
 }
 return {root,parts,pickables,rotors,turing,envScene,update,select(p){selected=p;},dispose(){scene.traverse(o=>{if(o.geometry)disposables.add(o.geometry);if(o.material){if(Array.isArray(o.material))o.material.forEach(m=>disposables.add(m));else disposables.add(o.material)}});disposables.forEach(o=>o.dispose?.());}};
}
