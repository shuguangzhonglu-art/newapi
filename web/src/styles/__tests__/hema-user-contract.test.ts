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
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, test } from 'vitest'

const hemaStyles = readFileSync(
  resolve(process.cwd(), 'src/styles/hema-user.css'),
  'utf8'
)

const adminSurfaceFiles = [
  'features/channels/index.tsx',
  'features/redemption-codes/index.tsx',
  'features/subscriptions/index.tsx',
  'features/system-info/index.tsx',
  'features/system-settings/components/settings-page.tsx',
  'features/users/index.tsx',
]

describe('Hema shared primitive style contract', () => {
  test.each([
    'admin-info-code',
    'admin-info-panel',
    'alert-dialog-content',
    'calendar',
    'combobox-content',
    'dialog-content',
    'drawer-content',
    'field-error',
    'form-message',
    'global-auto-order-chip',
    'input-otp-slot',
    'scroll-area-thumb',
    'sheet-content',
    'status-badge',
  ])('covers the %s presentation slot', (slot) => {
    expect(hemaStyles).toContain(`[data-slot='${slot}']`)
  })

  test('keeps portal styling scoped to an active Hema surface', () => {
    expect(hemaStyles).toContain(
      'body:has(:is(.hema-user-shell, .hema-public-shell, .hema-auth-layout))'
    )
  })

  test('matches the authoritative Sub2 internal surface grammar', () => {
    expect(hemaStyles).toContain('.hema-user-shell:has(.hema-dashboard) main')
    expect(hemaStyles).toContain(
      'background: color-mix(in srgb, var(--hema-bg) 92%, white 8%);'
    )
    expect(hemaStyles).toContain('font-size: 1.375rem;')
    expect(hemaStyles).toContain(
      'box-shadow: 0 18px 48px rgba(23, 36, 29, 0.13);'
    )
    expect(hemaStyles).toContain('box-shadow: 0 18px 48px rgba(0, 0, 0, 0.24);')
    expect(hemaStyles).toContain(
      'box-shadow: 0 12px 32px rgba(23, 36, 29, 0.14);'
    )
    expect(hemaStyles).not.toContain(
      'box-shadow: 10px 10px 0 var(--hema-signal-soft);'
    )
    expect(hemaStyles).not.toContain('backdrop-filter: blur(12px);')
  })

  test.each(adminSurfaceFiles)(
    'keeps %s inside the shared administrator presentation boundary',
    (file) => {
      const source = readFileSync(resolve(process.cwd(), 'src', file), 'utf8')
      expect(source).toContain('hema-admin-page')
    }
  )
})
