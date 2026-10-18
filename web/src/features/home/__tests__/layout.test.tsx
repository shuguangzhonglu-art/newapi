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
import { beforeEach, describe, expect, test, vi } from 'vitest'

import { Home } from '../index'

const homeContentState = vi.hoisted(() => ({
  current: {
    content: '',
    isLoaded: true as boolean,
    isUrl: false as boolean,
  },
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    i18n: { language: 'zh' },
    t: (key: string) => key,
  }),
}))

vi.mock('@/components/layout', () => ({
  PublicLayout: (props: { children: ReactNode }) => (
    <div data-testid='public-layout'>{props.children}</div>
  ),
}))

vi.mock('@/components/rich-content', () => ({
  RichContent: (props: { content: string }) => <div>{props.content}</div>,
}))

vi.mock('@/context/theme-provider', () => ({
  useTheme: () => ({ resolvedTheme: 'light' }),
}))

vi.mock('../hooks', () => ({
  useHomePageContent: () => homeContentState.current,
}))

describe('Home Hema adapter', () => {
  beforeEach(() => {
    homeContentState.current = {
      content: '',
      isLoaded: true,
      isUrl: false,
    }
  })

  test('loads the bundled Hema home when no custom content is configured', () => {
    const rendered = render(<Home />)

    const frame = screen.getByTitle('Home')
    expect(frame).toHaveAttribute('src', '/hema-home/home.html')
    expect(frame).toHaveClass('hema-home-frame')
    expect(rendered.container.firstElementChild).toHaveClass(
      'hema-home-frame-shell'
    )
    expect(screen.queryByTestId('public-layout')).not.toBeInTheDocument()
  })

  test('uses the Hema loading state while home settings are unresolved', () => {
    homeContentState.current = {
      content: '',
      isLoaded: false,
      isUrl: false,
    }

    const rendered = render(<Home />)

    expect(rendered.container.firstElementChild).toHaveClass(
      'hema-home-loading'
    )
    expect(screen.getByLabelText('Loading...')).toBeVisible()
    expect(screen.queryByTitle('Home')).not.toBeInTheDocument()
  })

  test('keeps administrator-configured home content ahead of the Hema fallback', () => {
    homeContentState.current = {
      content: 'Configured home content',
      isLoaded: true,
      isUrl: false,
    }

    render(<Home />)

    expect(screen.getByText('Configured home content')).toBeVisible()
    expect(screen.getByTestId('public-layout')).toBeVisible()
    expect(screen.queryByTitle('Home')).not.toBeInTheDocument()
  })
})
