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

import { SignUp } from '../index'

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
    t: (key: string, options?: Record<string, unknown>) => {
      const source =
        typeof options?.defaultValue === 'string' ? options.defaultValue : key
      return source.replace('{{name}}', String(options?.name ?? '{{name}}'))
    },
  }),
}))

vi.mock('@/hooks/use-status', () => ({
  useStatus: () => ({ status: null }),
}))

vi.mock('@/hooks/use-system-config', () => ({
  useSystemConfig: () => ({
    loading: false,
    logo: '/hemaapi-mark.svg',
    systemName: 'hemaAPI',
  }),
}))

vi.mock('../components/sign-up-form', () => ({
  SignUpForm: (props: { className?: string }) => (
    <form aria-label='Registration form' className={props.className} />
  ),
}))

describe('SignUp Hema layout', () => {
  test('places the registration form and account switch in the Hema auth surface', () => {
    const rendered = render(<SignUp />)

    expect(rendered.container.firstElementChild).toHaveClass(
      'hema-auth-layout',
      'hema-auth-layout--home'
    )
    expect(
      screen.getByRole('heading', { name: 'Create account' })
    ).toBeVisible()
    expect(screen.getByText('Sign up to start using hemaAPI')).toBeVisible()

    const form = screen.getByRole('form', { name: 'Registration form' })
    const card = rendered.container.querySelector('.hema-auth-card')
    expect(card).toContainElement(form)

    const signInLink = screen.getByRole('link', { name: 'Sign in' })
    expect(signInLink).toHaveAttribute('href', '/sign-in')
    expect(signInLink.closest('.hema-auth-panel-footer')).not.toBeNull()
    expect(card).not.toContainElement(signInLink)
  })
})
