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
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createJSONStorage } from 'zustand/middleware'

import {
  DEFAULT_CURRENCY_CONFIG,
  useSystemConfigStore,
} from '@/stores/system-config-store'

import { CachedPriceCell } from '../components/cached-price-cell'
import { ModelCard } from '../components/model-card'
import { ModelCardGrid } from '../components/model-card-grid'
import { ModelPriceCell } from '../components/model-price-cell'
import { PricingTable } from '../components/pricing-table'
import type { PricingModel } from '../types'

function pricingModel(overrides: Partial<PricingModel> = {}): PricingModel {
  return {
    id: 1,
    model_name: 'example-model',
    quota_type: 0,
    model_ratio: 1,
    completion_ratio: 3,
    enable_groups: ['default', 'premium'],
    group_ratio: { default: 1, premium: 3 },
    ...overrides,
  }
}
const originalStorage = useSystemConfigStore.persist.getOptions().storage
beforeEach(() => {
  const storage = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
    clear: () => storage.clear(),
    key: (index: number) => [...storage.keys()][index] ?? null,
    get length() {
      return storage.size
    },
  })
  useSystemConfigStore.persist.setOptions({
    storage: createJSONStorage(() => localStorage),
  })
  useSystemConfigStore.getState().setConfig({
    currency: { ...DEFAULT_CURRENCY_CONFIG, quotaDisplayType: 'USD' },
  })
})
afterEach(() => {
  useSystemConfigStore
    .getState()
    .setConfig({ currency: { ...DEFAULT_CURRENCY_CONFIG } })
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  useSystemConfigStore.persist.setOptions({ storage: originalStorage })
})

