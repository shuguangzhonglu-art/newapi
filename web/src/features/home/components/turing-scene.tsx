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
import {
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type Ref,
} from 'react'
import { useTranslation } from 'react-i18next'

import {
  loadTuringScene,
  type TuringSceneController,
  type TuringSceneFrame,
  type TuringScenePart,
  type TuringSceneReady,
} from '../lib/turing-scene'

export type {
  TuringSceneFrame,
  TuringScenePart,
  TuringSceneReady,
} from '../lib/turing-scene'

export type TuringSceneHandle = { clearSelection: () => void }

export type TuringSceneProps = {
  progress: number
  reducedMotion: boolean
  paused: boolean
  ariaLabel?: string
  onReady?: (info: TuringSceneReady) => void
  onSelect?: (part: TuringScenePart | null) => void
  onFrame?: (frame: TuringSceneFrame) => void
  onError?: (error: Error) => void
  ref?: Ref<TuringSceneHandle>
}

export function TuringScene(props: TuringSceneProps) {
  const { t } = useTranslation()
  const viewportRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const softwareCanvasRef = useRef<HTMLCanvasElement>(null)
  const controllerRef = useRef<TuringSceneController | null>(null)
  const latestProps = useRef(props)
  const [renderer, setRenderer] =
    useState<TuringSceneReady['renderer']>('webgl')
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    latestProps.current = props
  })

  useImperativeHandle(
    props.ref,
    () => ({
      clearSelection: () => controllerRef.current?.clearSelection(),
    }),
    []
  )

  useEffect(() => {
    let cancelled = false
    const canvas = canvasRef.current
    const softwareCanvas = softwareCanvasRef.current
    const viewport = viewportRef.current
    if (!canvas || !softwareCanvas || !viewport) return

    void loadTuringScene()
      .then((module) => {
        if (cancelled) return
        const current = latestProps.current
        controllerRef.current = module.createAssemblyScene({
          canvas,
          softwareCanvas,
          viewport,
          progress: current.progress,
          reducedMotion: current.reducedMotion,
          paused: current.paused,
          onReady: (info) => {
            if (cancelled) return
            setRenderer(info.renderer)
            setLoading(false)
            latestProps.current.onReady?.(info)
          },
          onSelect: (part) => {
            if (!cancelled) latestProps.current.onSelect?.(part)
          },
          onFrame: (frame) => {
            if (!cancelled) latestProps.current.onFrame?.(frame)
          },
          onError: (error) => {
            if (!cancelled) {
              setLoading(false)
              latestProps.current.onError?.(error)
            }
          },
        })
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setLoading(false)
          latestProps.current.onError?.(
            error instanceof Error
              ? error
              : new Error('The 3D scene could not load.')
          )
        }
      })

    return () => {
      cancelled = true
      controllerRef.current?.dispose()
      controllerRef.current = null
    }
  }, [])

  useEffect(() => {
    controllerRef.current?.setScrollProgress(props.progress)
  }, [props.progress])
  useEffect(() => {
    controllerRef.current?.setReducedMotion(props.reducedMotion)
  }, [props.reducedMotion])
  useEffect(() => {
    controllerRef.current?.setPaused(props.paused)
  }, [props.paused])

  const label = props.ariaLabel ?? t('Interactive Turing machine')
  return (
    <div
      ref={viewportRef}
      className='hema-turing-scene'
      data-renderer={renderer}
      aria-busy={loading}
    >
      <canvas
        ref={canvasRef}
        className='hema-turing-scene-canvas'
        hidden={renderer !== 'webgl'}
        tabIndex={0}
        aria-label={label}
      />
      <canvas
        ref={softwareCanvasRef}
        className='hema-turing-scene-canvas'
        hidden={renderer !== 'software-3d'}
        tabIndex={0}
        aria-label={label}
      />
    </div>
  )
}
