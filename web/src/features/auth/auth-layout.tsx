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
import { useTranslation } from 'react-i18next'

import { Skeleton } from '@/components/ui/skeleton'
import { useSystemConfig } from '@/hooks/use-system-config'

type AuthLayoutProps = {
  children: React.ReactNode
  panelFooter?: React.ReactNode
  variant?: 'default' | 'home'
}

export function AuthLayout({
  children,
  panelFooter,
  variant = 'default',
}: AuthLayoutProps) {
  const { t } = useTranslation()
  const { systemName, logo, loading } = useSystemConfig()

  return (
    <div className={`hema-auth-layout hema-auth-layout--${variant}`}>
      <div className='hema-auth-noise' aria-hidden='true' />
      <div className='hema-auth-scanlines' aria-hidden='true' />

      <div className='hema-auth-grid'>
        <section className='hema-auth-story'>
          <div className='hema-auth-story-top'>
            <Link to='/' className='hema-auth-brand' aria-label={t('Home')}>
              <span className='hema-auth-brand-mark'>
                {loading ? (
                  <Skeleton className='h-full w-full rounded-none' />
                ) : (
                  <img
                    src={logo}
                    alt=''
                    className='h-full w-full object-cover'
                  />
                )}
              </span>
              <span>{loading ? t('Loading') : systemName}</span>
            </Link>
            <span className='hema-auth-system-state' aria-hidden='true'>
              GATEWAY / ONLINE
            </span>
          </div>

          <div className='hema-auth-story-copy'>
            <p className='hema-auth-kicker' aria-hidden='true'>
              AUTH NODE 01
            </p>
            <h2>
              {t('auth.homeStoryTitle', {
                defaultValue: '世界不是线性外推，做博弈中的重要变量',
              })}
            </h2>
          </div>

          <div className='hema-auth-gravity' aria-hidden='true'>
            <div className='hema-auth-orbit hema-auth-orbit--wide'>
              <span className='hema-auth-planet' />
            </div>
            <div className='hema-auth-orbit hema-auth-orbit--tight'>
              <span className='hema-auth-moon' />
            </div>
            <div className='hema-auth-star' />
          </div>

          <div className='hema-auth-coordinates' aria-hidden='true'>
            <span>AZ 273.8</span>
            <span>EL 036.2</span>
            <span>RNG 08.42</span>
          </div>
        </section>

        <section className='hema-auth-panel'>
          <div className='hema-auth-mobile-top'>
            <Link to='/' className='hema-auth-brand' aria-label={t('Home')}>
              <span className='hema-auth-brand-mark'>
                {loading ? (
                  <Skeleton className='h-full w-full rounded-none' />
                ) : (
                  <img
                    src={logo}
                    alt=''
                    className='h-full w-full object-cover'
                  />
                )}
              </span>
              <span>{loading ? t('Loading') : systemName}</span>
            </Link>
            <span className='hema-auth-system-state' aria-hidden='true'>
              NODE 01
            </span>
          </div>

          <div className='hema-auth-panel-meta' aria-hidden='true'>
            <span>SECURE CHANNEL</span>
            <span>TLS / ACTIVE</span>
          </div>

          <div className='hema-auth-card'>{children}</div>

          {panelFooter ? (
            <div className='hema-auth-panel-footer'>{panelFooter}</div>
          ) : null}

          <div className='hema-auth-copyright'>
            <span>
              &copy; {new Date().getFullYear()} {systemName}
            </span>
            <span>HEMA ACCESS SYSTEM</span>
          </div>
        </section>
      </div>
    </div>
  )
}
