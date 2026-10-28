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
import { Link } from '@tanstack/react-router'
import { ArrowRight, ArrowUpRight } from 'lucide-react'
import { lazy, Suspense, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { CodeBlockFrame } from '@/components/ai-elements/code-block'
import { CopyButton } from '@/components/copy-button'
import { EmptyState } from '@/components/empty-state'
import { ErrorState } from '@/components/error-state'
import { LoadingState } from '@/components/loading-state'
import { Button } from '@/components/ui/button'
import { ModelPriceCell } from '@/features/pricing/components/model-price-cell'
import { usePricingData } from '@/features/pricing/hooks/use-pricing-data'
import { getAvailableGroups } from '@/features/pricing/lib/model-helpers'
import { useStatus } from '@/hooks/use-status'
import { useTopNavLinks } from '@/hooks/use-top-nav-links'
import { getLobeIcon } from '@/lib/lobe-icon'
import { getModuleAccessFromStatus } from '@/lib/nav-modules'
import { useAuthStore } from '@/stores/auth-store'

const ModelDetailsDrawer = lazy(() =>
  import('@/features/pricing/components/model-details').then((module) => ({
    default: module.ModelDetailsDrawer,
  }))
)

export function TuringPlatform() {
  const { t } = useTranslation()
  const { status, loading: statusLoading } = useStatus()
  const user = useAuthStore((state) => state.auth.user)
  const navLinks = useTopNavLinks()
  const docsLink = navLinks.find((link) => link.title === t('Docs'))
  const consoleEnabled = navLinks.some((link) => link.href === '/dashboard')
  const access = getModuleAccessFromStatus(status, 'pricing')
  const canReadCatalog =
    !!status && access.enabled && (!access.requireAuth || !!user)
  const pricing = usePricingData(canReadCatalog)
  const [selectedModelName, setSelectedModelName] = useState<string | null>(
    null
  )
  const availableModels = useMemo(
    () =>
      canReadCatalog
        ? pricing.models.filter(
            (model) => getAvailableGroups(model, pricing.usableGroup).length > 0
          )
        : [],
    [canReadCatalog, pricing.models, pricing.usableGroup]
  )
  const featuredModels = availableModels.slice(0, 3)
  const selectedModel = availableModels.find(
    (model) => model.model_name === selectedModelName
  )
  const chatModel = availableModels.find((model) =>
    model.supported_endpoint_types?.includes('openai')
  )
  const baseUrl = useMemo(() => {
    const candidate =
      status?.server_address ??
      status?.serverAddress ??
      (status?.data as Record<string, unknown> | undefined)?.server_address ??
      (status?.data as Record<string, unknown> | undefined)?.serverAddress
    const origin = typeof window === 'undefined' ? '' : window.location.origin
    let base = origin
    if (typeof candidate === 'string') {
      try {
        const parsed = new URL(candidate)
        if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
          base = `${parsed.origin}${parsed.pathname}`
        }
      } catch {
        // Keep the active site's origin when the configured value is not a URL.
      }
    }
    return `${base.replace(/\/+$/, '').replace(/\/v1$/, '')}/v1`
  }, [status])
  const code = chatModel
    ? [
        'import OpenAI from "openai";',
        '',
        'const client = new OpenAI({',
        `  baseURL: ${JSON.stringify(baseUrl)},`,
        '  apiKey: "YOUR_API_KEY",',
        '});',
        '',
        'const response = await client.chat.completions.create({',
        `  model: ${JSON.stringify(chatModel.model_name)},`,
        '  messages: [{ role: "user", content: "Hello." }],',
        '});',
      ].join('\n')
    : ''

  let modelContent
  if (statusLoading || (canReadCatalog && pricing.isLoading)) {
    modelContent = <LoadingState message={t('Loading models...')} />
  } else if (!access.enabled || !status) {
    modelContent = (
      <EmptyState title={t('Model catalog is currently unavailable.')} />
    )
  } else if (!canReadCatalog) {
    modelContent = <EmptyState title={t('Sign in to view available models.')} />
  } else if (pricing.error) {
    modelContent = (
      <ErrorState
        title={t('Unable to load the model catalog')}
        onRetry={() => void pricing.refetch()}
      />
    )
  } else if (!featuredModels.length) {
    modelContent = <EmptyState title={t('No models available')} />
  } else {
    modelContent = (
      <div className='hema-turing-model-list'>
        {featuredModels.map((model) => (
          <article className='hema-turing-model-row' key={model.model_name}>
            <div className='hema-turing-model-identity'>
              <span className='hema-turing-model-icon' aria-hidden>
                {getLobeIcon(model.icon || model.vendor_icon || '', 28) ||
                  model.model_name.charAt(0).toUpperCase()}
              </span>
              <div>
                {model.vendor_name && <p>{model.vendor_name}</p>}
                <h3>
                  <Button
                    variant='ghost'
                    className='hema-turing-model-name'
                    onClick={() => setSelectedModelName(model.model_name)}
                  >
                    {model.model_name}
                  </Button>
                </h3>
                {model.description && (
                  <p className='hema-turing-model-description'>
                    {model.description}
                  </p>
                )}
              </div>
            </div>
            <div className='hema-turing-model-price'>
              <ModelPriceCell
                model={model}
                options={{
                  compact: true,
                  tokenUnit: 'M',
                  priceRate: pricing.priceRate,
                  usdExchangeRate: pricing.usdExchangeRate,
                }}
              />
            </div>
            <Button
              className='hema-turing-model-detail'
              variant='ghost'
              size='icon'
              aria-label={t('View details for {{model}}', {
                model: model.model_name,
              })}
              onClick={() => setSelectedModelName(model.model_name)}
            >
              <ArrowUpRight aria-hidden />
            </Button>
          </article>
        ))}
      </div>
    )
  }

  return (
    <div className='hema-turing-platform'>
      <section
        id='home-models'
        className='hema-turing-platform-section'
        aria-labelledby='home-models-title'
      >
        <div className='hema-turing-platform-heading'>
          <div>
            <p className='hema-turing-kicker'>{t('Connected intelligence')}</p>
            <h2 id='home-models-title'>
              {t('Many possibilities. One place to begin.')}
            </h2>
          </div>
          <p>{t('Choose a model. Compare its prices. Make it your own.')}</p>
        </div>
        {modelContent}
        {access.enabled && (
          <div className='hema-turing-platform-foot'>
            <span>
              {t('Original prices and group discounts, clearly presented.')}
            </span>
            <Button variant='ghost' role='link' render={<Link to='/pricing' />}>
              {t('Explore the model catalog')} <ArrowRight aria-hidden />
            </Button>
          </div>
        )}
      </section>

      <section
        id='home-connect'
        className='hema-turing-platform-section hema-turing-connect'
        aria-labelledby='home-connect-title'
      >
        <div className='hema-turing-connect-copy'>
          <p className='hema-turing-kicker'>{t('Your first connection')}</p>
          <h2 id='home-connect-title'>{t('From an idea to an API call.')}</h2>
          <p>{t('Use your API key with a model available to your account.')}</p>
          <div className='hema-turing-connect-actions'>
            {consoleEnabled && (
              <Button role='link' render={<Link to='/keys' />}>
                {t('Manage API keys')} <ArrowUpRight aria-hidden />
              </Button>
            )}
            {docsLink && (
              <Button
                variant='ghost'
                role='link'
                render={
                  docsLink.external ? (
                    <a
                      href={docsLink.href}
                      target='_blank'
                      rel='noopener noreferrer'
                    />
                  ) : (
                    <Link to={docsLink.href} />
                  )
                }
              >
                {t('Read the docs')} <ArrowRight aria-hidden />
              </Button>
            )}
          </div>
        </div>
        <div className='hema-turing-connect-code'>
          {code ? (
            <>
              <CodeBlockFrame
                showToolbar
                title='JavaScript / OpenAI SDK'
                endActions={
                  <CopyButton
                    value={code}
                    aria-label={t('Copy request example')}
                    size='sm'
                  />
                }
              >
                <pre tabIndex={0} aria-label={t('Request example')}>
                  <code>{code}</code>
                </pre>
              </CodeBlockFrame>
              <p className='hema-turing-code-note'>
                {t('Replace YOUR_API_KEY with your API key.')}
              </p>
            </>
          ) : (
            <div className='hema-turing-connect-empty'>
              <p>{t('Your connection starts with an available model.')}</p>
              <p>
                {t(
                  'Choose a model in the catalog to see its supported API and request examples.'
                )}
              </p>
            </div>
          )}
        </div>
      </section>

      <section
        className='hema-turing-legacy'
        aria-labelledby='home-legacy-title'
      >
        <div className='hema-turing-legacy-mark' aria-hidden>
          T.
        </div>
        <div>
          <p className='hema-turing-kicker'>
            {t('The human behind the machine')}
          </p>
          <h2 id='home-legacy-title'>
            {t('It begins with curiosity. It continues with you.')}
          </h2>
          {consoleEnabled && (
            <Button
              variant='ghost'
              role='link'
              render={<Link to='/dashboard' />}
            >
              {t('Open console')} <ArrowUpRight aria-hidden />
            </Button>
          )}
        </div>
      </section>
      <footer className='hema-turing-platform-footer'>
        <p>
          {t(
            'An artistic tribute to Turing and the Bombe, not an engineering reconstruction.'
          )}
        </p>
        {access.enabled && (
          <Link to='/pricing'>
            {t('Model Square')} <ArrowRight aria-hidden />
          </Link>
        )}
      </footer>
      {selectedModel && (
        <Suspense fallback={null}>
          <ModelDetailsDrawer
            open
            onOpenChange={(open) => {
              if (!open) {
                setSelectedModelName(null)
              }
            }}
            model={selectedModel}
            groupRatio={pricing.groupRatio}
            usableGroup={pricing.usableGroup}
            autoGroups={pricing.autoGroups}
            endpointMap={
              pricing.endpointMap as Record<
                string,
                { path?: string; method?: string }
              >
            }
            priceRate={pricing.priceRate}
            usdExchangeRate={pricing.usdExchangeRate}
            tokenUnit='M'
          />
        </Suspense>
      )}
    </div>
  )
}
