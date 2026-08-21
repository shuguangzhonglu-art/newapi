import * as THREE from "./three.module.min.js";
import { organizations, papers, people, peopleBios, projects } from "./catalog.js";

const canvas = document.querySelector("#scene");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const isMobile = window.matchMedia("(max-width: 767px)").matches;

const renderer = new THREE.WebGLRenderer({ canvas, antialias: !isMobile, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.15 : 1.5));
renderer.setClearColor(0xedf0e6, 1);

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0xedf0e6, 0.042);

const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
camera.position.set(0, 0.8, 12);

const pointer = new THREE.Vector2();
const pointerTarget = new THREE.Vector2();
const clock = new THREE.Clock();

function renderCatalog() {
  const peopleGrid = document.querySelector("#people-grid");
  const projectStream = document.querySelector("#project-stream");
  const organizationList = document.querySelector("#organization-list");
  const paperTimeline = document.querySelector("#paper-timeline");

  peopleGrid.innerHTML = people.map(([name, role], index) => `
    <button class="person reveal" type="button" data-person-index="${index}" aria-label="查看 ${name} 的人物介绍">
      <span>${String(index + 1).padStart(2, "0")}</span>
      <h3>${name}</h3>
      <p>${role}</p>
    </button>
  `).join("");

  projectStream.innerHTML = projects.map(([name, type], index) => `
    <article class="project reveal">
      <span>${String(index + 1).padStart(2, "0")}</span>
      <h3>${name}</h3>
      <p>${type}</p>
    </article>
  `).join("");

  paperTimeline.innerHTML = papers.map(([year, title, impact], index) => `
    <article class="paper reveal">
      <span class="paper-index">${String(index + 1).padStart(2, "0")}</span>
      <time>${year}</time>
      <h3>${title}</h3>
      <p>${impact}</p>
    </article>
  `).join("");

  organizationList.innerHTML = organizations.map(([name, scope], index) => `
    <article class="organization reveal">
      <span>${String(index + 1).padStart(2, "0")}</span>
      <h3>${name}</h3>
      <p>${scope}</p>
    </article>
  `).join("");
}

renderCatalog();

const profileDialog = document.querySelector("#profile-dialog");
const profileName = document.querySelector("#profile-name");
const profileRole = document.querySelector("#profile-role");
const profileBio = document.querySelector("#profile-bio");
const profileNumber = document.querySelector("#profile-number");

function openProfile(index) {
  const [name, role] = people[index];
  profileNumber.textContent = String(index + 1).padStart(2, "0");
  profileName.textContent = name;
  profileRole.textContent = role;
  profileBio.textContent = peopleBios[name];
  if (typeof profileDialog.showModal === "function") {
    profileDialog.showModal();
  } else {
    profileDialog.setAttribute("open", "");
  }
}

document.querySelector("#people-grid").addEventListener("click", (event) => {
  const personButton = event.target.closest("[data-person-index]");
  if (!personButton) return;
  openProfile(Number(personButton.dataset.personIndex));
});

document.querySelector(".profile-close").addEventListener("click", () => profileDialog.close());
profileDialog.addEventListener("click", (event) => {
  if (event.target === profileDialog) profileDialog.close();
});

const globeGroup = new THREE.Group();
const globeBasePosition = new THREE.Vector3(isMobile ? 0.75 : 3.7, isMobile ? 1.5 : 1.35, 0);
globeGroup.position.copy(globeBasePosition);
globeGroup.scale.setScalar(isMobile ? 0.88 : 0.94);
scene.add(globeGroup);

const globeShadow = new THREE.Mesh(
  new THREE.CircleGeometry(isMobile ? 1.9 : 2.3, 72),
  new THREE.MeshBasicMaterial({
    color: 0x536148,
    transparent: true,
    opacity: 0.1,
    depthWrite: false
  })
);
globeShadow.position.set(
  globeBasePosition.x,
  globeBasePosition.y - (isMobile ? 2.15 : 2.55),
  -0.8
);
globeShadow.scale.y = 0.14;
scene.add(globeShadow);

