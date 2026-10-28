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
import type { PricingModel, TokenUnit } from '../types'
import {
  getCurrentTimePricingTiers,
  splitBillingExprAndRequestRules,
  type ParsedTier,
} from './billing-expr'
import {
  formatDynamicUnitPrice,
  formatTaskUsageUnitPrice,
  getDynamicPricingSummary,
} from './dynamic-price'
import { getAvailableGroups } from './model-helpers'
import { calculateTokenPrice } from './price'

export type PriceLedgerOptions = {
  tokenUnit: TokenUnit
  showRechargePrice?: boolean
  priceRate?: number
  usdExchangeRate?: number
  now?: Date
}

export type PriceLedgerColumn = {
  key: string
  label: string
}

export type PriceLedgerRow = {
  key: string
  description?: string
  ratio: number | null
  prices: string[]
}

export type ModelPriceLedger = {
  columns: PriceLedgerColumn[]
  original: PriceLedgerRow
  groups: PriceLedgerRow[]
  unit: 'token' | 'request' | 'image'
  hasRules: boolean
  isTimePricing: boolean
}

const TOKEN_COLUMNS: PriceLedgerColumn[] = [
  { key: 'inputPrice', label: 'Input' },
  { key: 'outputPrice', label: 'Output' },
  { key: 'cacheReadPrice', label: 'Cache hit' },
  { key: 'cacheCreatePrice', label: 'Cache Write (5m)' },
  { key: 'cacheCreate1hPrice', label: 'Cache Write (1h)' },
]

/** Presentation only: use configured coefficients, never infer missing TTL prices. */
export function getModelPriceLedger(
  model: PricingModel,
  options: PriceLedgerOptions,
  groupRatio: Record<string, number>,
  usableGroup: Record<string, { desc: string; ratio: number }>
): ModelPriceLedger | null {
  // Task and provider-specific price matrices retain their existing presentation.
  if (model.billing_plugin_variants?.length || model.billing_usage_schema) {
    return null
  }

  let columns = TOKEN_COLUMNS
  let unit: ModelPriceLedger['unit'] = 'token'
  let values: (number | undefined)[][]
  let hasRules = false
  let isTimePricing = false

  if (model.billing_mode === 'tiered_expr' && model.billing_expr) {
    const summary = getDynamicPricingSummary(model, options)
    if (!summary || summary.isSpecialExpression || summary.isMixedBilling) {
      return null
    }
    const expression = splitBillingExprAndRequestRules(
      model.billing_expr
    ).billingExpr
    const currentTiers = getCurrentTimePricingTiers(
      expression,
      options.now ?? new Date()
    )
    const tiers = (currentTiers ?? summary.tiers) as ParsedTier[]
    if (!tiers.length) return null
    hasRules = summary.tierCount > 1 || summary.hasRequestRules
    isTimePricing = summary.isTimePricing === true

    if (tiers.every((tier) => tier.billingUnit === 'request')) {
      unit = tiers.some((tier) => tier.imageCount) ? 'image' : 'request'
      columns = [
        {
          key: 'fixedPrice',
          label: unit === 'image' ? 'Per image' : 'Per request',
        },
      ]
      values = tiers.map((tier) => [tier.fixedPrice])
    } else {
      if (tiers.some((tier) => tier.billingUnit === 'request')) return null
      // `cc` is not a 5-minute cache rate for OpenAI's 30m/12h cache pair.
      if (tiers.some((tier) => tier.cacheCreate12hPrice != null)) {
        columns = TOKEN_COLUMNS.map((column) =>
          column.key === 'cacheCreatePrice'
            ? { ...column, label: 'Cache Write (30m)' }
            : column
        )
        hasRules = true
      }
      values = tiers.map((tier) =>
        columns.map((column) => {
          const value = tier[column.key]
          return typeof value === 'number' ? value : undefined
        })
      )
      hasRules ||= summary.entries.some(
        (entry) => !columns.some((column) => column.key === entry.field)
      )
    }
  } else if (model.quota_type === 1) {
    unit = 'request'
    columns = [{ key: 'fixedPrice', label: 'Per request' }]
    values = [[model.model_price]]
  } else {
    values = [
      [
        calculateTokenPrice(model, 'input', 1),
        calculateTokenPrice(model, 'output', 1),
        calculateTokenPrice(model, 'cache', 1),
        calculateTokenPrice(model, 'create_cache', 1),
        undefined,
      ],
    ]
    hasRules = model.image_ratio != null || model.audio_ratio != null
  }

  const rows: Omit<PriceLedgerRow, 'prices'>[] = [
    { key: '_original', ratio: 1 },
    ...getAvailableGroups(model, usableGroup).map((group) => {
      const ratio = groupRatio[group]
      return {
        key: group,
        description: usableGroup[group].desc,
        ratio:
          typeof ratio === 'number' && Number.isFinite(ratio) && ratio >= 0
            ? ratio
            : null,
      }
    }),
  ]
  const formattedRows = rows.map((row) => ({
    ...row,
    prices: columns.map((_, index) => {
      const prices = values.map((tier) => tier[index])
      // A partially configured tier must not be advertised as a complete range.
      if (
        row.ratio == null ||
        prices.some(
          (value) => value == null || !Number.isFinite(value) || value < 0
        )
      ) {
        return '—'
      }
      const available = prices as number[]
      const minimum = Math.min(...available)
      const maximum = Math.max(...available)
      const format =
        unit === 'token' ? formatDynamicUnitPrice : formatTaskUsageUnitPrice
      const displayOptions = { ...options, groupRatioMultiplier: row.ratio }
      const minimumText = format(minimum, displayOptions)
      if (minimum === maximum || row.ratio === 0) return minimumText
      return `${minimumText} – ${format(maximum, displayOptions)}`
    }),
  }))

  return {
    columns,
    original: formattedRows[0],
    groups: formattedRows.slice(1),
    unit,
    hasRules,
    isTimePricing,
  }
}
