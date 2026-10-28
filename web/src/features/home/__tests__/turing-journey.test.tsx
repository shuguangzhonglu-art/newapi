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
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import { api } from '@/lib/api'

import { TuringHero } from '../components/turing-hero'
import { loadTuringScene, type TuringSceneModule } from '../lib/turing-scene'

vi.mock('../lib/turing-scene', () => ({ loadTuringScene: vi.fn() }))
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    i18n: { language: 'en' },
    t: (key: string) => key,
  }),
}))

let reducedMotion = true
let selectComponent: (() => void) | undefined
const clients: QueryClient[] = []

const sceneModule: TuringSceneModule = {
  createAssemblyScene(options) {
    const draw = (progress: number) => {
      options.onFrame({
        partCount: 1514,
        renderer: 'webgl',
        progress,
        state: {
          p: progress,
          approach: 0,
          shell: 0,
          drums: 0,
          hardware: progress === 1 ? 1 : 0,
          chapter: progress === 1 ? 3 : 0,
        },
      })
    }
    selectComponent = () =>
      options.onSelect({ name: 'Rotor', kind: 'drums', count: 1514 })
    options.onReady({ partCount: 1514, renderer: 'webgl' })
    draw(options.progress)
    return {
      setScrollProgress: draw,
      setReducedMotion: () => undefined,
      setPaused: () => undefined,
      clearSelection: () => options.onSelect(null),
      dispose: () => {
        selectComponent = undefined
      },
    }
  },
}

async function renderHero(status: Record<string, unknown> | null = {}) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  clients.push(client)
  if (status) client.setQueryData(['status'], status)
  const root = createRootRoute()
  const route = createRoute({
    getParentRoute: () => root,
    path: '/',
    component: TuringHero,
  })
  const router = createRouter({
    routeTree: root.addChildren([route]),
    history: createMemoryHistory({ initialEntries: ['/'] }),
    defaultPendingMinMs: 0,
  })
  await router.load()
  const view = render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
  await waitFor(() =>
    expect(screen.queryByText('Building the machine…')).not.toBeInTheDocument()
  )
  return { ...view, client }
}

beforeEach(() => {
  reducedMotion = true
  localStorage.removeItem('status')
  vi.spyOn(api, 'get').mockResolvedValue({ data: { success: true, data: {} } })
  vi.mocked(loadTuringScene).mockResolvedValue(sceneModule)
  vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined)
  vi.spyOn(window, 'matchMedia').mockImplementation((query) => ({
    matches: query.includes('prefers-reduced-motion') && reducedMotion,
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  }))
})

afterEach(() => {
  clients.splice(0).forEach((client) => client.clear())
  vi.restoreAllMocks()
})

