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
import type { ColumnDef } from '@tanstack/react-table'
import { ArrowUpRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import {
  BadgeCell,
  BadgeListCell,
  DataTableColumnHeader,
} from '@/components/data-table'
import { GroupBadge } from '@/components/group-badge'
import { StatusBadge } from '@/components/status-badge'
import { Button } from '@/components/ui/button'
import { getLobeIcon } from '@/lib/lobe-icon'

import { parseTags } from '../lib/filters'
import type { PricingModel } from '../types'
import { CachedPriceCell } from './cached-price-cell'
import { ModelBillingModeBadge } from './model-billing-mode-badge'
import { ModelPriceCell, type ModelPriceCellOptions } from './model-price-cell'

// ----------------------------------------------------------------------------
// Pricing Table Columns
// ----------------------------------------------------------------------------

export type PricingColumnsOptions = ModelPriceCellOptions & {
  onModelClick?: (modelName: string) => void
}

export function usePricingColumns(
  options: PricingColumnsOptions = {}
): ColumnDef<PricingModel>[] {
  const { t } = useTranslation()

  return [
    // Model column
    {
      accessorKey: 'model_name',
      meta: { label: t('Model') },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t('Model')} />
      ),
      cell: ({ row }) => {
        const model = row.original
        const modelIconKey = model.icon || model.vendor_icon
        const modelIcon = modelIconKey ? getLobeIcon(modelIconKey, 14) : null

        return (
          <div className='hema-catalog-table-model flex max-w-full min-w-0 items-start gap-3'>
            {modelIcon}
            <div className='min-w-0'>
              {options.onModelClick ? (
                <Button
                  variant='ghost'
                  className='hema-model-title h-auto max-w-full justify-start px-0 py-0 text-left text-sm font-medium [overflow-wrap:anywhere] whitespace-normal'
                  onClick={() => options.onModelClick?.(model.model_name)}
                >
                  {model.model_name}
                </Button>
              ) : (
                <span className='text-sm font-medium [overflow-wrap:anywhere]'>
                  {model.model_name}
                </span>
              )}
              {model.vendor_name && (
                <span className='text-muted-foreground mt-1 block truncate text-xs'>
                  {model.vendor_name}
                </span>
              )}
              {model.description && (
                <p
                  className='text-muted-foreground mt-1 line-clamp-1 text-xs'
                  title={model.description}
                >
                  {model.description}
                </p>
              )}
            </div>
          </div>
        )
      },
      minSize: 240,
      size: 360,
      enableHiding: false,
      enableSorting: false,
    },

    // Price column
    {
      accessorKey: 'price',
      meta: { label: t('Price') },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t('Price')} />
      ),
      cell: ({ row }) => (
        <ModelPriceCell
          model={row.original}
          options={options}
          showExpression={false}
        />
      ),
      size: 260,
      enableHiding: false,
      enableSorting: false,
    },

    // Type column
    {
      accessorKey: 'quota_type',
      header: t('Type'),
      cell: ({ row }) => (
        <ModelBillingModeBadge model={row.original} appearance='caption' />
      ),
      size: 110,
      enableSorting: false,
    },

    // Cached price column (Vercel AI Gateway style)
    {
      id: 'cached_price',
      accessorFn: (model) => model.cache_ratio,
      header: t('Cached'),
      cell: ({ row }) => (
        <CachedPriceCell model={row.original} options={options} />
      ),
      size: 110,
      enableSorting: false,
    },

    // Vendor column
    {
      accessorKey: 'vendor_name',
      header: t('Vendor'),
      cell: ({ row }) => {
        const model = row.original
        if (!model.vendor_name) {
          return <span className='text-muted-foreground/50 text-xs'>—</span>
        }
        const vendorIcon = model.vendor_icon
          ? getLobeIcon(model.vendor_icon, 12)
          : null
        return (
          <BadgeCell className='gap-1.5'>
            {vendorIcon}
            <StatusBadge
              label={model.vendor_name}
              autoColor={model.vendor_name}
              size='sm'
              copyable={false}
            />
          </BadgeCell>
        )
      },
      size: 130,
      enableSorting: false,
    },

    // Tags column
    {
      accessorKey: 'tags',
      header: t('Tags'),
      cell: ({ row }) => {
        const tags = parseTags(row.original.tags)
        return (
          <BadgeListCell
            items={tags.map((tag) => (
              <StatusBadge
                key={tag}
                label={tag}
                autoColor={tag}
                size='sm'
                copyable={false}
              />
            ))}
          />
        )
      },
      size: 140,
      enableSorting: false,
    },

    // Endpoints column
    {
      accessorKey: 'supported_endpoint_types',
      header: t('Endpoints'),
      cell: ({ row }) => {
        const endpoints = row.original.supported_endpoint_types || []
        return (
          <BadgeListCell
            items={endpoints.map((ep) => (
              <StatusBadge
                key={ep}
                label={ep}
                autoColor={ep}
                size='sm'
                copyable={false}
              />
            ))}
          />
        )
      },
      size: 130,
      enableSorting: false,
    },

    // Enable Groups column
    {
      accessorKey: 'enable_groups',
      header: t('Groups'),
      cell: ({ row }) => {
        const groups = row.original.enable_groups || []
        return (
          <BadgeListCell
            items={groups.map((group) => (
              <GroupBadge key={group} group={group} size='sm' />
            ))}
            tooltipClassName='max-w-[280px] p-2'
          />
        )
      },
      size: 130,
      enableSorting: false,
    },
    {
      id: 'details',
      header: '',
      cell: ({ row }) =>
        options.onModelClick ? (
          <Button
            variant='ghost'
            size='icon'
            aria-label={t('View details for {{model}}', {
              model: row.original.model_name,
            })}
            onClick={() => options.onModelClick?.(row.original.model_name)}
          >
            <ArrowUpRight className='size-4' aria-hidden />
          </Button>
        ) : null,
      size: 52,
      enableHiding: false,
      enableSorting: false,
    },
  ]
}
