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
import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, test, vi } from 'vitest'

import { Home } from '../index'
import type { TuringSceneModule } from '../lib/turing-scene'

const homeContentState = vi.hoisted(() => ({
  current: {
    content: '',
    isLoaded: true as boolean,
    isUrl: false as boolean,
  },
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    i18n: { language: 'zh' },
    t: (key: string) => key,
  }),
}))

vi.mock('@/components/layout', () => ({
  PublicLayout: (props: { children: ReactNode }) => (
    <div data-testid='public-layout'>{props.children}</div>
  ),
}))

vi.mock('@/components/rich-content', () => ({
  RichContent: (props: { content: string }) => <div>{props.content}</div>,
}))

vi.mock('@/context/theme-provider', () => ({
  useTheme: () => ({ resolvedTheme: 'light' }),
}))

vi.mock('../hooks', () => ({
  useHomePageContent: () => homeContentState.current,
}))

vi.mock('../lib/turing-scene', () => ({
  loadTuringScene: async (): Promise<TuringSceneModule> => ({
    createAssemblyScene: (options) => {
      options.onReady({ partCount: 1514, renderer: 'webgl' })
      return {
        setScrollProgress: vi.fn(),
        setReducedMotion: vi.fn(),
        setPaused: vi.fn(),
        clearSelection: vi.fn(),
        dispose: vi.fn(),
      }
    },
  }),
}))

async function renderNativeHome() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  queryClient.setQueryData(['status'], {
    HeaderNavModules: { pricing: { enabled: true, requireAuth: false } },
  })
  queryClient.setQueryData(['pricing'], {
    success: true,
    data: [],
    vendors: [],
    group_ratio: {},
    usable_group: {},
  })
  const root = createRootRoute()
  const home = createRoute({
    getParentRoute: () => root,
    path: '/',
    component: Home,
  })
  const router = createRouter({
    routeTree: root.addChildren([home]),
    history: createMemoryHistory({ initialEntries: ['/'] }),
    defaultPendingMinMs: 0,
  })
  await router.load()
  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
}

describe('Home Hema adapter', () => {
  beforeEach(() => {
    vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined)
    homeContentState.current = {
      content: '',
      isLoaded: true,
      isUrl: false,
    }
  })

  test('renders the native Turing home with shared navigation when no custom content is configured', async () => {
    const rendered = await renderNativeHome()

    await screen.findByRole('main')
    expect(screen.getByTestId('public-layout')).toBeVisible()
    expect(rendered.container.querySelector('iframe')).not.toBeInTheDocument()
    expect(
      await screen.findByRole('link', { name: 'Explore models' })
    ).toHaveAttribute('href', '/pricing')
  })

  test('uses the Hema loading state while home settings are unresolved', () => {
    homeContentState.current = {
      content: '',
      isLoaded: false,
      isUrl: false,
    }

    const rendered = render(<Home />)

    expect(rendered.container.firstElementChild).toHaveClass(
      'hema-home-loading'
    )
    expect(screen.getByLabelText('Loading...')).toBeVisible()
    expect(screen.queryByTitle('Home')).not.toBeInTheDocument()
  })

  test('keeps administrator-configured home content ahead of the Hema fallback', () => {
    homeContentState.current = {
      content: 'Configured home content',
      isLoaded: true,
      isUrl: false,
    }

    render(<Home />)

    expect(screen.getByText('Configured home content')).toBeVisible()
    expect(screen.getByTestId('public-layout')).toBeVisible()
    expect(screen.queryByTitle('Home')).not.toBeInTheDocument()
  })

  test('keeps an administrator-configured external homepage in its existing isolated frame', () => {
    homeContentState.current = {
      content: 'https://home.example.com/welcome',
      isLoaded: true,
      isUrl: true,
    }

    const rendered = render(<Home />)

    expect(screen.getByTitle('Custom Home Page')).toHaveAttribute(
      'src',
      'https://home.example.com/welcome'
    )
    expect(
      screen.getByTitle('Custom Home Page').getAttribute('sandbox')
    ).not.toContain('allow-same-origin')
    expect(rendered.container.querySelector('canvas')).not.toBeInTheDocument()
  })

  test('preserves configured HTML rather than mounting the default scene', () => {
    homeContentState.current = {
      content: '<h1>Configured homepage</h1>',
      isLoaded: true,
      isUrl: false,
    }

    const rendered = render(<Home />)

    expect(screen.getByText('<h1>Configured homepage</h1>')).toBeVisible()
    expect(rendered.container.querySelector('canvas')).not.toBeInTheDocument()
  })
})
