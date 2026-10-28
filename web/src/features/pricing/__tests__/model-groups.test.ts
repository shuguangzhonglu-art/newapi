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
import { describe, expect, it } from 'vitest'

import {
  getAvailableGroups,
  getConfiguredGroupRatio,
  getDisplayGroupRatio,
  getCatalogGroupRatio,
} from '../lib/model-helpers'
import type { PricingModel } from '../types'

const model: PricingModel = {
  id: 1,
  model_name: 'group-test',
  quota_type: 0,
  model_ratio: 1,
  completion_ratio: 2,
  enable_groups: ['all'],
  group_ratio: { default: 0.8, vip: 0.5, auto: 0.01 },
}
const usable = {
  default: { desc: 'Standard', ratio: 0.8 },
  vip: { desc: 'VIP', ratio: 0.5 },
  auto: { desc: 'Automatic', ratio: 0.01 },
}

describe('catalog groups', () => {
  it('expands all-enabled models to usable non-automatic groups', () => {
    expect(getAvailableGroups(model, usable)).toEqual(['default', 'vip'])
    expect(getCatalogGroupRatio(model, 'default')).toBe(0.8)
    expect(getCatalogGroupRatio(model)).toBe(0.5)
  })

  it('does not expose groups that the model does not enable', () => {
    const restricted = { ...model, enable_groups: ['default'] }
    expect(getAvailableGroups(restricted, usable)).toEqual(['default'])
    expect(getCatalogGroupRatio(restricted, 'vip')).toBeNaN()
  })

  it('preserves a free configured group while ignoring negative and invalid ratios', () => {
    const free = { ...model, group_ratio: { default: 0, vip: -1, auto: 0.01 } }
    expect(getCatalogGroupRatio(free)).toBe(0)
    expect(getCatalogGroupRatio(free, 'default')).toBe(0)
    expect(getCatalogGroupRatio(free, 'vip')).toBeNaN()
  })

  it('marks absent group prices as unavailable instead of a full-price default', () => {
    const missing = { ...model, group_ratio: {} }
    expect(getCatalogGroupRatio(missing)).toBeNaN()
    expect(getCatalogGroupRatio(missing, 'default')).toBeNaN()
    expect(getCatalogGroupRatio({ ...model, enable_groups: [] })).toBeNaN()
    expect(getConfiguredGroupRatio({}, 'default')).toBe(1)
    expect(getDisplayGroupRatio(missing, 'default')).toBe(1)
  })
})