const globeVertex = `
  varying vec3 vNormal;
  varying vec3 vPosition;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vPosition = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const globeFragment = `
  precision highp float;
  uniform float uTime;
  varying vec3 vNormal;
  varying vec3 vPosition;

  float hash(vec3 p) {
    p = fract(p * 0.3183099 + 0.1);
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }

  float noise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x),
                   mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
               mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
                   mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
  }

  float fbm(vec3 p) {
    float value = 0.0;
    float amp = 0.5;
    for (int i = 0; i < 5; i++) {
      value += amp * noise(p);
      p = p * 2.03 + 1.7;
      amp *= 0.5;
    }
    return value;
  }

  void main() {
    float land = fbm(normalize(vPosition) * 3.7 + vec3(0.0, uTime * 0.012, 0.0));
    float coast = smoothstep(0.49, 0.57, land);
    float bands = step(0.54, fract((vPosition.y + 2.0) * 24.0));
    float rim = pow(1.0 - max(dot(vNormal, vec3(0.0, 0.0, 1.0)), 0.0), 2.2);
    vec3 ocean = vec3(0.79, 0.82, 0.75);
    vec3 terrain = mix(vec3(0.31, 0.40, 0.18), vec3(0.63, 0.71, 0.31), land);
    vec3 color = mix(ocean, terrain, coast);
    color -= rim * vec3(0.16, 0.18, 0.10);
    color -= bands * coast * 0.025;
    gl_FragColor = vec4(color, 1.0);
  }
