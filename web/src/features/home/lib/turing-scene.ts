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
export type TuringSceneReady = {
  partCount: number
  renderer: 'webgl' | 'software-3d'
}

export type TuringScenePart = {
  name: string
  kind: 'shell' | 'drums' | 'hardware' | 'human'
  count: number
}

export type TuringSceneFrame = TuringSceneReady & {
  progress: number
  state: {
    p: number
    approach: number
    shell: number
    drums: number
    hardware: number
    chapter: number
  }
}

export type TuringSceneController = {
  setScrollProgress: (progress: number) => void
  setReducedMotion: (reduced: boolean) => void
  setPaused: (paused: boolean) => void
  clearSelection: () => void
  dispose: () => void
}

export type TuringSceneModule = {
  createAssemblyScene: (options: {
    canvas: HTMLCanvasElement
    softwareCanvas: HTMLCanvasElement
    viewport: HTMLElement
    progress: number
    reducedMotion: boolean
    paused: boolean
    onReady: (info: TuringSceneReady) => void
    onSelect: (part: TuringScenePart | null) => void
    onFrame: (frame: TuringSceneFrame) => void
    onError: (error: Error) => void
  }) => TuringSceneController
}

/** Kept outside the application bundle; downloaded only on the default Home. */
export async function loadTuringScene(): Promise<TuringSceneModule> {
  const moduleUrl = '/hema-home/turing/assembly-scene.js'
  return import(
    /* webpackIgnore: true */ moduleUrl
  ) as Promise<TuringSceneModule>
}
