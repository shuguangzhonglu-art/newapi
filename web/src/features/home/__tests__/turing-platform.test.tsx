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
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/auth-store'

import { TuringPlatform } from '../components/turing-platform'

// Canvas chart rendering is a browser boundary, outside the price-drawer flow.
vi.mock('@visactor/react-vchart', () => ({ VChart: () => null }))

const catalogResponse = {
  success: true,
  data: [
    {
      id: 1,
      model_name: 'private-chat',
      quota_type: 0,
      model_ratio: 1,
      completion_ratio: 4,
      enable_groups: ['private'],
      supported_endpoint_types: ['openai'],
    },
    {
      id: 2,
      model_name: 'image-model',
      quota_type: 1,
      model_ratio: 1,
      completion_ratio: 4,
      model_price: 0.2,
      enable_groups: ['default'],
      supported_endpoint_types: ['image-generation'],
    },
    {
      id: 3,
      model_name: 'chat/alpha',
      quota_type: 0,
      model_ratio: 1,
      completion_ratio: 4,
      enable_groups: ['all'],
      supported_endpoint_types: ['openai'],
      vendor_id: 1,
    },
    {
      id: 4,
      model_name: 'anthropic-model',
      quota_type: 0,
      model_ratio: 2,
      completion_ratio: 5,
      enable_groups: ['default'],
      supported_endpoint_types: ['anthropic'],
    },
  ],
  vendors: [{ id: 1, name: 'Configured provider' }],
  group_ratio: { default: 0.8 },
  usable_group: { default: 'Standard access' },
  supported_endpoint: {
    openai: { method: 'POST', path: '/v1/chat/completions' },
  },
  auto_groups: [],
}
const status = {
  HeaderNavModules: JSON.stringify({
    pricing: { enabled: true, requireAuth: false },
    docs: true,
  }),
  docs_link: 'https://docs.example.com/guide',
  server_address: 'https://service.example/custom/v1/',
  price: 1,
  usd_exchange_rate: 1,
}
const clients: QueryClient[] = []
const clipboardDescriptor = Object.getOwnPropertyDescriptor(
  navigator,
  'clipboard'
)

async function renderPlatform(
  options: {
    status?: Record<string, unknown> | null
    cachedPricing?: typeof catalogResponse
  } = {}
) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  clients.push(client)
  if (options.status !== null) {
    client.setQueryData(['status'], options.status ?? status)
  }
  if (options.cachedPricing) {
    client.setQueryData(['pricing'], options.cachedPricing)
  }
  const root = createRootRoute({ component: TuringPlatform })
  const index = createRoute({ getParentRoute: () => root, path: '/' })
  const router = createRouter({
    routeTree: root.addChildren([index]),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  })
  await act(async () => {
    render(
      <QueryClientProvider client={client}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    )
    await router.load()
  })
  return { client, router }
}

beforeEach(() => {
  useAuthStore.getState().auth.setUser(null)
  localStorage.clear()
  vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined)
})

afterEach(() => {
  for (const client of clients.splice(0)) client.clear()
  if (clipboardDescriptor) {
    Object.defineProperty(navigator, 'clipboard', clipboardDescriptor)
  } else {
    Reflect.deleteProperty(navigator, 'clipboard')
  }
  vi.unstubAllGlobals()
})

describe('Turing home model connection', () => {
  test('waits for status permissions before requesting models', async () => {
    const get = vi
      .spyOn(api, 'get')
      .mockImplementation(() => new Promise(() => undefined))
    await renderPlatform({ status: null })
    expect(screen.getByText('Loading models...')).toBeInTheDocument()
    expect(get).not.toHaveBeenCalledWith('/api/pricing')
    expect(screen.queryByLabelText('Request example')).not.toBeInTheDocument()
  })

  test('opens the catalog price drawer and returns to the same home position on close', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({ data: catalogResponse })
    const { router } = await renderPlatform()
    const model = await screen.findByRole('button', { name: 'chat/alpha' })
    vi.mocked(window.scrollTo).mockClear()
    await act(async () => {
      fireEvent.click(model)
      await vi.dynamicImportSettled()
    })
    const dialog = await screen.findByRole('dialog', { name: 'chat/alpha' })
    expect(dialog).toBeInTheDocument()
    expect(
      await screen.findByRole('table', { name: 'Original and group prices' })
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    )
    expect(router.state.location.pathname).toBe('/')
    expect(window.scrollTo).not.toHaveBeenCalled()
  })

  test('shows only available models and copies a supported-model example using the configured origin', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({ data: catalogResponse })
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    })
    await renderPlatform()

    expect(
      await screen.findByRole('button', { name: 'chat/alpha' })
    ).toBeVisible()
    expect(
      screen.queryByRole('button', { name: 'private-chat' })
    ).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Read the docs' })).toHaveAttribute(
      'href',
      status.docs_link
    )
    const example = screen.getByLabelText('Request example')
    expect(example).toHaveTextContent(
      'baseURL: "https://service.example/custom/v1"'
    )
    expect(example).toHaveTextContent('model: "chat/alpha"')
    expect(example).not.toHaveTextContent('image-model')
    fireEvent.click(
      screen.getByRole('button', { name: 'Copy request example' })
    )
    await screen.findByRole('button', { name: 'Copied' })
    expect(writeText).toHaveBeenCalledWith(
      expect.stringContaining('model: "chat/alpha"')
    )
  })

  test('does not fetch or expose cached prices when guests must sign in', async () => {
    const get = vi.spyOn(api, 'get')
    await renderPlatform({
      status: {
        ...status,
        HeaderNavModules: JSON.stringify({
          pricing: { enabled: true, requireAuth: true },
        }),
      },
      cachedPricing: catalogResponse,
    })
    expect(
      screen.getByText('Sign in to view available models.')
    ).toBeInTheDocument()
    expect(get).not.toHaveBeenCalled()
    expect(
      screen.queryByRole('button', { name: 'chat/alpha' })
    ).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Request example')).not.toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Explore the model catalog' })
    ).toHaveAttribute('href', '/pricing')
  })

  test('keeps disabled catalog and documentation entries out of home links', async () => {
    const get = vi.spyOn(api, 'get')
    await renderPlatform({
      status: {
        ...status,
        HeaderNavModules: JSON.stringify({
          pricing: false,
          docs: false,
          console: false,
        }),
      },
    })
    expect(
      screen.getByText('Model catalog is currently unavailable.')
    ).toBeInTheDocument()
    expect(get).not.toHaveBeenCalled()
    expect(
      screen.queryByRole('link', { name: 'Explore the model catalog' })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: 'Model Square' })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: 'Read the docs' })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: 'Open console' })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: 'Manage API keys' })
    ).not.toBeInTheDocument()
  })

  test('retries catalog failures and never invents a chat example for an image-only catalog', async () => {
    vi.spyOn(api, 'get')
      .mockRejectedValueOnce(new Error('Catalog unavailable'))
      .mockResolvedValue({
        data: { ...catalogResponse, data: [catalogResponse.data[1]] },
      })
    await renderPlatform()
    expect(
      await screen.findByText('Unable to load the model catalog')
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'image-model' })
      ).toBeInTheDocument()
    )
    expect(screen.queryByLabelText('Request example')).not.toBeInTheDocument()
    expect(
      screen.getByText(
        'Choose a model in the catalog to see its supported API and request examples.'
      )
    ).toBeInTheDocument()
  })
})
