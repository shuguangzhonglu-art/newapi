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
import { describe, expect, test } from 'vitest'

import { SectionPageLayout } from '../section-page-layout'

function renderLayout(fixedContent: boolean) {
  return render(
    <SectionPageLayout fixedContent={fixedContent}>
      <SectionPageLayout.Breadcrumb>Workspace</SectionPageLayout.Breadcrumb>
      <SectionPageLayout.Title>API Keys</SectionPageLayout.Title>
      <SectionPageLayout.Actions>
        <button type='button'>Create</button>
      </SectionPageLayout.Actions>
      <SectionPageLayout.Content>
        <p>Key table</p>
      </SectionPageLayout.Content>
    </SectionPageLayout>
  )
}

describe('SectionPageLayout presentation contract', () => {
  test('renders the shared page regions with the Hema presentation hooks', () => {
    const rendered = renderLayout(false)

    expect(screen.getByRole('heading', { name: 'API Keys' })).toHaveClass(
      'hema-section-page-title'
    )
    expect(screen.getByText('Workspace')).toHaveClass(
      'hema-section-page-breadcrumb'
    )
    expect(
      screen.getByRole('button', { name: 'Create' }).parentElement
    ).toHaveClass('hema-section-page-actions')
    expect(
      rendered.container.querySelector('.hema-section-page')
    ).not.toBeNull()
  })

  test('keeps regular page content scrollable', () => {
    const rendered = renderLayout(false)

    expect(
      rendered.container.querySelector('.hema-section-page-content')
    ).toHaveClass('overflow-auto')
  })

  test('keeps fixed table content inside its own overflow boundary', () => {
    const rendered = renderLayout(true)

    expect(
      rendered.container.querySelector('.hema-section-page-content')
    ).toHaveClass('overflow-hidden')
  })

  test('forwards a presentation class to the page wrapper', () => {
    const rendered = render(
      <SectionPageLayout className='hema-test-page'>
        <SectionPageLayout.Title>Title</SectionPageLayout.Title>
        <SectionPageLayout.Content>Content</SectionPageLayout.Content>
      </SectionPageLayout>
    )

    expect(rendered.container.querySelector('main')).toHaveClass(
      'hema-test-page'
    )
  })
})
