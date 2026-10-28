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
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import type {
  TuringSceneController,
  TuringSceneFrame,
  TuringSceneModule,
} from '../lib/turing-scene'

// Exercise the real scene, geometry, camera and CPU rasterizer. Only browser
// canvas/visibility/scheduling APIs are controlled by the test environment.
const sceneUrl = pathToFileURL(
  resolve(process.cwd(), 'public/hema-home/turing/assembly-scene.js')
).href
const sceneModule = (await import(
  /* @vite-ignore */ sceneUrl
)) as TuringSceneModule
const modelUrl = pathToFileURL(
  resolve(process.cwd(), 'public/hema-home/turing/assembly-model.js')
).href
const threeUrl = pathToFileURL(
  resolve(process.cwd(), 'public/hema-home/turing/vendor/three.module.js')
).href
const motionUrl = pathToFileURL(
  resolve(process.cwd(), 'public/hema-home/turing/assembly-motion.js')
).href
const modelModule = (await import(/* @vite-ignore */ modelUrl)) as {
  buildAssembly: (
    scene: unknown,
    options: { low: boolean }
  ) => {
    parts: {
      o: {
        position: { toArray: () => number[] }
        quaternion: { toArray: () => number[] }
      }
    }[]
    rotors: unknown[]
    update: (state: TuringSceneFrame['state'], time: number) => void
    dispose: () => void
  }
}
const threeModule = (await import(/* @vite-ignore */ threeUrl)) as {
  Scene: new () => unknown
}
const motionModule = (await import(/* @vite-ignore */ motionUrl)) as {
  assemblyState: (progress: number) => TuringSceneFrame['state']
}
let scene: TuringSceneController | undefined
let visibilityCallback: IntersectionObserverCallback
let frames: Map<number, FrameRequestCallback>
let nextFrame: number
let disconnect = vi.fn<() => void>()
let failRender = false

function drawFrame(timestamp = 1000) {
  const queued = [...frames.entries()]
  for (const [id, callback] of queued) {
    frames.delete(id)
    callback(timestamp)
  }
}

function createScene(
  options: Partial<Parameters<TuringSceneModule['createAssemblyScene']>[0]> = {}
) {
  const viewport = document.createElement('div')
  const canvas = document.createElement('canvas')
  const softwareCanvas = document.createElement('canvas')
  viewport.append(canvas, softwareCanvas)
  document.body.append(viewport)
  vi.spyOn(viewport, 'getBoundingClientRect').mockReturnValue({
    width: 32,
    height: 24,
    x: 0,
    y: 0,
    left: 0,
    top: 0,
    right: 32,
    bottom: 24,
    toJSON: () => ({}),
  })
  scene = sceneModule.createAssemblyScene({
    canvas,
    softwareCanvas,
    viewport,
    progress: 0,
    paused: false,
    reducedMotion: false,
    onReady: vi.fn(),
    onSelect: vi.fn(),
    onFrame: vi.fn(),
    onError: vi.fn(),
    ...options,
  })
  return { canvas, softwareCanvas, viewport, scene }
}

