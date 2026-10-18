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
import { DEFAULT_LOGO, DEFAULT_SYSTEM_NAME } from '@/lib/constants'

const UPSTREAM_DEFAULT_SYSTEM_NAME = 'New API'
const UPSTREAM_DEFAULT_LOGO = '/logo.png'

export function adaptSystemName(value: unknown): string {
  const name = typeof value === 'string' ? value.trim() : ''
  return !name || name === UPSTREAM_DEFAULT_SYSTEM_NAME
    ? DEFAULT_SYSTEM_NAME
    : name
}

export function adaptSystemLogo(value: unknown): string {
  const logo = typeof value === 'string' ? value.trim() : ''
  return !logo || logo === UPSTREAM_DEFAULT_LOGO ? DEFAULT_LOGO : logo
}
