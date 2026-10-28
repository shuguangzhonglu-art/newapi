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
import {
  ArrowUpDown,
  ChevronDown,
  Filter,
  SlidersHorizontal,
  X,
} from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { DataTableViewModeToggle } from '@/components/data-table'
import {
  sideDrawerContentClassName,
  sideDrawerFormClassName,
  sideDrawerHeaderClassName,
  sideDrawerFooterClassName,
} from '@/components/drawer-layout'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Popover,
  PopoverContent,
  PopoverTitle,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { useMediaQuery } from '@/hooks/use-media-query'
import { toIntlLocale } from '@/i18n/languages'
import { formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'

import {
  FILTER_ALL,
  getSortLabels,
  getQuotaTypeLabels,
  getEndpointTypeLabels,
  type SortOption,
  type ViewMode,
} from '../constants'
import type { PricingModel, PricingVendor, TokenUnit } from '../types'
import { PricingSidebar } from './pricing-sidebar'
import { SearchBar } from './search-bar'

export interface PricingToolbarProps {
  searchInput?: string
  onSearchChange?: (value: string) => void
  onClearSearch?: () => void
  filteredCount: number
  totalCount?: number
  sortBy: string
  onSortChange: (value: string) => void
  tokenUnit: TokenUnit
  onTokenUnitChange: (value: TokenUnit) => void
  showRechargePrice: boolean
  onRechargePriceChange: (value: boolean) => void
  viewMode: ViewMode
  onViewModeChange: (value: ViewMode) => void
  quotaTypeFilter: string
  endpointTypeFilter: string
  vendorFilter: string
  groupFilter: string
  tagFilter: string
  onQuotaTypeChange: (value: string) => void
  onEndpointTypeChange: (value: string) => void
  onVendorChange: (value: string) => void
  onGroupChange: (value: string) => void
  onTagChange: (value: string) => void
  vendors: PricingVendor[]
  groups: string[]
  groupRatios?: Record<string, number>
  tags: string[]
  models: PricingModel[]
  hasActiveFilters: boolean
  activeFilterCount: number
  onClearFilters: () => void
}

export function PricingToolbar(props: PricingToolbarProps) {
  const { t, i18n } = useTranslation()
  const locale = toIntlLocale(i18n.resolvedLanguage || i18n.language)
  const mobile = useMediaQuery('(max-width: 639px)')
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)
  const sortLabels = getSortLabels(t)
  const quotaLabels = getQuotaTypeLabels(t)
  const endpointLabels = getEndpointTypeLabels(t)
  const filters = [
    {
      key: 'vendor',
      label: t('Vendor'),
      value: props.vendorFilter,
      text: props.vendorFilter,
      onChange: props.onVendorChange,
    },
    {
      key: 'group',
      label: t('Groups'),
      value: props.groupFilter,
      text: props.groupFilter,
      onChange: props.onGroupChange,
    },
    {
      key: 'quota',
      label: t('Pricing Type'),
      value: props.quotaTypeFilter,
      text:
        quotaLabels[props.quotaTypeFilter as keyof typeof quotaLabels] ??
        props.quotaTypeFilter,
      onChange: props.onQuotaTypeChange,
    },
    {
      key: 'endpoint',
      label: t('Endpoint Type'),
      value: props.endpointTypeFilter,
      text:
        endpointLabels[
          props.endpointTypeFilter as keyof typeof endpointLabels
        ] ?? props.endpointTypeFilter,
      onChange: props.onEndpointTypeChange,
    },
    {
      key: 'tag',
      label: t('Tags'),
      value: props.tagFilter,
      text: props.tagFilter,
      onChange: props.onTagChange,
    },
  ].filter((filter) => filter.value !== FILTER_ALL)

  return (
    <div className='hema-pricing-toolbar hema-catalog-toolbar bg-card rounded-xl border p-3'>
      <div className='hema-catalog-command-row'>
        {props.onSearchChange && (
          <SearchBar
            value={props.searchInput ?? ''}
            onChange={props.onSearchChange}
            onClear={props.onClearSearch ?? (() => props.onSearchChange?.(''))}
            placeholder={t('Search models, providers or protocols')}
            className='hema-catalog-search'
          />
        )}
        <div className='hema-catalog-command-actions'>
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={() => setMobileFiltersOpen(true)}
            className='hema-catalog-filter-toggle gap-1.5'
          >
            <Filter className='size-4' aria-hidden />
            {t('Filter')}
            {props.activeFilterCount > 0 && (
              <Badge className='ml-0.5 size-5 justify-center p-0 text-[10px]'>
                {props.activeFilterCount}
              </Badge>
            )}
          </Button>
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger
              render={
                <Button
                  variant='ghost'
                  size='sm'
                  className='hema-catalog-group-choice'
                  aria-label={t('Choose pricing group')}
                />
              }
            >
              <span>
                {props.groupFilter === FILTER_ALL
                  ? t('All Groups')
                  : props.groupFilter}
              </span>
              <ChevronDown className='size-3.5' aria-hidden />
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end'>
              <DropdownMenuRadioGroup
                value={props.groupFilter}
                onValueChange={(value) => props.onGroupChange(value)}
              >
                {[FILTER_ALL, ...props.groups].map((group) => (
                  <DropdownMenuRadioItem key={group} value={group}>
                    {group === FILTER_ALL ? t('All Groups') : group}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger
              render={
                <Button
                  type='button'
                  variant='ghost'
                  size='sm'
                  className='hema-catalog-sort-choice'
                />
              }
            >
              <ArrowUpDown className='size-3.5' aria-hidden />
              <span>{sortLabels[props.sortBy as SortOption] || t('Sort')}</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end' className='w-52'>
              <DropdownMenuRadioGroup
                value={props.sortBy}
                onValueChange={(value) => props.onSortChange(value)}
              >
                {Object.entries(sortLabels).map(([value, label]) => (
                  <DropdownMenuRadioItem key={value} value={value}>
                    {label}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          <DataTableViewModeToggle
            value={props.viewMode}
            onChange={props.onViewModeChange}
          />
        </div>
      </div>
      {props.vendors.length > 0 && (
        <div
          className='hema-catalog-vendors'
          role='group'
          aria-label={t('Vendor')}
        >
          <Button
            variant='ghost'
            size='sm'
            aria-pressed={props.vendorFilter === FILTER_ALL}
            onClick={() => props.onVendorChange(FILTER_ALL)}
          >
            {t('All Vendors')}
          </Button>
          {props.vendors.slice(0, 6).map((vendor) => (
            <Button
              key={vendor.id}
              variant='ghost'
              size='sm'
              aria-pressed={props.vendorFilter === vendor.name}
              onClick={() => props.onVendorChange(vendor.name)}
            >
              {vendor.name}
            </Button>
          ))}
          {props.vendors.length > 6 && (
            <Button
              variant='ghost'
              size='sm'
              onClick={() => setMobileFiltersOpen(true)}
            >
              {t('More providers')}
              <ChevronDown className='size-3' aria-hidden />
            </Button>
          )}
        </div>
      )}
      <div className='hema-catalog-toolbar-heading'>
        <div
          className='hema-catalog-result-count'
          role='status'
          aria-live='polite'
          aria-atomic='true'
        >
          <strong>{formatNumber(props.filteredCount, locale)}</strong>
          <span>{t('models')}</span>
          {props.totalCount != null &&
            props.filteredCount !== props.totalCount && (
              <span className='hema-catalog-total'>
                / {formatNumber(props.totalCount, locale)}
              </span>
            )}
        </div>
        <div className='hema-catalog-price-context'>
          <span>
            {props.groupFilter === FILTER_ALL
              ? t('Lowest available group price')
              : t('Selected group price')}
          </span>
          <Popover>
            <PopoverTrigger
              render={
                <Button
                  variant='ghost'
                  size='sm'
                  aria-label={t('Price display settings')}
                />
              }
            >
              {props.tokenUnit === 'M'
                ? t('Per million tokens')
                : t('Per thousand tokens')}
              {props.showRechargePrice && (
                <span className='hema-catalog-recharge-label'>
                  {t('Recharge-adjusted')}
                </span>
              )}
              <SlidersHorizontal className='size-3.5' aria-hidden />
            </PopoverTrigger>
            <PopoverContent
              align='end'
              className='hema-catalog-price-settings gap-4 p-4'
            >
              <PopoverTitle>{t('Price display settings')}</PopoverTitle>
              <div className='space-y-2'>
                <p className='text-muted-foreground text-xs'>
                  {t('Token unit')}
                </p>
                <ToggleGroup
                  value={[props.tokenUnit]}
                  onValueChange={(values) => {
                    if (values[0] === 'M' || values[0] === 'K') {
                      props.onTokenUnitChange(values[0])
                    }
                  }}
                  variant='outline'
                  size='sm'
                  aria-label={t('Token unit')}
                >
                  <ToggleGroupItem value='M'>
                    {t('Per million tokens')}
                  </ToggleGroupItem>
                  <ToggleGroupItem value='K'>
                    {t('Per thousand tokens')}
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>
              <div className='space-y-2'>
                <p className='text-muted-foreground text-xs'>
                  {t('Price display mode')}
                </p>
                <ToggleGroup
                  value={[props.showRechargePrice ? 'recharge' : 'standard']}
                  onValueChange={(values) => {
                    if (values.length) {
                      props.onRechargePriceChange(values[0] === 'recharge')
                    }
                  }}
                  variant='outline'
                  size='sm'
                  aria-label={t('Price display mode')}
                >
                  <ToggleGroupItem value='standard'>
                    {t('Standard')}
                  </ToggleGroupItem>
                  <ToggleGroupItem value='recharge'>
                    {t('Recharge')}
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {(filters.length > 0 || (props.searchInput && !props.onSearchChange)) && (
        <div
          className='hema-catalog-active-filters'
          role='group'
          aria-label={t('Filters active')}
        >
          {props.searchInput &&
            props.onClearSearch &&
            !props.onSearchChange && (
              <Button
                variant='secondary'
                size='sm'
                onClick={props.onClearSearch}
                aria-label={t('Clear search')}
                title={props.searchInput}
              >
                <span className='truncate'>{props.searchInput}</span>
                <X className='size-3.5 shrink-0' aria-hidden />
              </Button>
            )}
          {filters.map((filter) => (
            <Button
              key={filter.key}
              variant='secondary'
              size='sm'
              onClick={() => filter.onChange(FILTER_ALL)}
              aria-label={t('Remove filter: {{label}}', {
                label: `${filter.label}: ${filter.text}`,
              })}
              title={`${filter.label}: ${filter.text}`}
            >
              <span className='truncate'>
                {filter.label}: {filter.text}
              </span>
              <X className='size-3.5 shrink-0' aria-hidden />
            </Button>
          ))}
          {filters.length > 0 && (
            <Button variant='ghost' size='sm' onClick={props.onClearFilters}>
              {t('Clear all filters')}
            </Button>
          )}
        </div>
      )}

      <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
        <SheetContent
          side={mobile ? 'bottom' : 'right'}
          className={sideDrawerContentClassName(
            cn(
              'hema-catalog-filter-sheet sm:max-w-md',
              mobile && 'inset-x-0 top-auto h-[88dvh] w-full rounded-t-2xl'
            )
          )}
        >
          <SheetHeader className={sideDrawerHeaderClassName()}>
            <SheetTitle>{t('Filter')}</SheetTitle>
            <SheetDescription>
              {t('Filter models by provider, group, type, endpoint, and tags.')}
            </SheetDescription>
          </SheetHeader>
          <div className={sideDrawerFormClassName('gap-0')}>
            <PricingSidebar
              quotaTypeFilter={props.quotaTypeFilter}
              endpointTypeFilter={props.endpointTypeFilter}
              vendorFilter={props.vendorFilter}
              groupFilter={props.groupFilter}
              tagFilter={props.tagFilter}
              onQuotaTypeChange={props.onQuotaTypeChange}
              onEndpointTypeChange={props.onEndpointTypeChange}
              onVendorChange={props.onVendorChange}
              onGroupChange={props.onGroupChange}
              onTagChange={props.onTagChange}
              vendors={props.vendors}
              groups={props.groups}
              groupRatios={props.groupRatios}
              tags={props.tags}
              models={props.models}
              hasActiveFilters={props.hasActiveFilters}
              onClearFilters={props.onClearFilters}
              hideHeader
              className='border-0 bg-transparent p-0 shadow-none'
            />
          </div>
          <div
            className={sideDrawerFooterClassName('hema-catalog-filter-footer')}
          >
            <Button
              variant='outline'
              disabled={!props.hasActiveFilters}
              onClick={props.onClearFilters}
            >
              {t('Reset')}
            </Button>
            <Button
              onClick={() => setMobileFiltersOpen(false)}
              className='w-full'
            >
              {t('View {{count}} models', { count: props.filteredCount })}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
