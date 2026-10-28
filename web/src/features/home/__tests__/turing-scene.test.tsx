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
import { act, render, screen } from '@testing-library/react'
import { StrictMode, createRef } from 'react'
import { beforeEach, describe, expect, test, vi } from 'vitest'

import { TuringScene, type TuringSceneHandle } from '../components/turing-scene'
import { loadTuringScene, type TuringSceneModule } from '../lib/turing-scene'

// The asynchronously downloaded renderer is a browser/network boundary.
vi.mock('../lib/turing-scene', () => ({ loadTuringScene: vi.fn() }))

const controller = {
  setScrollProgress: vi.fn(),
  setReducedMotion: vi.fn(),
  setPaused: vi.fn(),
  clearSelection: vi.fn(),
  dispose: vi.fn(),
}

describe('Turing scene React ownership', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('software fallback keeps both React canvases and exposes only the active one', async () => {
    let complete!: (module: TuringSceneModule) => void
    vi.mocked(loadTuringScene).mockReturnValue(
      new Promise((resolve) => {
        complete = resolve
      })
    )
    const rendered = render(
      <TuringScene
        progress={0}
        paused={false}
        reducedMotion={false}
        ariaLabel='Machine scene'
      />
    )
    const canvases = screen.getAllByLabelText('Machine scene')
    expect(canvases).toHaveLength(2)
    expect(canvases[0]).toBeVisible()
    expect(canvases[1]).not.toBeVisible()

    await act(async () => {
      complete({
        createAssemblyScene: (options) => {
          expect(options.canvas).toBe(canvases[0])
          expect(options.softwareCanvas).toBe(canvases[1])
          options.onReady({ partCount: 1514, renderer: 'software-3d' })
          return controller
        },
      })
    })
    expect(screen.getAllByLabelText('Machine scene')).toEqual(canvases)
    expect(canvases[0]).not.toBeVisible()
    expect(canvases[1]).toBeVisible()
    rendered.unmount()
    expect(controller.dispose).toHaveBeenCalledOnce()
  })

  test('leaving the route before the renderer downloads never mounts a late scene', async () => {
    let complete!: (module: TuringSceneModule) => void
    vi.mocked(loadTuringScene).mockReturnValue(
      new Promise((resolve) => {
        complete = resolve
      })
    )
    const factory = vi.fn()
    const rendered = render(
      <TuringScene progress={0} paused={false} reducedMotion={false} />
    )
    rendered.unmount()
    await act(async () => {
      complete({ createAssemblyScene: factory })
    })
    expect(factory).not.toHaveBeenCalled()
  })

  test('StrictMode creates one live renderer and route removal disposes it', async () => {
    const factory = vi.fn(() => controller)
    vi.mocked(loadTuringScene).mockResolvedValue({
      createAssemblyScene: factory,
    })
    const rendered = render(
      <StrictMode>
        <TuringScene progress={0} paused={false} reducedMotion={false} />
      </StrictMode>
    )
    await act(async () => {})
    expect(factory).toHaveBeenCalledOnce()
    rendered.unmount()
    expect(controller.dispose).toHaveBeenCalledOnce()
  })

  test('scroll and motion controls update the live scene without rebuilding it', async () => {
    const factory = vi.fn(() => controller)
    vi.mocked(loadTuringScene).mockResolvedValue({
      createAssemblyScene: factory,
    })
    const ref = createRef<TuringSceneHandle>()
    const rendered = render(
      <TuringScene
        ref={ref}
        progress={0}
        paused={false}
        reducedMotion={false}
      />
    )
    await act(async () => {})
    rendered.rerender(
      <TuringScene ref={ref} progress={0.75} paused reducedMotion />
    )
    expect(factory).toHaveBeenCalledOnce()
    expect(controller.setScrollProgress).toHaveBeenLastCalledWith(0.75)
    expect(controller.setReducedMotion).toHaveBeenLastCalledWith(true)
    expect(controller.setPaused).toHaveBeenLastCalledWith(true)
    ref.current?.clearSelection()
    expect(controller.clearSelection).toHaveBeenCalledOnce()
    rendered.unmount()
  })

  test('renderer download failure is handed to the Home fallback', async () => {
    const failure = new Error('Renderer unavailable')
    vi.mocked(loadTuringScene).mockRejectedValue(failure)
    const onError = vi.fn()
    const rendered = render(
      <TuringScene
        progress={0}
        paused={false}
        reducedMotion={false}
        onError={onError}
      />
    )
    await act(async () => {})
    expect(onError).toHaveBeenCalledWith(failure)
    rendered.unmount()
  })
})
