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
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, assert, beforeEach, describe, expect, it, vi } from 'vitest'
import { createJSONStorage } from 'zustand/middleware'

import { api } from '@/lib/api'
import {
  DEFAULT_CURRENCY_CONFIG,
  useSystemConfigStore,
} from '@/stores/system-config-store'

import { ModelDetailsContent } from '../components/model-details'
import { ModelPriceLedgerView } from '../components/model-price-ledger'
import { getModelPriceLedger } from '../lib/price-ledger'
import type { PricingModel } from '../types'

// Canvas charts are an external browser boundary and are not exercised here.
vi.mock('@visactor/react-vchart', () => ({ VChart: () => null }))

const model: PricingModel = {
  id: 1,
  model_name: 'configured-model',
  quota_type: 0,
  model_ratio: 5,
  completion_ratio: 5,
  cache_ratio: 0.1,
  create_cache_ratio: 1.25,
  enable_groups: ['default', 'vip'],
}
const groups = {
  default: { desc: 'Standard group', ratio: 0.8 },
  vip: { desc: 'Preferred group', ratio: 0.7 },
}
const ratios = { default: 0.8, vip: 0.7 }
const options = { tokenUnit: 'M' as const }
const previousStorage = useSystemConfigStore.persist.getOptions().storage
const previousCurrency = useSystemConfigStore.getState().config.currency

beforeEach(() => {
  const values = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  })
  useSystemConfigStore.persist.setOptions({
    storage: createJSONStorage(() => localStorage),
  })
  useSystemConfigStore.getState().setConfig({
    currency: { ...DEFAULT_CURRENCY_CONFIG, quotaDisplayType: 'USD' },
  })
})

afterEach(() => {
  useSystemConfigStore.getState().setConfig({ currency: previousCurrency })
  useSystemConfigStore.persist.setOptions({ storage: previousStorage })
  vi.unstubAllGlobals()
})

