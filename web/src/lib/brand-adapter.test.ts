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

import { adaptSystemLogo, adaptSystemName } from './brand-adapter'

describe('Hema brand adapter', () => {
  test('maps upstream defaults to the Hema brand', () => {
    expect(adaptSystemName('New API')).toBe('hemaAPI')
    expect(adaptSystemName('')).toBe('hemaAPI')
    expect(adaptSystemLogo('/logo.png')).toBe('/hemaapi-mark.svg')
    expect(adaptSystemLogo(undefined)).toBe('/hemaapi-mark.svg')
  })

  test('preserves custom branding', () => {
    expect(adaptSystemName('Custom Gateway')).toBe('Custom Gateway')
    expect(adaptSystemLogo('https://example.com/brand.svg')).toBe(
      'https://example.com/brand.svg'
    )
  })
})