describe('Turing Home scroll experience', () => {
  test('hero entry links wait for status and follow catalog and console module settings', async () => {
    let resolveStatus:
      | ((value: {
          data: { success: boolean; data: Record<string, unknown> }
        }) => void)
      | undefined
    vi.mocked(api.get).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveStatus = resolve
        })
    )
    const view = await renderHero(null)
    expect(
      screen.queryByRole('link', { name: 'Explore models' })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: 'Start building' })
    ).not.toBeInTheDocument()
    await act(async () =>
      resolveStatus?.({
        data: {
          success: true,
          data: { HeaderNavModules: { pricing: false, console: false } },
        },
      })
    )
    expect(
      screen.queryByRole('link', { name: 'Explore models' })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: 'Start building' })
    ).not.toBeInTheDocument()

    act(() =>
      view.client.setQueryData(['status'], {
        HeaderNavModules: { pricing: true, console: false },
      })
    )
    expect(
      await screen.findByRole('link', { name: 'Explore models' })
    ).toHaveAttribute('href', '/pricing')
    expect(
      screen.queryByRole('link', { name: 'Start building' })
    ).not.toBeInTheDocument()
  })

  test('reduced motion lets keyboard users inspect the full assembly without moving the page', async () => {
    const user = userEvent.setup()
    await renderHero()
    expect(
      screen.getByRole('link', { name: 'Skip to models' })
    ).toHaveAttribute('href', '#home-models')
    expect(
      screen.getByRole('link', { name: 'Explore models' })
    ).toHaveAttribute('href', '/pricing')
    expect(
      screen.getByRole('button', { name: 'Pause animation' })
    ).toBeDisabled()
    vi.mocked(window.scrollTo).mockClear()

    const finalStage = screen.getByRole('button', {
      name: 'Explore every component',
    })
    finalStage.focus()
    await user.keyboard('{Enter}')

    expect(finalStage).toHaveAttribute('aria-current', 'step')
    expect(
      screen.getByText('Explore every component', { selector: 'p' })
    ).toBeVisible()
    expect(window.scrollTo).not.toHaveBeenCalled()
  })

  test('native scrolling reveals the final stage and scrolling back restores the machine introduction', async () => {
    reducedMotion = false
    const view = await renderHero()
    const journey = view.container.querySelector(
      '.hema-turing-journey'
    ) as HTMLElement
    const stage = view.container.querySelector(
      '.hema-turing-stage'
    ) as HTMLElement
    Object.defineProperty(journey, 'offsetHeight', {
      value: 3000,
      configurable: true,
    })
    Object.defineProperty(stage, 'offsetHeight', {
      value: 1000,
      configurable: true,
    })
    const bounds = vi.spyOn(journey, 'getBoundingClientRect')
    bounds.mockReturnValue(new DOMRect(0, -2000, 1000, 3000))

    const scroll = new Event('scroll', { cancelable: true })
    fireEvent(window, scroll)
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Explore every component' })
      ).toHaveAttribute('aria-current', 'step')
    )
    expect(scroll.defaultPrevented).toBe(false)

    bounds.mockReturnValue(new DOMRect(0, 0, 1000, 3000))
    fireEvent.scroll(window)
    await waitFor(() =>
      expect(screen.getByRole('link', { name: 'Explore models' })).toBeVisible()
    )
    expect(
      screen.getByRole('button', { name: 'The complete machine' })
    ).toHaveAttribute('aria-current', 'step')
  })

  test('pausing and closing a selected part stay within the same scene', async () => {
    reducedMotion = false
    const user = userEvent.setup()
    await renderHero()
    await user.click(screen.getByRole('button', { name: 'Pause animation' }))
    expect(
      screen.getByRole('button', { name: 'Resume animation' })
    ).toHaveAttribute('aria-pressed', 'true')

    act(() => selectComponent?.())
    expect(
      screen.getByRole('heading', { name: 'Rotor assembly' })
    ).toBeVisible()
    screen.getByRole('button', { name: 'Close component details' }).focus()
    await user.keyboard('{Escape}')
    expect(
      screen.queryByRole('heading', { name: 'Rotor assembly' })
    ).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Explore models' })).toBeVisible()
  })

  test('a scene load failure keeps the catalog available and can be retried', async () => {
    vi.mocked(loadTuringScene).mockRejectedValueOnce(
      new Error('Asset unavailable')
    )
    const user = userEvent.setup()
    await renderHero()
    expect(
      screen.getByText(
        'The 3D scene could not load. You can still explore the models.'
      )
    ).toBeVisible()
    expect(
      screen.getByRole('link', { name: 'Explore models' })
    ).toHaveAttribute('href', '/pricing')
    await user.click(screen.getByRole('button', { name: 'Retry' }))
    await waitFor(() =>
      expect(
        screen.queryByText(
          'The 3D scene could not load. You can still explore the models.'
        )
      ).not.toBeInTheDocument()
    )
    expect(
      screen.getByRole('button', { name: 'The complete machine' })
    ).toHaveAttribute('aria-current', 'step')
  })
})
