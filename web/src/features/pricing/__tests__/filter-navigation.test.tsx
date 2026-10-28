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
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useFilters } from '../hooks/use-filters'
import type { PricingModel } from '../types'

beforeEach(() => {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined)
})

afterEach(() => vi.useRealTimers())

const models: PricingModel[] = [
  {
    id: 1,
    model_name: 'deepseek-v3',
    vendor_name: 'DeepSeek',
    quota_type: 0,
    model_ratio: 1,
    completion_ratio: 4,
    enable_groups: ['default', 'vip'],
    group_ratio: { default: 1, vip: 1 },
  },
  {
    id: 2,
    model_name: 'claude-sonnet',
    vendor_name: 'Anthropic',
    quota_type: 0,
    model_ratio: 2,
    completion_ratio: 5,
    enable_groups: ['vip'],
    group_ratio: { vip: 1 },
  },
]

function CatalogControls(props: { models: PricingModel[] }) {
  const filters = useFilters(props.models)
  return (
    <>
      <input
        aria-label='Search models'
        value={filters.searchInput}
        onChange={(event) => filters.setSearchInput(event.target.value)}
      />
      <select
        aria-label='Vendor'
        value={filters.vendorFilter}
        onChange={(event) => filters.setVendorFilter(event.target.value)}
      >
        <option value='all'>All vendors</option>
        <option value='DeepSeek'>DeepSeek</option>
        <option value='Anthropic'>Anthropic</option>
      </select>
      <select
        aria-label='Group'
        value={filters.groupFilter}
        onChange={(event) => filters.setGroupFilter(event.target.value)}
      >
        <option value='all'>All groups</option>
        <option value='default'>Default</option>
        <option value='vip'>VIP</option>
      </select>
      <button type='button' onClick={() => filters.setViewMode('table')}>
        Table view
      </button>
      <button type='button' onClick={filters.clearSearch}>
        Clear search
      </button>
      <button type='button' onClick={filters.clearFilters}>
        Clear filters
      </button>
      <button
        type='button'
        onClick={() => {
          filters.clearFilters()
          filters.clearSearch()
        }}
      >
        Clear all
      </button>
      <output aria-label='View'>{filters.viewMode}</output>
      <output aria-label='Unit'>{filters.tokenUnit}</output>
      <output aria-label='Recharge'>{String(filters.showRechargePrice)}</output>
      <output aria-label='Sort'>{filters.sortBy}</output>
      <ul aria-label='Models'>
        {filters.filteredModels.map((model) => (
          <li key={model.id}>{model.model_name}</li>
        ))}
      </ul>
    </>
  )
}

async function renderCatalog(
  initialUrl = '/pricing/',
  catalogModels = models,
  beforeRender?: () => void
) {
  const root = createRootRoute()
  const pricing = createRoute({ getParentRoute: () => root, path: 'pricing' })
  const index = createRoute({
    getParentRoute: () => pricing,
    path: '/',
    validateSearch: (search: Record<string, unknown>) => search,
    component: () => <CatalogControls models={catalogModels} />,
  })
  const router = createRouter({
    routeTree: root.addChildren([pricing.addChildren([index])]),
    history: createMemoryHistory({ initialEntries: [initialUrl] }),
    defaultPendingMinMs: 0,
  })
  await router.load()
  beforeRender?.()
  const view = render(<RouterProvider router={router} />)
  if (vi.isFakeTimers()) screen.getByRole('textbox', { name: 'Search models' })
  else await screen.findByRole('textbox', { name: 'Search models' })
  return { router, ...view }
}

