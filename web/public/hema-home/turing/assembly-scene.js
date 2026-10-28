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
import * as THREE from './vendor/three.module.js'
import { buildAssembly } from './assembly-model.js'
import { assemblyView, clamp } from './assembly-motion.js'
import { Software3DRenderer } from './software-3d.js'

/** Both canvases belong to React. A failed WebGL context must never replace one. */
export function createAssemblyScene(options) {
  const { canvas, softwareCanvas, viewport } = options
  const onReady = options.onReady ?? (() => {})
  const onFrame = options.onFrame ?? (() => {})
  const onSelect = options.onSelect ?? (() => {})
  const onError = options.onError ?? (() => {})
  let renderer
  let model
  let environment
  let software = false
  let drawCanvas = canvas
  let webglContext
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x101c14)
  scene.fog = new THREE.FogExp2(0x17241d, 0.009)
  const camera = new THREE.PerspectiveCamera(44, 1, 0.2, 150)

  const releaseResources = () => {
    if (model) model.dispose()
    else {
      const resources = new Set()
      scene.traverse((object) => {
        if (object.geometry) resources.add(object.geometry)
        const materials = Array.isArray(object.material) ? object.material : [object.material]
        for (const material of materials) {
          if (!material) continue
          resources.add(material)
          for (const value of Object.values(material)) {
            if (value?.isTexture) resources.add(value)
          }
        }
      })
      for (const resource of resources) resource.dispose()
    }
    // Lights own render targets that are not part of mesh/material traversal.
    scene.traverse((object) => {
      object.shadow?.dispose()
      if (object.isInstancedMesh) object.dispose()
    })
    environment?.dispose()
    renderer?.dispose()
    if (!software) renderer?.forceContextLoss?.()
    scene.clear()
  }

  try {
    try {
      webglContext = canvas.getContext('webgl2', {
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
      })
      if (!webglContext) throw new Error('WebGL is unavailable.')
      renderer = new THREE.WebGLRenderer({
        canvas,
        context: webglContext,
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
      })
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6))
      renderer.outputColorSpace = THREE.SRGBColorSpace
      renderer.toneMapping = THREE.ACESFilmicToneMapping
      renderer.toneMappingExposure = 1.1
      renderer.shadowMap.enabled = true
      renderer.shadowMap.type = THREE.PCFSoftShadowMap
      renderer.shadowMap.autoUpdate = false
      renderer.shadowMap.needsUpdate = true
    } catch {
      renderer?.dispose()
      webglContext?.getExtension('WEBGL_lose_context')?.loseContext()
      renderer = undefined
      software = true
      drawCanvas = softwareCanvas
      renderer = new Software3DRenderer(softwareCanvas)
    }
    model = buildAssembly(scene, { low: software })
    if (!software) {
      const generator = new THREE.PMREMGenerator(renderer)
      try {
        environment = generator.fromScene(model.envScene, 0.08)
        scene.environment = environment.texture
      } finally {
        generator.dispose()
      }
    }
  } catch (error) {
    releaseResources()
    throw error
  }

  const info = {
    partCount: model.parts.length,
    renderer: software ? 'software-3d' : 'webgl',
  }
  let targetProgress = clamp(options.progress ?? 0)
  let progress = targetProgress
  let reduced = options.reducedMotion ?? false
  let paused = options.paused ?? false
  let time = 0
  let raf = 0
  let last = 0
  let lastRender = 0
  let lastShadowProgress = -1
  let active = true
  let disposed = false
  let dirty = true
  let selected = null
  let originalMaterial = null
  let inspection = 0
  let selectionProgress = 0
  let inspectionDistance = 3
  let down
  const inspectionPoint = new THREE.Vector3()
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 }
  const ray = new THREE.Raycaster()
  const uv = new THREE.Vector2()

  function stopFrames() {
    cancelAnimationFrame(raf)
    raf = 0
    last = 0
  }

  function requestRender() {
    dirty = true
    if (!raf && active && !document.hidden && !disposed) {
      raf = requestAnimationFrame(animate)
    }
  }

  function clearSelection(notify = true) {
    if (selected && originalMaterial) {
      selected.material.dispose()
      selected.material = originalMaterial
      if (selected.userData.batched) selected.visible = false
    }
    selected = null
    originalMaterial = null
    model.select(null)
    if (notify && !disposed) onSelect(null)
    requestRender()
  }

  function choose(event) {
    if (!down || Math.hypot(event.clientX - down.x, event.clientY - down.y) > 7) {
      down = undefined
      return
    }
    down = undefined
    const bounds = drawCanvas.getBoundingClientRect()
    if (!bounds.width || !bounds.height) return
    uv.set(
      ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
      -((event.clientY - bounds.top) / bounds.height) * 2 + 1
    )
    ray.setFromCamera(uv, camera)
    const hit = ray.intersectObjects(model.pickables, false)[0]
    clearSelection()
    if (!hit) return
    selected = hit.object.userData.sourceParts?.[hit.instanceId]?.o ?? hit.object
    originalMaterial = selected.material
    selected.visible = true
    selectionProgress = targetProgress
    selected.material = originalMaterial.clone()
    selected.material.emissive = new THREE.Color(0x8c7338)
    selected.material.emissiveIntensity = 0.65
    selected.material.polygonOffset = true
    selected.material.polygonOffsetFactor = -2
    selected.material.polygonOffsetUnits = -2
    model.select(selected.userData.part)
    const objectBounds = new THREE.Box3().setFromObject(
      selected.userData.kind === 'human' ? model.turing : selected
    )
    objectBounds.getCenter(inspectionPoint)
    const size = objectBounds.getSize(new THREE.Vector3())
    inspectionDistance = Math.max(
      2.2,
      size.y * 1.6,
      (size.x * 1.5) / camera.aspect,
      size.z * 1.6
    )
    onSelect({
      name: selected.userData.name,
      kind: selected.userData.kind,
      count: model.parts.length,
    })
    requestRender()
  }

  function pointerDown(event) {
    if (event.button === 0 || event.pointerType === 'touch') {
      down = { x: event.clientX, y: event.clientY }
      drawCanvas.focus({ preventScroll: true })
    }
  }

  function pointerMove(event) {
    if (event.pointerType === 'touch' || reduced || paused) return
    const bounds = drawCanvas.getBoundingClientRect()
    pointer.tx = clamp((event.clientX - bounds.left) / bounds.width, -1, 2) - 0.5
    pointer.ty = clamp((event.clientY - bounds.top) / bounds.height, -1, 2) - 0.5
    requestRender()
  }

  function pointerLeave() {
    pointer.tx = 0
    pointer.ty = 0
    down = undefined
    requestRender()
  }

  function keyDown(event) {
    if (event.key === 'Escape') clearSelection()
    if (event.key === 'Enter') {
      const bounds = drawCanvas.getBoundingClientRect()
      const center = { clientX: bounds.left + bounds.width / 2, clientY: bounds.top + bounds.height / 2 }
      down = { x: center.clientX, y: center.clientY }
      choose(center)
    }
  }

  function contextLost(event) {
    event.preventDefault()
    dispose()
    onError(new Error('The 3D graphics context was lost.'))
  }

  function frameCamera() {
    const view = assemblyView(camera.aspect, progress)
    camera.position.copy(view.position)
    if (!reduced && !paused) {
      camera.position.x += pointer.x * 0.28
      camera.position.y -= pointer.y * 0.15
    }
    camera.fov = view.fov
    camera.filmOffset = view.filmOffset
    const look = view.target.clone()
    if (inspection > 0.001) {
      const direction = camera.position.clone().sub(view.target).normalize()
      const focusPosition = inspectionPoint.clone().addScaledVector(direction, inspectionDistance)
      camera.position.lerp(focusPosition, inspection)
      look.lerp(inspectionPoint, inspection)
      camera.filmOffset *= 1 - inspection
      camera.fov = THREE.MathUtils.lerp(view.fov, 38, inspection)
    }
    camera.lookAt(look)
    camera.updateProjectionMatrix()
    model.update(view.state, time)
    if (!software && Math.abs(lastShadowProgress - progress) > 0.004) {
      renderer.shadowMap.needsUpdate = true
      lastShadowProgress = progress
    }
    onFrame({ progress, state: view.state, ...info })
  }

  function resize() {
    if (disposed) return
    const bounds = viewport.getBoundingClientRect()
    const width = Math.max(1, bounds.width)
    const height = Math.max(1, bounds.height)
    if (software) {
      const ratio = Math.min(1, 1100 / width, 850 / height)
      renderer.setSize(width * ratio, height * ratio)
    } else {
      renderer.setSize(width, height, false)
    }
    camera.aspect = width / height
    requestRender()
  }

  function animate(now) {
    raf = 0
    if (disposed || !active || document.hidden) return
    if (software && lastRender && now - lastRender < 100) {
      raf = requestAnimationFrame(animate)
      return
    }
    const dt = Math.min(0.1, (now - last) / 1000 || 0.016)
    last = now
    lastRender = now
    const idle = !reduced && !paused
    if (idle) time += dt
    const ease = idle ? 1 - Math.exp(-dt * 7) : 1
    progress += (targetProgress - progress) * ease
    if (Math.abs(progress - targetProgress) < 0.0001) progress = targetProgress
    const inspectionTarget = selected ? 1 : 0
    inspection += (inspectionTarget - inspection) * ease
    pointer.x += (pointer.tx - pointer.x) * ease
    pointer.y += (pointer.ty - pointer.y) * ease
    dirty = false
    try {
      frameCamera()
      renderer.render(scene, camera)
    } catch (error) {
      dispose()
      onError(error instanceof Error ? error : new Error('The 3D scene could not render.'))
      return
    }
    const settling = Math.abs(progress - targetProgress) > 0.0001 || Math.abs(inspection - inspectionTarget) > 0.001
    if (idle || settling || dirty) raf = requestAnimationFrame(animate)
  }

  function visibilityChanged() {
    if (document.hidden) stopFrames()
    else requestRender()
  }

  let observer
  let visibility
  function dispose() {
    if (disposed) return
    disposed = true
    stopFrames()
    observer?.disconnect()
    visibility?.disconnect()
    clearSelection(false)
    drawCanvas.removeEventListener('pointerdown', pointerDown)
    drawCanvas.removeEventListener('pointerup', choose)
    drawCanvas.removeEventListener('pointermove', pointerMove)
    drawCanvas.removeEventListener('pointerleave', pointerLeave)
    drawCanvas.removeEventListener('keydown', keyDown)
    drawCanvas.removeEventListener('webglcontextlost', contextLost)
    document.removeEventListener('visibilitychange', visibilityChanged)
    releaseResources()
  }

  try {
    observer = new ResizeObserver(resize)
    visibility = new IntersectionObserver((entries) => {
      active = entries[0]?.isIntersecting ?? false
      if (active) requestRender()
      else stopFrames()
    })
    drawCanvas.addEventListener('pointerdown', pointerDown)
    drawCanvas.addEventListener('pointerup', choose)
    drawCanvas.addEventListener('pointermove', pointerMove)
    drawCanvas.addEventListener('pointerleave', pointerLeave)
    drawCanvas.addEventListener('keydown', keyDown)
    drawCanvas.addEventListener('webglcontextlost', contextLost)
    document.addEventListener('visibilitychange', visibilityChanged)
    observer.observe(viewport)
    visibility.observe(viewport)
    resize()
    onReady(info)
  } catch (error) {
    dispose()
    throw error
  }

  return {
    setScrollProgress(value) {
      const next = clamp(value)
      if (selected && Math.abs(next - selectionProgress) > 0.008) clearSelection()
      targetProgress = next
      requestRender()
    },
    setReducedMotion(value) {
      reduced = value
      requestRender()
    },
    setPaused(value) {
      paused = value
      requestRender()
    },
    clearSelection,
    dispose,
  }
}
