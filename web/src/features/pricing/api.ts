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
import { api } from '@/lib/api'

import type { PricingData, PricingResponse } from './types'

// ----------------------------------------------------------------------------
// Pricing APIs
// ----------------------------------------------------------------------------

// Get model pricing data
export async function getPricing(): Promise<PricingData> {
  const { data } = await api.get<PricingResponse>('/api/pricing')
  return {
    ...data,
    usable_group: Object.fromEntries(
      Object.entries(data.usable_group ?? {}).map(([group, value]) => [
        group,
        {
          desc: typeof value === 'string' ? value : value.desc,
          // group_ratio includes user-specific overrides and valid free groups.
          ratio:
            data.group_ratio?.[group] ??
            (typeof value === 'string' ? Number.NaN : value.ratio),
        },
      ])
    ),
  }
}
