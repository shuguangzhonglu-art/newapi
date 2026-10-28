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
import { useTranslation } from 'react-i18next'

import { StaticDataTable } from '@/components/data-table'
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { toIntlLocale } from '@/i18n/languages'
import { formatNumber } from '@/lib/format'

import type { ModelPriceLedger, PriceLedgerRow } from '../lib/price-ledger'
import type { TokenUnit } from '../types'

function GroupPriceLabel(props: { row: PriceLedgerRow }) {
  const { t, i18n } = useTranslation()
  const locale = toIntlLocale(i18n.resolvedLanguage || i18n.language)
  const ratio = props.row.ratio
  let label = t('Not configured')
  if (ratio === 0) label = t('Free')
  else if (ratio === 1) label = t('Base Price')
  else if (ratio != null && ratio < 1) {
    label = t('{{percent}}% of base price', {
      percent: formatNumber(ratio * 100, locale),
      discount: formatNumber(ratio * 10, locale),
    })
  } else if (ratio != null) {
    label = t('{{multiplier}}× base price', {
      multiplier: formatNumber(ratio, locale),
    })
  }
  return (
    <span className='hema-ledger-group-label'>
      <span title={props.row.key}>
        {props.row.description || props.row.key}
      </span>
      <span className='hema-ledger-discount' data-table-text='secondary'>
        {label}
      </span>
    </span>
  )
}

export function ModelPriceLedgerView(props: {
  ledger: ModelPriceLedger
  tokenUnit: TokenUnit
  showRechargePrice?: boolean
}) {
  const { t } = useTranslation()
  const ledger = props.ledger
  let unitLabel = t('Per million tokens')
  if (ledger.unit === 'request') unitLabel = t('Per request')
  else if (ledger.unit === 'image') unitLabel = t('Per image')
  else if (props.tokenUnit === 'K') unitLabel = t('Per thousand tokens')
  const hasMissing = [ledger.original, ...ledger.groups].some((row) =>
    row.prices.includes('—')
  )
  const hasRange = ledger.original.prices.some((price) => price.includes(' – '))

  return (
    <section className='hema-price-ledger' aria-label={t('Model prices')}>
      <div className='hema-ledger-heading'>
        <h2>{t('Model prices')}</h2>
        <span>
          {unitLabel}
          {props.showRechargePrice && ` · ${t('Recharge-adjusted')}`}
        </span>
      </div>
      <StaticDataTable
        className='hema-ledger-desktop'
        tableClassName='hema-ledger-table'
        tableProps={{ 'aria-label': t('Original and group prices') }}
      >
        <TableHeader>
          <TableRow>
            <TableHead scope='col'>
              <span className='sr-only'>{t('Groups')}</span>
            </TableHead>
            {ledger.columns.map((column) => (
              <TableHead key={column.key} scope='col'>
                {t(column.label)}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow className='hema-ledger-original'>
            <TableHead scope='row'>{t('Model original price')}</TableHead>
            {ledger.original.prices.map((price, index) => (
              <TableCell key={ledger.columns[index].key}>{price}</TableCell>
            ))}
          </TableRow>
          {ledger.groups.length > 0 && (
            <TableRow className='hema-ledger-section-row'>
              <TableCell colSpan={ledger.columns.length + 1}>
                {t('Group prices after discount')}
              </TableCell>
            </TableRow>
          )}
          {ledger.groups.map((row) => (
            <TableRow key={row.key} className='hema-ledger-group'>
              <TableHead scope='row'>
                <GroupPriceLabel row={row} />
              </TableHead>
              {row.prices.map((price, index) => (
                <TableCell key={ledger.columns[index].key}>{price}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </StaticDataTable>
      <div className='hema-ledger-mobile'>
        {[ledger.original, ...ledger.groups].map((row, index) => (
          <section key={row.key} className='hema-ledger-mobile-group'>
            <h3>
              {index === 0 ? (
                t('Model original price')
              ) : (
                <GroupPriceLabel row={row} />
              )}
            </h3>
            <dl>
              {ledger.columns.map((column, columnIndex) => (
                <div key={column.key}>
                  <dt>{t(column.label)}</dt>
                  <dd>{row.prices[columnIndex]}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
      {ledger.groups.length === 0 && (
        <p className='hema-ledger-note'>{t('No group prices available')}</p>
      )}
      {hasRange && (
        <p className='hema-ledger-note'>
          {t('Prices vary by usage tier. See pricing rules for details.')}
        </p>
      )}
      {ledger.isTimePricing && (
        <p className='hema-ledger-note'>
          {t('Prices shown for the current time period.')}
        </p>
      )}
      {hasMissing && (
        <p className='hema-ledger-note'>
          {t('A dash means no separate price is configured.')}
        </p>
      )}
    </section>
  )
}
