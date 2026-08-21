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
import { describe, expect, test, vi } from 'vitest'

import { Table, TableBody } from '@/components/ui/table'

import { TableEmpty } from '../table-empty'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

describe('TableEmpty presentation contract', () => {
  test('keeps the message inside a viewport-sized sticky wrapper', () => {
    const rendered = render(
      <Table>
        <TableBody>
          <TableEmpty colSpan={8} title='No rows' description='Create one.' />
        </TableBody>
      </Table>
    )

    expect(screen.getByText('No rows')).toBeVisible()
    expect(
      rendered.container.querySelector(
        '[data-slot="data-table-empty-viewport"]'
      )
    ).not.toBeNull()
  })
})