describe('model detail price ledger', () => {
  it('shows original prices above group prices and does not invent a one-hour cache price', () => {
    const ledger = getModelPriceLedger(model, options, ratios, groups)
    assert(ledger)
    expect(ledger.original.prices).toEqual(['$10', '$50', '$1', '$12.5', '—'])
    expect(ledger.groups[0].prices).toEqual(['$8', '$40', '$0.8', '$10', '—'])
    expect(ledger.groups[1].prices).toEqual(['$7', '$35', '$0.7', '$8.75', '—'])
    render(<ModelPriceLedgerView ledger={ledger} tokenUnit='M' />)
    const table = screen.getByRole('table', {
      name: 'Original and group prices',
    })
    const rows = within(table).getAllByRole('row')
    expect(rows[1]).toHaveTextContent('Model original price')
    expect(rows[3]).toHaveTextContent('Standard group')
    expect(within(table).getAllByRole('columnheader')).toHaveLength(6)
    expect(
      within(table).getByRole('columnheader', { name: 'Cache Write (1h)' })
    ).toBeVisible()
    expect(screen.queryByText('CNY')).not.toBeInTheDocument()
  })

  it('uses separately configured five-minute and one-hour expression prices', () => {
    const ledger = getModelPriceLedger(
      {
        ...model,
        billing_mode: 'tiered_expr',
        billing_expr:
          'tier("standard", p * 10 + c * 50 + cr * 1 + cc * 12.5 + cc1h * 20)',
      },
      options,
      ratios,
      groups
    )
    assert(ledger)
    expect(ledger.original.prices).toEqual(['$10', '$50', '$1', '$12.5', '$20'])
    expect(ledger.groups[1].prices).toEqual([
      '$7',
      '$35',
      '$0.7',
      '$8.75',
      '$14',
    ])
  })

  it('preserves explicit zero prices and a free group instead of replacing them with defaults', () => {
    const ledger = getModelPriceLedger(
      {
        ...model,
        cache_ratio: 0,
        create_cache_ratio: 0,
      },
      options,
      { default: 0, vip: 1.2 },
      groups
    )
    assert(ledger)
    expect(ledger.original.prices).toEqual(['$10', '$50', '$0', '$0', '—'])
    expect(ledger.groups[0].prices).toEqual(['$0', '$0', '$0', '$0', '—'])
    expect(ledger.groups[1].prices[0]).toBe('$12')
    render(<ModelPriceLedgerView ledger={ledger} tokenUnit='M' />)
    const table = screen.getByRole('table')
    expect(within(table).getByText('Free')).toBeVisible()
    expect(within(table).getByText('1.2× base price')).toBeVisible()
  })

  it('shows missing group configuration as unavailable and excludes inaccessible groups', () => {
    const ledger = getModelPriceLedger(
      model,
      options,
      {},
      {
        ...groups,
        internal: { desc: 'Unavailable', ratio: 0.1 },
      }
    )
    assert(ledger)
    expect(ledger.groups.map((group) => group.key)).toEqual(['default', 'vip'])
    expect(ledger.groups.every((group) => group.ratio === null)).toBe(true)
    expect(ledger.groups[0].prices).toEqual(['—', '—', '—', '—', '—'])
  })

  it('keeps per-request prices independent of the token display unit', () => {
    const requestModel = { ...model, quota_type: 1, model_price: 0.2 }
    const million = getModelPriceLedger(requestModel, options, ratios, groups)
    assert(million)
    const thousand = getModelPriceLedger(
      requestModel,
      { tokenUnit: 'K' },
      ratios,
      groups
    )
    assert(thousand)
    expect(million.unit).toBe('request')
    expect(million.original.prices).toEqual(['$0.2'])
    expect(million.groups[0].prices).toEqual(['$0.16'])
    expect(thousand.original.prices).toEqual(million.original.prices)
  })

  it('displays tier ranges without losing the original-to-group relationship', () => {
    const ledger = getModelPriceLedger(
      {
        ...model,
        billing_mode: 'tiered_expr',
        billing_expr:
          'len <= 200000 ? tier("standard", p * 3 + c * 15 + cr * 0.3 + cc * 3.75 + cc1h * 6) : tier("long", p * 6 + c * 30 + cr * 0.6 + cc * 7.5 + cc1h * 12)',
      },
      options,
      ratios,
      groups
    )
    assert(ledger)
    expect(ledger.original.prices[0]).toBe('$3 – $6')
    expect(ledger.groups[0].prices[0]).toBe('$2.4 – $4.8')
    expect(ledger.hasRules).toBe(true)
  })

  it('selects current time prices while retaining a link to all pricing rules', () => {
    const ledger = getModelPriceLedger(
      {
        ...model,
        billing_mode: 'tiered_expr',
        billing_expr:
          'hour("Asia/Shanghai") < 12 ? tier("morning", p * 2 + c * 8) : tier("afternoon", p * 4 + c * 16)',
      },
      { ...options, now: new Date('2026-09-07T09:00:00+08:00') },
      ratios,
      groups
    )
    assert(ledger)
    expect(ledger.original.prices.slice(0, 2)).toEqual(['$2', '$8'])
    expect(ledger.isTimePricing).toBe(true)
    expect(ledger.hasRules).toBe(true)
  })

  it('does not flatten task usage or mixed billing into token columns', () => {
    expect(
      getModelPriceLedger(
        {
          ...model,
          billing_usage_schema: { seconds: { type: 'number', unit: 'second' } },
        },
        options,
        ratios,
        groups
      )
    ).toBeNull()
    expect(
      getModelPriceLedger(
        {
          ...model,
          billing_mode: 'tiered_expr',
          billing_expr:
            'len < 1000 ? tier("request", fixed(0.01)) : tier("tokens", p * 2 + c * 8)',
        },
        options,
        ratios,
        groups
      )
    ).toBeNull()
  })

  it('retains a configured cache-read price equal to the input price', () => {
    const ledger = getModelPriceLedger(
      {
        ...model,
        billing_mode: 'tiered_expr',
        billing_expr: 'tier("standard", p * 3 + c * 15 + cr * 3 + cc * 3.75)',
      },
      options,
      ratios,
      groups
    )
    assert(ledger)
    expect(ledger.original.prices[2]).toBe('$3')
  })

  it('keeps API instructions closed until requested and opens them with the keyboard', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({
      data: { success: true, data: {} },
    })
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    const user = userEvent.setup()
    const view = render(
      <QueryClientProvider client={client}>
        <ModelDetailsContent
          model={model}
          groupRatio={ratios}
          usableGroup={groups}
          endpointMap={{}}
          autoGroups={[]}
          priceRate={1}
          usdExchangeRate={1}
          tokenUnit='M'
        />
      </QueryClientProvider>
    )
    const trigger = screen.getByRole('button', { name: 'API access' })
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    trigger.focus()
    await user.keyboard('{Enter}')
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    await user.keyboard('{Enter}')
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(
      screen.getByRole('table', { name: 'Original and group prices' })
    ).toBeVisible()
    view.unmount()
    client.clear()
  })
})
