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
import { describe, expect, test, vi } from 'vitest'

import { api } from '@/lib/api'
import { requireServerSuccess } from '@/lib/server-error-message'

import { getPricing } from '../api'

const pricingResponse = {
  success: true,
  data: [],
  vendors: [],
  group_ratio: { default: 1, vip: 0 },
  usable_group: { default: 'Standard access', vip: 'Member access' },
  supported_endpoint: {},
  auto_groups: ['default'],
}

describe('pricing API adaptation', () => {
  test('preserves group descriptions from the Go string map and user-adjusted ratios including zero', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({ data: pricingResponse })

    const pricing = await getPricing()

    expect(pricing.usable_group).toEqual({
      default: { desc: 'Standard access', ratio: 1 },
      vip: { desc: 'Member access', ratio: 0 },
    })
    expect(pricing.group_ratio).toEqual({ default: 1, vip: 0 })
  })

  test('accepts legacy group objects and prefers the current server ratio over their cached ratio', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({
      data: {
        ...pricingResponse,
        usable_group: {
          default: { desc: 'Standard access', ratio: 2 },
          vip: { desc: 'Member access', ratio: 0.5 },
          legacy: { desc: 'Legacy access', ratio: 0.8 },
        },
      },
    })

    expect((await getPricing()).usable_group).toEqual({
      default: { desc: 'Standard access', ratio: 1 },
      vip: { desc: 'Member access', ratio: 0 },
      legacy: { desc: 'Legacy access', ratio: 0.8 },
    })
  })

  test('keeps a group description without inventing a price when its ratio is absent', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({
      data: { ...pricingResponse, group_ratio: {} },
    })

    expect((await getPricing()).usable_group.default).toEqual({
      desc: 'Standard access',
      ratio: Number.NaN,
    })
  })

  test('preserves a business failure without group data for the shared error handler', async () => {
    const failure = { success: false, message: 'Pricing unavailable' }
    vi.spyOn(api, 'get').mockResolvedValue({ data: failure })

    const pricing = await getPricing()

    expect(pricing).toMatchObject(failure)
    expect(() => requireServerSuccess(pricing)).toThrow('Pricing unavailable')
  })
})