describe('catalog entries', () => {
  it('opens details once from the model title with the keyboard', async () => {
    const onClick = vi.fn(),
      user = userEvent.setup()
    render(<ModelCard model={pricingModel()} onClick={onClick} />)
    screen.getByRole('button', { name: 'example-model' }).focus()
    await user.keyboard('{Enter}')
    expect(onClick).toHaveBeenCalledOnce()
    expect(onClick).toHaveBeenCalledWith('example-model')
  })
  it('copies the complete long name without opening details', async () => {
    const user = userEvent.setup(),
      onClick = vi.fn()
    const name = 'provider/model-with-a-long-name-and-a-version-suffix-20260906'
    render(
      <ModelCard model={pricingModel({ model_name: name })} onClick={onClick} />
    )
    expect(screen.getByRole('heading', { name })).toHaveAttribute('title', name)
    await user.click(screen.getByRole('button', { name: 'Copy model name' }))
    expect(await navigator.clipboard.readText()).toBe(name)
    expect(onClick).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Details' }))
    expect(onClick).toHaveBeenCalledOnce()
    expect(onClick).toHaveBeenCalledWith(name)
  })
  it('shows supplied tags with overflow instead of inferred capabilities or telemetry', () => {
    render(
      <ModelCard
        model={pricingModel({ tags: 'vision,tools,reasoning,streaming' })}
        onClick={vi.fn()}
      />
    )
    const tags = screen.getByRole('group', { name: 'Tags' })
    expect(within(tags).getByText('vision, tools')).toHaveAttribute(
      'title',
      'vision, tools, reasoning, streaming'
    )
    expect(within(tags).getByText('+2')).toHaveAttribute(
      'title',
      'reasoning, streaming'
    )
    expect(
      screen.queryByLabelText('Performance metrics for the last 24 hours')
    ).not.toBeInTheDocument()
    expect(screen.queryByText(/128K|99.9/)).not.toBeInTheDocument()
  })
  it('keeps missing prices explicit instead of presenting a free model', () => {
    render(
      <ModelCard
        model={pricingModel({ model_ratio: Number.NaN })}
        onClick={vi.fn()}
      />
    )
    expect(screen.getByText('No description available.')).toBeVisible()
    expect(
      within(screen.getByRole('group', { name: 'Pricing' })).getAllByText('-')
    ).toHaveLength(2)
    expect(screen.queryByText('$0')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('group', { name: 'Tags' })
    ).not.toBeInTheDocument()
  })
  it('shows group and recharge prices with one readable unit and no currency codes', () => {
    const props = {
      model: pricingModel(),
      onClick: vi.fn(),
      selectedGroup: 'premium',
      showRechargePrice: true,
      priceRate: 3,
      usdExchangeRate: 6,
    }
    const { rerender } = render(<ModelCard {...props} tokenUnit='M' />)
    expect(screen.getByText('Input').parentElement).toHaveTextContent('$3')
    expect(screen.getByText('Output').parentElement).toHaveTextContent('$9')
    expect(screen.getAllByText('Per million tokens')).toHaveLength(1)
    expect(screen.getByText('premium')).toBeVisible()
    expect(screen.queryByText(/CNY|USD/)).not.toBeInTheDocument()
    rerender(<ModelCard {...props} tokenUnit='K' />)
    expect(screen.getByText('Input').parentElement).toHaveTextContent('$0.003')
    expect(screen.getByText('Output').parentElement).toHaveTextContent('$0.009')
    expect(screen.getAllByText('Per thousand tokens')).toHaveLength(1)
  })
  it('labels the unfiltered minimum group price as a starting price', () => {
    render(
      <ModelCard
        model={pricingModel({ group_ratio: { default: 0.5, premium: 3 } })}
        onClick={vi.fn()}
      />
    )
    expect(screen.getByText('From')).toBeVisible()
    expect(screen.getByText('Input').parentElement).toHaveTextContent('$1')
  })
  it('keeps a free configured price distinct from an unavailable price', () => {
    render(
      <ModelCard model={pricingModel({ model_ratio: 0 })} onClick={vi.fn()} />
    )
    expect(
      within(screen.getByRole('group', { name: 'Pricing' })).getAllByText('$0')
    ).toHaveLength(2)
  })
  it.each([undefined, Number.NaN, Number.POSITIVE_INFINITY, -1])(
    'shows unavailable card and list prices when the selected group multiplier is %s',
    (ratio) => {
      const model = pricingModel({
        group_ratio:
          ratio === undefined ? { default: 1 } : { default: 1, premium: ratio },
      })
      render(
        <>
          <ModelCardGrid
            models={[model]}
            onModelClick={vi.fn()}
            selectedGroup='premium'
          />
          <PricingTable
            models={[model]}
            onModelClick={vi.fn()}
            selectedGroup='premium'
          />
        </>
      )
      expect(
        within(screen.getByRole('group', { name: 'Pricing' })).getByText('—')
      ).toBeVisible()
      expect(within(screen.getByRole('table')).getByText('—')).toBeVisible()
      expect(screen.queryByText(/\$\d|¥\d|CNY|USD/)).not.toBeInTheDocument()
    }
  )
  it('does not advertise a starting price when no enabled group has a valid multiplier', () => {
    const model = pricingModel({ group_ratio: {} })
    render(
      <>
        <ModelCard model={model} onClick={vi.fn()} />
        <PricingTable models={[model]} onModelClick={vi.fn()} />
      </>
    )
    expect(screen.getAllByText('—')).toHaveLength(2)
    expect(screen.queryByText(/\$\d/)).not.toBeInTheDocument()
  })
  it.each([
    { quota_type: 1, model_price: 10 },
    {
      billing_mode: 'tiered_expr',
      billing_expr: 'tier("base", p * 10 + c * 20)',
    },
  ])(
    'keeps request and expression prices unavailable without a group multiplier: %j',
    (overrides) => {
      const model = pricingModel({ ...overrides, group_ratio: { default: 1 } })
      render(
        <>
          <ModelCard model={model} onClick={vi.fn()} selectedGroup='premium' />
          <PricingTable
            models={[model]}
            onModelClick={vi.fn()}
            selectedGroup='premium'
          />
        </>
      )
      expect(screen.getAllByText('—')).toHaveLength(2)
      expect(screen.queryByText(/\$\d/)).not.toBeInTheDocument()
    }
  )
  it('keeps a free configured group available in cards and the compact list', () => {
    const model = pricingModel({ group_ratio: { default: 1, premium: 0 } })
    render(
      <>
        <ModelCard model={model} onClick={vi.fn()} selectedGroup='premium' />
        <PricingTable
          models={[model]}
          onModelClick={vi.fn()}
          selectedGroup='premium'
        />
      </>
    )
    expect(
      within(screen.getByRole('group', { name: 'Pricing' })).getAllByText('$0')
    ).toHaveLength(2)
    expect(within(screen.getByRole('table')).getAllByText('$0')).toHaveLength(2)
    expect(screen.queryByText('—')).not.toBeInTheDocument()
  })
  it('keeps legacy administrative price cells unchanged when their model has no group metadata', () => {
    const model = pricingModel({ group_ratio: {} })
    const { rerender } = render(<ModelPriceCell model={model} />)
    expect(screen.getByText('Input').parentElement).toHaveTextContent('2')
    expect(screen.getByText('Output').parentElement).toHaveTextContent('6')
    rerender(
      <ModelPriceCell
        model={{
          ...model,
          billing_mode: 'tiered_expr',
          billing_expr: 'tier("base", p * 3 + c * 9)',
        }}
      />
    )
    expect(screen.getByText('Input').parentElement).toHaveTextContent('3')
    expect(screen.getByText('Output').parentElement).toHaveTextContent('9')
    expect(model.group_ratio).toEqual({})
  })
  it('shows a tier price range instead of presenting the first tier as the lowest price', () => {
    const model = pricingModel({
      billing_mode: 'tiered_expr',
      billing_expr:
        'len < 1000 ? tier("first", p * 4 + c * 12) : tier("cheaper", p * 2 + c * 6)',
    })
    render(
      <>
        <ModelCard model={model} onClick={vi.fn()} selectedGroup='default' />
        <PricingTable
          models={[model]}
          onModelClick={vi.fn()}
          selectedGroup='default'
        />
      </>
    )
    expect(
      within(screen.getByRole('group', { name: 'Pricing' })).getByText(
        '$2 – $4'
      )
    ).toBeVisible()
    expect(within(screen.getByRole('table')).getByText('$2 – $4')).toBeVisible()
    expect(screen.getAllByText('$6 – $12')).toHaveLength(2)
  })
  it('shows a request price with the selected group and no token unit', () => {
    render(
      <ModelCard
        model={pricingModel({ quota_type: 1, model_price: 0.4 })}
        onClick={vi.fn()}
        selectedGroup='premium'
        showRechargePrice
        priceRate={3}
        usdExchangeRate={6}
        tokenUnit='K'
      />
    )
    expect(screen.getByText(/\$0.6/)).toHaveTextContent(/\$0.6\s*\/\s*request/)
    expect(
      screen.queryByText(/Per (million|thousand) tokens/)
    ).not.toBeInTheDocument()
  })
  it('keeps fixed expression prices per request when token units change', () => {
    const model = pricingModel({
      billing_mode: 'tiered_expr',
      billing_expr: 'tier("request", fixed(0.01))',
    })
    const { rerender } = render(
      <ModelCard model={model} onClick={vi.fn()} tokenUnit='K' />
    )
    expect(screen.getByText('$0.01')).toBeVisible()
    expect(screen.getByText('/ request')).toBeVisible()
    rerender(<ModelCard model={model} onClick={vi.fn()} tokenUnit='M' />)
    expect(screen.getByText('$0.01')).toBeVisible()
    expect(screen.queryByText('Per million tokens')).not.toBeInTheDocument()
  })
  it('shows request, input, and output prices separately for mixed billing', () => {
    render(
      <ModelCard
        model={pricingModel({
          billing_mode: 'tiered_expr',
          billing_expr:
            'len < 1000 ? tier("request", fixed(0.01)) : tier("tokens", p * 2 + c * 8)',
        })}
        onClick={vi.fn()}
      />
    )
    expect(screen.getByText('$0.01')).toBeVisible()
    expect(screen.getByText('Input').parentElement).toHaveTextContent('$2')
    expect(screen.getByText('Output').parentElement).toHaveTextContent('$8')
    expect(screen.getByText('/ request')).toBeVisible()
    expect(screen.getByText('Token or per-call pricing')).toBeVisible()
  })
  it('preserves expression prices and selected group multipliers', () => {
    render(
      <ModelCard
        model={pricingModel({
          billing_mode: 'tiered_expr',
          billing_expr: 'tier("base", p * 3 + c * 15)',
        })}
        onClick={vi.fn()}
        tokenUnit='K'
        selectedGroup='premium'
        showRechargePrice
        priceRate={3}
        usdExchangeRate={6}
      />
    )
    expect(screen.getByText('Input').parentElement).toHaveTextContent('$0.0045')
    expect(screen.getByText('Output').parentElement).toHaveTextContent(
      '$0.0225'
    )
    expect(screen.getByText('Per thousand tokens')).toBeVisible()
  })
  it('updates time-based pricing at minute boundaries and when returning to the page', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-07T08:59:59+08:00'))
    const model = pricingModel({
      billing_mode: 'tiered_expr',
      billing_expr:
        'hour("Asia/Shanghai") >= 9 && hour("Asia/Shanghai") < 12 ? tier("peak", p * 3 + c * 9) : tier("off_peak", p * 1.5 + c * 4.5)',
    })
    render(<ModelCard model={model} onClick={vi.fn()} />)
    expect(screen.getByText('Current period price')).toBeVisible()
    expect(screen.getByText('$1.5')).toBeVisible()
    act(() => vi.advanceTimersByTime(1000))
    expect(screen.getByText('$3')).toBeVisible()
    act(() => {
      vi.setSystemTime(new Date('2026-09-07T12:00:00+08:00'))
      fireEvent(document, new Event('visibilitychange'))
    })
    expect(screen.getByText('$1.5')).toBeVisible()
  })
  it('keeps task billing ranges with their own units', () => {
    render(
      <ModelCard
        model={pricingModel({
          billing_mode: 'tiered_expr',
          billing_expr:
            'u("mode") == "pro" ? tier("pro", u("tokens") * 70 / 1000000) : tier("std", u("tokens") * 42 / 1000000)',
          billing_usage_schema: {
            tokens: { type: 'number', unit: 'token' },
            mode: { enum: ['std', 'pro'] },
          },
          billing_usage_examples: [
            { label: '480p · 5s', facts: { tokens: 48000, mode: 'std' } },
          ],
        })}
        onClick={vi.fn()}
        tokenUnit='K'
      />
    )
    expect(screen.getByText('$42 – $70').parentElement).toHaveTextContent(
      '$42 – $70 / 1M token'
    )
    expect(screen.getByText(/480p · 5s ≈/)).toBeVisible()
  })
  it('indicates special billing without filling a card with a raw expression', () => {
    const expression =
      'u("seconds") > 30 ? tier("long", u("seconds") * 0.3) : tier("short", u("seconds") * 0.4)'
    render(
      <ModelCard
        model={pricingModel({
          billing_mode: 'tiered_expr',
          billing_expr: expression,
          billing_usage_schema: { seconds: { type: 'number', unit: 'second' } },
        })}
        onClick={vi.fn()}
      />
    )
    expect(screen.getByText('Special billing expression')).toBeVisible()
    expect(screen.queryByText(expression)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Details' })).toBeEnabled()
  })
  it('shows separate generic and image cache prices including free image cache', () => {
    render(
      <CachedPriceCell
        model={pricingModel({
          billing_mode: 'tiered_expr',
          billing_expr:
            'tier("standard", p * 5 + cr * 1.25 + img * 8 + img_cr * 0 + c * 30)',
        })}
        options={{ tokenUnit: 'M' }}
      />
    )
    expect(screen.getByText('Cache Read').parentElement).toHaveTextContent(
      '$1.25'
    )
    expect(screen.getByText('Image Cache').parentElement).toHaveTextContent(
      '$0'
    )
  })
  it('paginates and returns to the first page when the result set changes', async () => {
    const models = Array.from({ length: 21 }, (_, index) =>
      pricingModel({ id: index + 1, model_name: `model-${index + 1}` })
    )
    const user = userEvent.setup()
    const { rerender } = render(
      <ModelCardGrid models={models} onModelClick={vi.fn()} />
    )
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled()
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(20)
    await user.click(screen.getByRole('button', { name: 'Next page' }))
    expect(screen.getByRole('heading', { name: 'model-21' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled()
    rerender(
      <ModelCardGrid
        models={models.filter((model) => model.id !== 1)}
        onModelClick={vi.fn()}
      />
    )
    expect(screen.getByRole('heading', { name: 'model-2' })).toBeVisible()
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(20)
  })
  it('opens list details by keyboard without firing the row click twice', async () => {
    const onModelClick = vi.fn(),
      user = userEvent.setup()
    render(
      <PricingTable models={[pricingModel()]} onModelClick={onModelClick} />
    )
    screen.getByRole('button', { name: 'example-model' }).focus()
    await user.keyboard('{Enter}')
    expect(onModelClick).toHaveBeenCalledOnce()
    expect(onModelClick).toHaveBeenCalledWith('example-model')
    expect(
      screen.queryByRole('columnheader', { name: 'Groups' })
    ).not.toBeInTheDocument()
    expect(screen.queryByText(/CNY|USD/)).not.toBeInTheDocument()
  })
})