describe('model catalog filter navigation', () => {
  it('updates price sorting at a billing time boundary without another filter action', async () => {
    const timedModels: PricingModel[] = [
      {
        ...models[0],
        model_name: 'time-priced',
        billing_mode: 'tiered_expr',
        billing_expr:
          'hour("Asia/Shanghai") < 9 ? tier("early", p * 1 + c * 1) : tier("late", p * 5 + c * 1)',
      },
      { ...models[1], model_name: 'fixed-priced', model_ratio: 1.5 },
    ]
    const view = await renderCatalog(
      '/pricing/?sort=input-price-low',
      timedModels,
      () => {
        vi.useFakeTimers()
        vi.setSystemTime(new Date('2026-09-07T08:59:59+08:00'))
      }
    )
    expect(
      screen.getAllByRole('listitem').map((item) => item.textContent)
    ).toEqual(['time-priced', 'fixed-priced'])

    act(() => vi.advanceTimersByTime(1000))
    expect(
      screen.getAllByRole('listitem').map((item) => item.textContent)
    ).toEqual(['fixed-priced', 'time-priced'])

    act(() => {
      vi.setSystemTime(new Date('2026-09-08T08:00:00+08:00'))
      fireEvent(document, new Event('visibilitychange'))
    })
    expect(
      screen.getAllByRole('listitem').map((item) => item.textContent)
    ).toEqual(['time-priced', 'fixed-priced'])
    view.unmount()
  })

  it('restores a shared URL and keeps other settings when changing one filter', async () => {
    const { router } = await renderCatalog(
      '/pricing/?search=claude&vendor=Anthropic&group=vip&view=table&tokenUnit=K&rechargePrice=true&sort=input-price-low'
    )
    expect(screen.getByRole('textbox', { name: 'Search models' })).toHaveValue(
      'claude'
    )
    expect(screen.getByRole('combobox', { name: 'Vendor' })).toHaveValue(
      'Anthropic'
    )
    expect(screen.getByRole('combobox', { name: 'Group' })).toHaveValue('vip')
    expect(screen.getByLabelText('View')).toHaveTextContent('table')
    expect(screen.getByLabelText('Unit')).toHaveTextContent('K')
    expect(screen.getByLabelText('Recharge')).toHaveTextContent('true')
    fireEvent.change(screen.getByRole('combobox', { name: 'Vendor' }), {
      target: { value: 'DeepSeek' },
    })
    await waitFor(() =>
      expect(router.state.location.search).toMatchObject({
        search: 'claude',
        vendor: 'DeepSeek',
        group: 'vip',
        view: 'table',
        tokenUnit: 'K',
        rechargePrice: true,
        sort: 'input-price-low',
      })
    )
  })

  it('restores selected filters and view through browser back and forward', async () => {
    const { router } = await renderCatalog()
    vi.mocked(window.scrollTo).mockClear()
    fireEvent.change(screen.getByRole('combobox', { name: 'Vendor' }), {
      target: { value: 'DeepSeek' },
    })
    await waitFor(() =>
      expect(router.state.location.search.vendor).toBe('DeepSeek')
    )
    fireEvent.change(screen.getByRole('combobox', { name: 'Group' }), {
      target: { value: 'vip' },
    })
    await waitFor(() => expect(router.state.location.search.group).toBe('vip'))
    fireEvent.click(screen.getByRole('button', { name: 'Table view' }))
    await waitFor(() =>
      expect(screen.getByLabelText('View')).toHaveTextContent('table')
    )
    expect(window.scrollTo).not.toHaveBeenCalled()
    await act(async () => {
      router.history.back()
    })
    await waitFor(() =>
      expect(screen.getByLabelText('View')).toHaveTextContent('card')
    )
    expect(screen.getByRole('combobox', { name: 'Group' })).toHaveValue('vip')
    expect(screen.getByRole('combobox', { name: 'Vendor' })).toHaveValue(
      'DeepSeek'
    )
    await act(async () => {
      router.history.forward()
    })
    await waitFor(() =>
      expect(screen.getByLabelText('View')).toHaveTextContent('table')
    )
  })

  it('replaces typed search history and restores the prior result set on back', async () => {
    const { router } = await renderCatalog()
    fireEvent.change(screen.getByRole('combobox', { name: 'Vendor' }), {
      target: { value: 'DeepSeek' },
    })
    await waitFor(() =>
      expect(router.state.location.search.vendor).toBe('DeepSeek')
    )
    for (const query of ['d', 'deep', 'deepseek-v3']) {
      fireEvent.change(screen.getByRole('textbox', { name: 'Search models' }), {
        target: { value: query },
      })
      await waitFor(() =>
        expect(
          screen.getByRole('textbox', { name: 'Search models' })
        ).toHaveValue(query)
      )
    }
    await waitFor(() =>
      expect(router.state.location.search.search).toBe('deepseek-v3')
    )
    await waitFor(() => expect(screen.getAllByRole('listitem')).toHaveLength(1))
    await act(async () => {
      router.history.back()
    })
    await waitFor(() =>
      expect(
        screen.getByRole('textbox', { name: 'Search models' })
      ).toHaveValue('')
    )
    expect(screen.getByRole('combobox', { name: 'Vendor' })).toHaveValue('all')
    await waitFor(() => expect(screen.getAllByRole('listitem')).toHaveLength(2))
  })

  it('clears search independently and clears all conditions while preserving display choices', async () => {
    const { router } = await renderCatalog(
      '/pricing/?search=deepseek&vendor=DeepSeek&group=vip&view=table&tokenUnit=K'
    )
    fireEvent.click(screen.getByRole('button', { name: 'Clear search' }))
    await waitFor(() =>
      expect(router.state.location.search.search).toBeUndefined()
    )
    expect(screen.getByRole('combobox', { name: 'Vendor' })).toHaveValue(
      'DeepSeek'
    )
    expect(screen.getByRole('combobox', { name: 'Group' })).toHaveValue('vip')
    fireEvent.change(screen.getByRole('textbox', { name: 'Search models' }), {
      target: { value: 'missing' },
    })
    await waitFor(() =>
      expect(router.state.location.search.search).toBe('missing')
    )
    fireEvent.click(screen.getByRole('button', { name: 'Clear all' }))
    await waitFor(() =>
      expect(router.state.location.search).toEqual({
        view: 'table',
        tokenUnit: 'K',
      })
    )
    expect(screen.getByRole('textbox', { name: 'Search models' })).toHaveValue(
      ''
    )
    expect(screen.getByRole('combobox', { name: 'Vendor' })).toHaveValue('all')
    expect(screen.getByRole('combobox', { name: 'Group' })).toHaveValue('all')
    await waitFor(() => expect(screen.getAllByRole('listitem')).toHaveLength(2))
  })
})
