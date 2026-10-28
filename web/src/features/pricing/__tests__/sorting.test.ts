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
import { describe, expect, test } from 'vitest'

import { SORT_OPTIONS } from '../constants'
import { filterBySearch, sortModels } from '../lib/filters'
import type { PricingModel } from '../types'

function pricingModel(
  modelName: string,
  overrides: Partial<PricingModel>
): PricingModel {
  return {
    id: 1,
    model_name: modelName,
    quota_type: 0,
    model_ratio: 1,
    completion_ratio: 1,
    enable_groups: ['default'],
    group_ratio: { default: 1 },
    ...overrides,
  }
}

const models = [
  pricingModel('legacy-ratio', { model_ratio: 1, completion_ratio: 4 }),
  pricingModel('legacy-per-call', { quota_type: 1, model_price: 0.05 }),
  pricingModel('expr-tokens', {
    billing_mode: 'tiered_expr',
    billing_expr: 'tier("base", p * 1 + c * 10)',
  }),
  pricingModel('expr-long-context', {
    billing_mode: 'tiered_expr',
    billing_expr:
      'len <= 200000 ? tier("standard", p * 3 + c * 15) : tier("long", p * 6 + c * 22.5)',
  }),
  pricingModel('expr-input-only', {
    billing_mode: 'tiered_expr',
    billing_expr: 'tier("base", p * 0.1)',
  }),
  pricingModel('expr-fixed', {
    billing_mode: 'tiered_expr',
    billing_expr: 'tier("request", fixed(0.02))',
  }),
  pricingModel('expr-task', {
    billing_mode: 'tiered_expr',
    billing_expr: 'tier("base", u("seconds") * 0.1)',
    billing_usage_schema: { seconds: { type: 'number', unit: 'second' } },
    billing_usage_examples: [{ label: '5s', facts: { seconds: 5 } }],
  }),
]

describe('model search', () => {
  test('finds endpoint names case-insensitively and ignores surrounding spaces', () => {
    const searchable = [
      pricingModel('first', { supported_endpoint_types: ['openai-response'] }),
      pricingModel('second', { supported_endpoint_types: ['gemini'] }),
    ]
    expect(filterBySearch(searchable, ' RESPONSE ')).toEqual([searchable[0]])
    expect(filterBySearch(searchable, '   ')).toEqual(searchable)
  })
})

describe('price sorting', () => {
  test.each([
    [
      SORT_OPTIONS.INPUT_PRICE_LOW,
      [
        'expr-input-only',
        'expr-tokens',
        'legacy-ratio',
        'expr-long-context',
        'legacy-per-call',
        'expr-fixed',
        'expr-task',
      ],
    ],
    [
      SORT_OPTIONS.INPUT_PRICE_HIGH,
      [
        'expr-long-context',
        'legacy-ratio',
        'expr-tokens',
        'expr-input-only',
        'legacy-per-call',
        'expr-fixed',
        'expr-task',
      ],
    ],
    [
      SORT_OPTIONS.OUTPUT_PRICE_LOW,
      [
        'legacy-ratio',
        'expr-tokens',
        'expr-long-context',
        'legacy-per-call',
        'expr-input-only',
        'expr-fixed',
        'expr-task',
      ],
    ],
    [
      SORT_OPTIONS.REQUEST_PRICE_HIGH,
      [
        'expr-task',
        'legacy-per-call',
        'expr-fixed',
        'legacy-ratio',
        'expr-tokens',
        'expr-long-context',
        'expr-input-only',
      ],
    ],
  ])(
    '%s compares base prices across legacy and expression billing and keeps unpriced models last',
    (sortBy, expected) => {
      expect(sortModels(models, sortBy).map((m) => m.model_name)).toEqual(
        expected
      )
    }
  )
})

describe('displayed group price sorting', () => {
  test.each([SORT_OPTIONS.INPUT_PRICE_LOW, SORT_OPTIONS.INPUT_PRICE_HIGH])(
    '%s keeps models with an unconfigured group price after known prices',
    (sortBy) => {
      const list = [
        pricingModel('unknown-price', { group_ratio: {} }),
        pricingModel('paid', { model_ratio: 2 }),
        pricingModel('free', { group_ratio: { default: 0 } }),
      ]
      expect(
        sortModels(list, sortBy, 'default').map((m) => m.model_name)
      ).toEqual(
        sortBy === SORT_OPTIONS.INPUT_PRICE_LOW
          ? ['free', 'paid', 'unknown-price']
          : ['paid', 'free', 'unknown-price']
      )
    }
  )

  test('sorts token prices using the chosen group instead of the base price', () => {
    const list = [
      pricingModel('higher-base', {
        model_ratio: 10,
        enable_groups: ['default', 'vip'],
        group_ratio: { default: 1, vip: 0.1 },
      }),
      pricingModel('lower-base', {
        model_ratio: 2,
        enable_groups: ['default', 'vip'],
        group_ratio: { default: 1, vip: 1 },
      }),
    ]
    expect(
      sortModels(list, SORT_OPTIONS.INPUT_PRICE_LOW, 'vip').map(
        (m) => m.model_name
      )
    ).toEqual(['higher-base', 'lower-base'])
    expect(
      sortModels(list, SORT_OPTIONS.INPUT_PRICE_LOW, 'default').map(
        (m) => m.model_name
      )
    ).toEqual(['lower-base', 'higher-base'])
  })
  test('compares request examples and expressions at the displayed group rate', () => {
    const list = [
      pricingModel('expression', {
        billing_mode: 'tiered_expr',
        billing_expr: 'tier("request", fixed(10))',
        enable_groups: ['vip'],
        group_ratio: { vip: 0.1 },
      }),
      pricingModel('request', {
        quota_type: 1,
        model_price: 2,
        enable_groups: ['vip'],
        group_ratio: { vip: 1 },
      }),
    ]
    expect(
      sortModels(list, SORT_OPTIONS.REQUEST_PRICE_LOW, 'vip').map(
        (m) => m.model_name
      )
    ).toEqual(['expression', 'request'])
  })
})

describe('tiered starting-price sorting', () => {
  test('compares the minimum advertised tier even when the first tier costs more', () => {
    const list = [
      pricingModel('volume-discount', {
        billing_mode: 'tiered_expr',
        billing_expr:
          'len <= 200000 ? tier("standard", p * 10 + c * 20) : tier("volume", p * 1 + c * 2)',
      }),
      pricingModel('flat', { model_ratio: 2, completion_ratio: 1.5 }),
    ]

    expect(
      sortModels(list, SORT_OPTIONS.INPUT_PRICE_LOW).map(
        (model) => model.model_name
      )
    ).toEqual(['volume-discount', 'flat'])
    expect(
      sortModels(list, SORT_OPTIONS.OUTPUT_PRICE_LOW).map(
        (model) => model.model_name
      )
    ).toEqual(['volume-discount', 'flat'])
  })
})