`;

const globeMaterial = new THREE.ShaderMaterial({
  uniforms: { uTime: { value: 0 } },
  vertexShader: globeVertex,
  fragmentShader: globeFragment
});

const globe = new THREE.Mesh(
  new THREE.IcosahedronGeometry(isMobile ? 2.0 : 2.35, isMobile ? 5 : 6),
  globeMaterial
);
globeGroup.add(globe);

let heroInView = true;

const heroVisibilityObserver = new IntersectionObserver(([entry]) => {
  heroInView = entry.isIntersecting;
  if (!heroInView) document.body.style.cursor = "";
}, { threshold: 0.12 });
heroVisibilityObserver.observe(document.querySelector(".hero"));

function createCodeTexture() {
  const textureCanvas = document.createElement("canvas");
  textureCanvas.width = isMobile ? 1024 : 2048;
  textureCanvas.height = isMobile ? 512 : 1024;
  const context = textureCanvas.getContext("2d");
  const fontSize = isMobile ? 18 : 24;
  const lineHeight = Math.round(fontSize * 1.48);
  const code = [
    "const client = await hema.connect();",
    "for (let model of hema.models) model.sync();",
    "vector += normalize(input) * delta;",
    "if (request.ready) await hema.generate();",
    "uniform float uTime;",
    "model.train({ stream: true });",
    "01001011 00110101 11001010",
    "camera.position.lerp(target, 0.04);",
    "return intelligence.map(toAction);",
    "while (online) transmit(nextPacket);",
    "vec3 world = projection * position;",
    "requestAnimationFrame(render);",
    "memory.write(context, timestamp);",
    "export default neuralInterface;",
    "latency = response.end - request.start;",
    "hema.route('/v1/:model');"
  ];

  context.clearRect(0, 0, textureCanvas.width, textureCanvas.height);
  context.font = `${fontSize}px ui-monospace, SFMono-Regular, Menlo, monospace`;
  context.textBaseline = "top";

  for (let y = -lineHeight; y < textureCanvas.height + lineHeight; y += lineHeight) {
    const row = Math.floor(y / lineHeight) + 1;
    const statement = code[Math.abs(row) % code.length];
    const offset = row % 2 === 0 ? 0 : textureCanvas.width * 0.24;
    context.fillStyle = row % 3 === 0 ? "rgba(19, 31, 23, 0.98)" : "rgba(53, 78, 18, 0.9)";
    for (let x = -textureCanvas.width; x < textureCanvas.width * 2; x += textureCanvas.width * 0.48) {
      context.fillText(statement, x + offset, y);
    }
  }

  const texture = new THREE.CanvasTexture(textureCanvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1.25, 1.1);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
  return texture;
}

const codeTexture = createCodeTexture();
const codeGlobe = new THREE.Mesh(
  new THREE.SphereGeometry(isMobile ? 2.025 : 2.38, isMobile ? 40 : 64, isMobile ? 24 : 40),
  new THREE.MeshBasicMaterial({
    map: codeTexture,
    color: 0x273519,
    transparent: true,
    opacity: 0.76,
    depthWrite: false,
    blending: THREE.NormalBlending
  })
);
codeGlobe.rotation.z = -0.09;
globeGroup.add(codeGlobe);

const codeGlobeCounter = codeGlobe.clone();
codeGlobeCounter.scale.setScalar(1.018);
codeGlobeCounter.material = codeGlobe.material.clone();
codeGlobeCounter.material.opacity = 0.24;
codeGlobeCounter.rotation.set(0.18, 0, Math.PI * 0.5);
globeGroup.add(codeGlobeCounter);

function createPersonTexture() {
  const textureCanvas = document.createElement("canvas");
  textureCanvas.width = 1024;
  textureCanvas.height = 1024;
  const context = textureCanvas.getContext("2d");
  const fontSize = isMobile ? 18 : 12;
  const lineHeight = textureCanvas.height / people.length;
  const hitRegions = [];

  context.clearRect(0, 0, textureCanvas.width, textureCanvas.height);
  context.textBaseline = "middle";
  context.font = `600 ${fontSize}px ui-monospace, SFMono-Regular, Menlo, monospace`;

  people.forEach(([name], personIndex) => {
    const y = (personIndex + 0.5) * lineHeight;
    const textWidth = context.measureText(name).width;
    const stride = textureCanvas.width * 0.48;
    const rowOffset = personIndex % 2 === 0 ? 18 : stride * 0.48;
    context.fillStyle = personIndex % 3 === 0 ? "rgba(23, 36, 29, 0.96)" : "rgba(69, 92, 20, 0.94)";

    for (let x = rowOffset; x < textureCanvas.width; x += stride) {
      context.fillText(name, x, y);
      hitRegions.push({
        x1: x - (isMobile ? 24 : 5),
        x2: Math.min(textureCanvas.width, x + textWidth + (isMobile ? 24 : 5)),
        y1: y - lineHeight * (isMobile ? 0.49 : 0.46),
        y2: y + lineHeight * (isMobile ? 0.49 : 0.46),
        personIndex
      });
    }
  });

  const texture = new THREE.CanvasTexture(textureCanvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1.25, 0.55);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
  return { texture, hitRegions, width: textureCanvas.width, height: textureCanvas.height };
}

const personTextureData = createPersonTexture();
const personTexture = personTextureData.texture;
const personGlobe = new THREE.Mesh(
  new THREE.SphereGeometry(isMobile ? 2.045 : 2.405, isMobile ? 48 : 72, isMobile ? 28 : 48),
  new THREE.MeshBasicMaterial({
    map: personTexture,
    transparent: true,
    opacity: 0.92,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1
  })
);
personGlobe.rotation.z = -0.09;
personGlobe.renderOrder = 3;
globeGroup.add(personGlobe);

const personRaycaster = new THREE.Raycaster();
const personPointer = new THREE.Vector2();
let pressStart = null;

function findPersonAt(clientX, clientY) {
  personPointer.x = (clientX / window.innerWidth) * 2 - 1;
  personPointer.y = -(clientY / window.innerHeight) * 2 + 1;
  personRaycaster.setFromCamera(personPointer, camera);
  const hit = personRaycaster.intersectObject(personGlobe, false)[0];
  if (!hit?.uv) return null;

  const textureUv = hit.uv.clone();
  personTexture.transformUv(textureUv);
  const pixelX = textureUv.x * personTextureData.width;
  const pixelY = textureUv.y * personTextureData.height;
  const region = personTextureData.hitRegions.find(({ x1, x2, y1, y2 }) => (
    pixelX >= x1 && pixelX <= x2 && pixelY >= y1 && pixelY <= y2
  ));
  return region?.personIndex ?? null;
}

window.addEventListener("pointerdown", (event) => {
  pressStart = { x: event.clientX, y: event.clientY, id: event.pointerId };
}, { passive: true });

window.addEventListener("pointerup", (event) => {
  if (!heroInView || event.target.closest("a, button, dialog")) return;
  if (!pressStart || pressStart.id !== event.pointerId) return;
  const travel = Math.hypot(event.clientX - pressStart.x, event.clientY - pressStart.y);
  pressStart = null;
  if (travel > 12) return;
  const personIndex = findPersonAt(event.clientX, event.clientY);
  if (personIndex !== null) openProfile(personIndex);
});

window.addEventListener("pointercancel", () => { pressStart = null; }, { passive: true });

const dataParticlesGeometry = new THREE.BufferGeometry();
const dataParticleCount = isMobile ? 180 : 420;
const dataParticlePositions = new Float32Array(dataParticleCount * 3);
for (let i = 0; i < dataParticleCount; i += 1) {
  const angle = (i / dataParticleCount) * Math.PI * 2;
  const radius = (isMobile ? 2.65 : 3.08) + (Math.random() - 0.5) * 0.28;
  dataParticlePositions[i * 3] = Math.cos(angle) * radius;
  dataParticlePositions[i * 3 + 1] = (Math.random() - 0.5) * 0.7;
  dataParticlePositions[i * 3 + 2] = Math.sin(angle) * radius;
}
dataParticlesGeometry.setAttribute("position", new THREE.BufferAttribute(dataParticlePositions, 3));
const dataParticles = new THREE.Points(
  dataParticlesGeometry,
  new THREE.PointsMaterial({
    color: 0x526d00,
    size: isMobile ? 0.035 : 0.045,
    transparent: true,
    opacity: 0.8,
    sizeAttenuation: true
  })
);
dataParticles.rotation.x = 0.42;
globeGroup.add(dataParticles);

const pulseRings = [];
for (let i = 0; i < 3; i += 1) {
  const pulse = new THREE.Mesh(
    new THREE.RingGeometry(isMobile ? 2.2 : 2.55, isMobile ? 2.22 : 2.58, 128),
    new THREE.MeshBasicMaterial({
      color: 0x526d00,
      transparent: true,
      opacity: 0.28,
      side: THREE.DoubleSide,
      depthWrite: false
    })
  );
  pulse.userData.phase = i / 3;
  pulse.rotation.x = Math.PI * 0.5;
  globeGroup.add(pulse);
  pulseRings.push(pulse);
}

const shell = new THREE.LineSegments(
  new THREE.WireframeGeometry(new THREE.IcosahedronGeometry(isMobile ? 2.08 : 2.43, 3)),
  new THREE.LineBasicMaterial({ color: 0x536634, transparent: true, opacity: 0.22 })
);
globeGroup.add(shell);

const ringMaterial = new THREE.LineBasicMaterial({ color: 0x62752f, transparent: true, opacity: 0.3 });
const gravityArcs = [];
for (let i = 0; i < 3; i += 1) {
  const ring = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(
    Array.from({ length: 160 }, (_, index) => {
      const a = (index / 160) * Math.PI * 2;
      return new THREE.Vector3(Math.cos(a) * 2.75, Math.sin(a) * 2.75, 0);
    })
  ), ringMaterial);
  ring.rotation.set(i * 0.63, i * 0.92, i * 0.24);
  globeGroup.add(ring);
  gravityArcs.push(ring);
}

for (let i = 0; i < 4; i += 1) {
  const arcPoints = Array.from({ length: 220 }, (_, index) => {
    const angle = (index / 220) * Math.PI * 2;
    const radiusX = (isMobile ? 2.65 : 3.05) + i * 0.24;
    const radiusY = (isMobile ? 1.05 : 1.28) + i * 0.11;
    const lensing = Math.sin(angle * 2 + i) * 0.09;
    return new THREE.Vector3(
      Math.cos(angle) * (radiusX + lensing),
      Math.sin(angle) * radiusY,
      Math.sin(angle * 2 + i * 0.7) * 0.22
    );
  });
  const arc = new THREE.LineLoop(
    new THREE.BufferGeometry().setFromPoints(arcPoints),
    new THREE.LineBasicMaterial({
      color: i % 2 === 0 ? 0x526d00 : 0x61756f,
      transparent: true,
      opacity: 0.12 + i * 0.025
    })
  );
  arc.rotation.set(0.18 + i * 0.13, i * 0.42, -0.12 + i * 0.08);
  globeGroup.add(arc);
  gravityArcs.push(arc);
}

const terrainVertex = `
  uniform float uTime;
  uniform vec2 uGravityCenter;
  varying float vLift;
  float wave(vec2 p) {
    return sin(p.x * 0.72 + uTime * 0.55) * 0.45
      + cos(p.y * 0.86 - uTime * 0.34) * 0.34
      + sin((p.x + p.y) * 0.42 + uTime * 0.2) * 0.28;
  }
  void main() {
    vec3 p = position;
    float distanceToMass = length(p.xy - uGravityCenter);
    float gravityWell = 4.2 / (1.0 + distanceToMass * distanceToMass * 0.52);
    float orbitRipple = sin(distanceToMass * 3.4 - uTime * 0.72) * exp(-distanceToMass * 0.16) * 0.16;
    p.z += wave(p.xy) - gravityWell + orbitRipple;
    vLift = p.z;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

const terrainFragment = `
  varying float vLift;
  void main() {
    float alpha = 0.18 + smoothstep(-1.0, 1.0, vLift) * 0.42;
    gl_FragColor = vec4(0.25, 0.34, 0.16, alpha);
  }
`;

const terrain = new THREE.Mesh(
  new THREE.PlaneGeometry(28, 18, isMobile ? 42 : 88, isMobile ? 28 : 56),
  new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uGravityCenter: { value: new THREE.Vector2(isMobile ? 0.8 : 3.7, 0.0) }
    },
    vertexShader: terrainVertex,
    fragmentShader: terrainFragment,
    wireframe: true,
    transparent: true,
    depthWrite: false
  })
);
terrain.rotation.x = -Math.PI * 0.43;
terrain.position.set(0, -4.25, -1.4);
scene.add(terrain);

