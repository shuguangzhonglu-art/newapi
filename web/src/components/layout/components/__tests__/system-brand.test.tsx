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
import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, test, vi } from 'vitest'

import { SystemBrand } from '../system-brand'

vi.mock('@tanstack/react-router', () => ({
  Link: (props: {
    children: ReactNode
    className?: string
    to: string
    'aria-label'?: string
  }) => (
    <a
      href={props.to}
      className={props.className}
      aria-label={props['aria-label']}
    >
      {props.children}
    </a>
  ),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

vi.mock('@/hooks/use-status', () => ({
  useStatus: () => ({
    status: { system_name: 'New API', version: 'v0.1.0' },
  }),
}))

vi.mock('@/hooks/use-system-config', () => ({
  useSystemConfig: () => ({
    logo: '/hemaapi-mark.svg',
    systemName: 'hemaAPI',
  }),
}))

describe('SystemBrand presentation contract', () => {
  test('uses the adapted display name instead of the raw upstream default', () => {
    render(<SystemBrand variant='inline' />)

    expect(screen.getByText('hemaAPI')).toBeVisible()
    expect(screen.queryByText('New API')).not.toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Logo' })).toHaveAttribute(
      'src',
      '/hemaapi-mark.svg'
    )
  })
})