describe('Turing scene browser lifecycle', () => {
  beforeEach(() => {
    frames = new Map()
    nextFrame = 0
    disconnect = vi.fn<() => void>()
    failRender = false
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      frames.set(++nextFrame, callback)
      return nextFrame
    })
    vi.stubGlobal('cancelAnimationFrame', (id: number) => {
      frames.delete(id)
    })
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(callback: IntersectionObserverCallback) {
          visibilityCallback = callback
        }
        observe() {}
        disconnect() {
          disconnect()
        }
      }
    )
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(false)
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
      (kind: string) => {
        if (kind !== '2d') return null
        return new Proxy(
          {
            putImageData: () => {
              if (failRender) throw new Error('Canvas rendering unavailable')
            },
            createImageData: (width: number, height: number) => ({
              data: new Uint8ClampedArray(width * height * 4),
            }),
            getImageData: (
              _x: number,
              _y: number,
              width: number,
              height: number
            ) => ({
              data: new Uint8ClampedArray(width * height * 4).fill(255),
            }),
          },
          {
            get: (target, key) =>
              key in target ? Reflect.get(target, key) : () => {},
          }
        ) as unknown as CanvasRenderingContext2D
      }
    )
  })

  afterEach(() => {
    scene?.dispose()
    scene = undefined
    document.body.replaceChildren()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  test('WebGL failure uses the separate software canvas and leaves React-owned nodes intact', () => {
    const onReady = vi.fn()
    const onFrame = vi.fn()
    const mounted = createScene({ onReady, onFrame, reducedMotion: true })
    expect(mounted.viewport.children[0]).toBe(mounted.canvas)
    expect(mounted.viewport.children[1]).toBe(mounted.softwareCanvas)
    expect(onReady).toHaveBeenCalledWith({
      partCount: 1514,
      renderer: 'software-3d',
    })
    drawFrame()
    expect(onFrame).toHaveBeenLastCalledWith(
      expect.objectContaining({ progress: 0, renderer: 'software-3d' })
    )
  })

  test('offscreen scenes cancel frames and resume only when visible', () => {
    createScene()
    expect(frames.size).toBe(1)
    visibilityCallback(
      [{ isIntersecting: false } as IntersectionObserverEntry],
      {} as IntersectionObserver
    )
    expect(frames.size).toBe(0)
    visibilityCallback(
      [{ isIntersecting: true } as IntersectionObserverEntry],
      {} as IntersectionObserver
    )
    expect(frames.size).toBe(1)
  })

  test('paused scenes render a manual scroll once without restarting idle animation', () => {
    const onFrame = vi.fn()
    const mounted = createScene({ paused: true, onFrame })
    drawFrame()
    expect(frames.size).toBe(0)
    mounted.scene.setScrollProgress(1)
    drawFrame(1200)
    expect(onFrame).toHaveBeenLastCalledWith(
      expect.objectContaining({
        progress: 1,
        state: expect.objectContaining({ hardware: 1, drums: 1, shell: 1 }),
      })
    )
    expect(frames.size).toBe(0)
    mounted.scene.setScrollProgress(0)
    drawFrame(1400)
    expect(onFrame).toHaveBeenLastCalledWith(
      expect.objectContaining({
        progress: 0,
        state: expect.objectContaining({ hardware: 0, drums: 0, shell: 0 }),
      })
    )
  })

  test('route removal cancels rendering, disconnects observers and removes keyboard listeners', () => {
    const onSelect = vi.fn()
    const mounted = createScene({ onSelect })
    mounted.softwareCanvas.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape' })
    )
    expect(onSelect).toHaveBeenCalledWith(null)
    onSelect.mockClear()
    mounted.scene.dispose()
    expect(frames.size).toBe(0)
    expect(disconnect).toHaveBeenCalledOnce()
    mounted.softwareCanvas.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape' })
    )
    expect(onSelect).not.toHaveBeenCalled()
    document.dispatchEvent(new Event('visibilitychange'))
    expect(frames.size).toBe(0)
  })

  test('a graphics failure releases the scene and reports the usable Home fallback', () => {
    const onError = vi.fn()
    createScene({ onError })
    failRender = true
    drawFrame()
    expect(onError).toHaveBeenCalledWith(
      new Error('Canvas rendering unavailable')
    )
    expect(frames.size).toBe(0)
    expect(disconnect).toHaveBeenCalledOnce()
    document.dispatchEvent(new Event('visibilitychange'))
    expect(frames.size).toBe(0)
  })

  test('all 1514 machine parts separate and return exactly to their assembled positions', () => {
    const model = modelModule.buildAssembly(new threeModule.Scene(), {
      low: true,
    })
    try {
      expect(model.rotors).toHaveLength(108)
      expect(model.parts).toHaveLength(1514)
      model.update(motionModule.assemblyState(0), 0)
      const assembled = model.parts.map((part) => ({
        position: part.o.position.toArray(),
        rotation: part.o.quaternion.toArray(),
      }))
      model.update(motionModule.assemblyState(1), 0)
      for (const [index, part] of model.parts.entries()) {
        expect(part.o.position.toArray()).not.toEqual(assembled[index].position)
      }
      model.update(motionModule.assemblyState(0), 0)
      expect(
        model.parts.map((part) => ({
          position: part.o.position.toArray(),
          rotation: part.o.quaternion.toArray(),
        }))
      ).toEqual(assembled)
    } finally {
      model.dispose()
    }
  })
})
