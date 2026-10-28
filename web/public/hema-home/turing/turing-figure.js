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
// An original faceted study of a wartime mathematician, modeled entirely in Three.js.
export function createTuringFigure(THREE) {
  const root = new THREE.Group(); root.name = 'Alan Turing · sculptural study';
  const mat = (color, roughness = .88) => new THREE.MeshStandardMaterial({color,roughness,metalness:0,flatShading:true});
  const shirt=mat(0xe1d8be), shirtDark=mat(0x999681), skin=mat(0xba9c7c), skinLight=mat(0xc7ac8c), skinShadow=mat(0xa08369), hair=mat(0x24231e), hairLight=mat(0x343229), pants=mat(0x343936), pantsLight=mat(0x41443c), leather=mat(0x1d2421,.5), straps=mat(0x514b3b), metal=new THREE.MeshStandardMaterial({color:0x9c9073,metalness:.8,roughness:.35}), paper=mat(0xb4b09a);
  function add(g,m,p=[0,0,0],s){const o=new THREE.Mesh(g,m);o.position.set(...p); if(s)o.scale.set(...s);o.castShadow=true;o.receiveShadow=true;root.add(o);return o;}
  function ellipsoid(m,p,s,detail=1){return add(new THREE.IcosahedronGeometry(1,detail),m,p,s);}
  function between(a,b,r1,r2,m,sides=8){const d=new THREE.Vector3().subVectors(new THREE.Vector3(...b),new THREE.Vector3(...a));const o=add(new THREE.CylinderGeometry(r2,r1,d.length(),sides,1),m);o.position.copy(new THREE.Vector3(...a).add(new THREE.Vector3(...b)).multiplyScalar(.5));o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());return o;}
  function profile(rings,m,segments=12){const pos=[],ind=[];for(const [y,rx,rz,zoff=0] of rings){for(let j=0;j<segments;j++){const a=j/segments*Math.PI*2;pos.push(Math.sin(a)*rx,y,Math.cos(a)*rz+zoff);}}for(let k=0;k<rings.length-1;k++)for(let j=0;j<segments;j++){const a=k*segments+j,b=k*segments+(j+1)%segments,c=(k+1)*segments+j,d=(k+1)*segments+(j+1)%segments;ind.push(a,b,c,b,d,c);}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setIndex(ind);g.computeVertexNormals();return add(g,m);}
  function patch(points,m){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(points.flat(),3));g.setIndex(points.length===4?[0,1,2,0,2,3]:[0,1,2]);g.computeVertexNormals();return add(g,m);}
  // Polished lace-up shoes: grounded, slightly asymmetric stance.
  ellipsoid(leather,[-.21,.14,.13],[.16,.14,.34],1);ellipsoid(leather,[.26,.14,.02],[.16,.14,.32],1);
  add(new THREE.BoxGeometry(.3,.07,.58),leather,[-.21,.055,.12]);add(new THREE.BoxGeometry(.3,.07,.56),leather,[.26,.055,.01]);
  // High-waisted trousers have a relaxed wartime cut, creases and taper.
  between([-.21,.24,.02],[-.20,1.13,-.005],.115,.165,pants,8);between([-.2,1.12,-.005],[-.18,2.08,0],.17,.218,pants,8);
  between([.26,.24,-.04],[.28,1.1,-.08],.12,.168,pants,8);between([.28,1.1,-.08],[.18,2.08,0],.17,.215,pants,8);
  profile([[1.9,.34,.18],[2.06,.36,.22],[2.21,.335,.20]],pants);
  between([-.205,.3,.124],[-.19,1.91,.202],.012,.014,pantsLight,3);between([.26,.3,.077],[.2,1.94,.205],.011,.014,pantsLight,3);
  // Belt and tucked shirt body, subtly leaning toward the machine.
  profile([[2.13,.34,.203],[2.20,.343,.206]],straps);add(new THREE.BoxGeometry(.105,.09,.035),metal,[0,2.165,.21]);
  profile([[2.19,.33,.20],[2.35,.35,.22],[2.68,.40,.23],[3.00,.46,.22],[3.24,.48,.20],[3.34,.34,.17],[3.40,.14,.125]],shirt,12);
  // Placket and mother-of-pearl buttons.
  add(new THREE.BoxGeometry(.045,.97,.012),shirtDark,[0,2.78,.229]);
  for(let y=2.35;y<3.27;y+=.17)ellipsoid(metal,[0,y,.245],[.016,.016,.008],0);
  // Pocket, small folds and neck.
  patch([[.13,3.10,.225],[.31,3.10,.209],[.30,2.89,.235],[.15,2.89,.245]],shirtDark);
  patch([[.13,3.09,.23],[.31,3.09,.215],[.30,2.91,.244],[.15,2.91,.25]],shirt);
  between([0,3.32,0],[0,3.57,.005],.13,.125,skin,9);
  // Turned-down pointed collar.
  patch([[-.15,3.43,.12],[-.02,3.34,.18],[-.11,3.14,.26],[-.27,3.31,.18]],shirt);
  patch([[.15,3.43,.12],[.27,3.31,.18],[.11,3.14,.26],[.02,3.34,.18]],shirt);
  // Leather braces on chest and back.
  for(const s of [-1,1]){
    between([s*.255,2.20,.155],[s*.29,2.68,.2],.026,.026,straps,4);
    between([s*.29,2.68,.2],[s*.30,3.30,.165],.026,.026,straps,4);
    between([s*.30,3.30,.165],[s*.31,3.33,-.16],.026,.026,straps,4);
    between([s*.31,3.33,-.16],[s*.17,2.22,-.185],.026,.026,straps,4);
    add(new THREE.BoxGeometry(.072,.11,.02),metal,[s*.29,2.88,.23]);
    add(new THREE.BoxGeometry(.045,.07,.025),straps,[s*.29,2.88,.245]);
  }
  // The left arm is raised, elbow bent toward a rotor; right holds notes.
  ellipsoid(shirt,[-.455,3.18,0],[.22,.22,.22],1);
  between([-.47,3.18,.015],[-.70,2.76,.07],.18,.14,shirt,10);
  between([-.70,2.78,.07],[-.88,2.84,.42],.14,.11,shirt,10);
  between([-.84,2.82,.34],[-.91,2.85,.47],.132,.127,shirtDark,10);
  between([-.86,2.84,.38],[-.925,2.85,.50],.14,.135,shirt,10);
  between([-.925,2.85,.5],[-1.12,2.86,.65],.09,.068,skin,9);
  ellipsoid(skinLight,[-1.17,2.86,.69],[.14,.075,.07],1);
  for(let j=0;j<4;j++)between([-1.18,2.87+(j-1.5)*.026,.70],[-1.34,2.87+(j-1.5)*.026,.73],.023,.017,skin,6);
  between([-1.10,2.82,.67],[-1.20,2.77,.70],.033,.025,skin,6);
  ellipsoid(shirt,[.45,3.18,0],[.21,.22,.22],1);
  between([.47,3.16,0],[.65,2.81,.08],.175,.14,shirt,10);
  between([.65,2.81,.08],[.35,2.56,.43],.14,.115,shirt,10);
  between([.39,2.59,.39],[.30,2.53,.47],.137,.13,shirtDark,10);
  between([.37,2.57,.41],[.28,2.52,.49],.14,.135,shirt,10);
  between([.28,2.52,.49],[.045,2.49,.60],.092,.065,skin,9);
  ellipsoid(skinLight,[.015,2.48,.60],[.13,.07,.075],1);
  for(let j=0;j<3;j++)between([-.03,2.48+j*.022,.62],[-.14,2.47+j*.022,.64],.022,.017,skin,6);
  const folio=add(new THREE.BoxGeometry(.65,.48,.025),paper,[-.035,2.32,.55]);folio.rotation.set(-.32,.1,-.1);
  const folio2=add(new THREE.BoxGeometry(.64,.47,.015),shirt,[-.03,2.325,.573]);folio2.rotation.copy(folio.rotation);
  // Long, narrow face with a defined jaw and brow, rendered as a sculptural study.
  profile([[3.48,.075,.105,.045],[3.54,.15,.145,.025],[3.67,.205,.175,0],[3.81,.225,.178,-.005],[3.94,.215,.17,-.015],[4.04,.15,.13,-.022],[4.075,.025,.025,-.022]],skinLight,12);
  ellipsoid(skinShadow,[-.219,3.75,-.005],[.055,.09,.047],1);ellipsoid(skinShadow,[.219,3.75,-.005],[.055,.09,.047],1);
  // Straight nose, shadowed sockets, restrained features.
  patch([[-.044,3.82,.167],[.044,3.82,.167],[.043,3.68,.19],[-.04,3.68,.19]],skinShadow);
  patch([[-.037,3.82,.174],[0,3.81,.214],[0,3.69,.237],[-.045,3.68,.191]],skinLight);
  patch([[0,3.81,.214],[.037,3.82,.174],[.045,3.68,.191],[0,3.69,.237]],skin);
  ellipsoid(hair,[-.092,3.79,.167],[.047,.013,.012],0);ellipsoid(hair,[.092,3.79,.167],[.047,.013,.012],0);
  ellipsoid(skinShadow,[-.088,3.83,.16],[.07,.02,.025],0);ellipsoid(skinShadow,[.088,3.83,.16],[.07,.02,.025],0);
  ellipsoid(skinShadow,[0,3.61,.162],[.066,.012,.012],0);
  // Hair sits close to the head: swept side part and clipped sides.
  profile([[3.91,.22,.174,-.018],[4.015,.192,.155,-.03],[4.09,.115,.105,-.04],[4.12,.005,.005,-.04]],hair,12);
  add(new THREE.SphereGeometry(1,10,6,Math.PI/2,Math.PI,.3,Math.PI*.72),hair,[0,3.86,-.028],[.226,.234,.177]);
  ellipsoid(hair,[-.18,3.96,.08],[.10,.095,.13],1);ellipsoid(hairLight,[-.085,4.025,.105],[.14,.063,.09],1);
  between([.065,3.97,.149],[.11,4.075,.06],.009,.007,skinShadow,4);
  root.rotation.y=-.30;
  return root;
}
