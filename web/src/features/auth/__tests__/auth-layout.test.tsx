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

import { AuthLayout } from '../auth-layout'

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
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) =>
      typeof options?.defaultValue === 'string' ? options.defaultValue : key,
  }),
}))

vi.mock('@/hooks/use-system-config', () => ({
  useSystemConfig: () => ({
    loading: false,
    logo: '/hemaapi-mark.svg',
    systemName: 'hemaAPI',
  }),
}))

describe('AuthLayout presentation contract', () => {
  test('uses the Hema surface for auxiliary authentication flows', () => {
    const rendered = render(
      <AuthLayout>
        <form aria-label='Auxiliary authentication form' />
      </AuthLayout>
    )

    expect(rendered.container.firstElementChild).toHaveClass(
      'hema-auth-layout',
      'hema-auth-layout--default'
    )
    const homeLinks = screen.getAllByRole('link', { name: 'Home' })
    expect(homeLinks).toHaveLength(2)
    homeLinks.forEach((link) => expect(link).toHaveAttribute('href', '/'))
    expect(screen.getAllByText('hemaAPI')).toHaveLength(2)
    expect(
      rendered.container.querySelector('.hema-auth-card')
    ).toContainElement(
      screen.getByRole('form', { name: 'Auxiliary authentication form' })
    )
  })
})