const starsGeometry = new THREE.BufferGeometry();
const starCount = isMobile ? 220 : 520;
const stars = new Float32Array(starCount * 3);
for (let i = 0; i < stars.length; i += 3) {
  stars[i] = (Math.random() - 0.5) * 26;
  stars[i + 1] = (Math.random() - 0.5) * 15;
  stars[i + 2] = -Math.random() * 12;
}
starsGeometry.setAttribute("position", new THREE.BufferAttribute(stars, 3));
scene.add(new THREE.Points(starsGeometry, new THREE.PointsMaterial({
  color: 0x667258,
  size: 0.018,
  transparent: true,
  opacity: 0.58
})));

function resize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

function onPointerMove(event) {
  pointerTarget.x = (event.clientX / window.innerWidth - 0.5) * 2;
  pointerTarget.y = (event.clientY / window.innerHeight - 0.5) * 2;
  if (heroInView && !event.target.closest("a, button, dialog")) {
    document.body.style.cursor = findPersonAt(event.clientX, event.clientY) !== null ? "pointer" : "";
  }
}

function render() {
  const time = clock.getElapsedTime();
  pointer.lerp(pointerTarget, 0.035);

  if (!reduceMotion) {
    const floatCycle = Math.sin(time * 0.72);
    globeGroup.position.x = globeBasePosition.x + Math.sin(time * 0.38) * (isMobile ? 0.035 : 0.06);
    globeGroup.position.y = globeBasePosition.y + floatCycle * (isMobile ? 0.1 : 0.16);
    globeGroup.rotation.z = Math.sin(time * 0.44) * 0.018;
    globeShadow.material.opacity = 0.075 + (1 - (floatCycle + 1) * 0.5) * 0.055;
    globeShadow.scale.x = 0.94 + (floatCycle + 1) * 0.035;
    globeGroup.rotation.y = time * 0.075 + pointer.x * 0.12;
    globeGroup.rotation.x = -0.13 + pointer.y * 0.055;
    shell.rotation.y = -time * 0.035;
    terrain.material.uniforms.uTime.value = time;
    globeMaterial.uniforms.uTime.value = time;
    codeTexture.offset.x = (time * 0.018) % 1;
    codeTexture.offset.y = (time * 0.004) % 1;
    codeGlobe.rotation.y = -time * 0.028;
    codeGlobeCounter.rotation.y = time * 0.041;
    codeGlobeCounter.rotation.x = 0.18 + Math.sin(time * 0.25) * 0.08;
    personTexture.offset.x = (time * 0.012) % 1;
    personTexture.offset.y = (time * 0.018) % 1;
    personGlobe.rotation.y = -time * 0.028;
    dataParticles.rotation.y = time * 0.21;
    gravityArcs.forEach((arc, index) => {
      arc.rotation.y += (index % 2 === 0 ? 1 : -1) * 0.0007;
      arc.rotation.z += (index % 2 === 0 ? -1 : 1) * 0.00025;
    });
    pulseRings.forEach((pulse) => {
      const cycle = (time * 0.22 + pulse.userData.phase) % 1;
      pulse.scale.setScalar(0.84 + cycle * 0.62);
      pulse.material.opacity = (1 - cycle) * 0.28;
    });
    camera.position.x += (pointer.x * 0.22 - camera.position.x) * 0.025;
    camera.position.y += (0.8 - pointer.y * 0.12 - camera.position.y) * 0.025;
  }

  renderer.render(scene, camera);
  requestAnimationFrame(render);
}

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) entry.target.classList.add("visible");
  });
}, { threshold: 0.25 });

document.querySelectorAll(".reveal").forEach((element) => observer.observe(element));

window.addEventListener("resize", resize, { passive: true });
window.addEventListener("pointermove", onPointerMove, { passive: true });

resize();
render();

window.addEventListener("load", () => {
  window.setTimeout(() => document.querySelector(".boot")?.classList.add("done"), 450);
}, { once: true });
