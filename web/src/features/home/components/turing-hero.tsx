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
import { ArrowDown, ArrowUpRight, Pause, Play, X } from 'lucide-react'
import { useCallback, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { useMediaQuery } from '@/hooks/use-media-query'
import { useStatus } from '@/hooks/use-status'
import { useTopNavLinks } from '@/hooks/use-top-nav-links'
import { toIntlLocale } from '@/i18n/languages'
import { formatNumber } from '@/lib/format'

import { useTuringJourney } from '../hooks/use-turing-journey'
import {
  TuringScene,
  type TuringSceneFrame,
  type TuringSceneHandle,
  type TuringScenePart,
  type TuringSceneReady,
} from './turing-scene'

export function TuringHero() {
  const { t, i18n } = useTranslation()
  const { status, loading: statusLoading } = useStatus()
  const navLinks = useTopNavLinks()
  const showCatalogLink =
    !statusLoading &&
    !!status &&
    navLinks.some((link) => link.href === '/pricing' && !link.disabled)
  const showConsoleLink =
    !statusLoading &&
    !!status &&
    navLinks.some((link) => link.href === '/dashboard' && !link.disabled)
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  const journey = useTuringJourney(reducedMotion)
  const sceneRef = useRef<TuringSceneHandle>(null)
  const meterRef = useRef<HTMLSpanElement>(null)
  const percentRef = useRef<HTMLSpanElement>(null)
  const chapterRef = useRef(0)
  const [chapter, setChapter] = useState(0)
  const [paused, setPaused] = useState(false)
  const [ready, setReady] = useState<TuringSceneReady | null>(null)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [selectedPart, setSelectedPart] = useState<TuringScenePart | null>(null)
  const locale = toIntlLocale(i18n.resolvedLanguage || i18n.language)
  const chapters = [
    {
      progress: 0,
      label: t('The complete machine'),
      caption: reducedMotion
        ? t('The complete machine')
        : t('Scroll to explore the machine.'),
    },
    {
      progress: 0.32,
      label: t('Move closer'),
      caption: t('Every rotor has a part to play.'),
    },
    {
      progress: 0.61,
      label: t('Open the machine'),
      caption: t('An intricate system, revealed.'),
    },
    {
      progress: 1,
      label: t('Explore every component'),
      caption: reducedMotion
        ? t('Explore every component')
        : t('Scroll upward to bring it all together.'),
    },
  ]
  const partCopy = {
    shell: {
      title: t('Cabinet and wiring'),
      description: t(
        'The cabinet opens and the wiring separates, revealing the mechanisms inside.'
      ),
    },
    drums: {
      title: t('Rotor assembly'),
      description: t(
        'Insulating shells, locking rings, letter discs and spindles separate along their assembly axes.'
      ),
    },
    hardware: {
      title: t('Contacts and fasteners'),
      description: t(
        'The smaller connections come into view. Each piece belongs to the same working structure.'
      ),
    },
    human: {
      title: t('Alan Turing'),
      description: t(
        'The human figure gives the machine its scale, and the story its beginning.'
      ),
    },
  }
  const part = selectedPart
    ? partCopy[selectedPart.kind as keyof typeof partCopy]
    : null

  const onReady = useCallback((value: TuringSceneReady) => {
    setReady(value)
    setFailed(false)
  }, [])
  const onError = useCallback(() => setFailed(true), [])
  const onFrame = useCallback(
    (value: TuringSceneFrame) => {
      const copyOpacity =
        1 - Math.min(1, Math.max(0, (value.progress - 0.08) / 0.16))
      journey.stageRef.current?.style.setProperty(
        '--turing-copy-opacity',
        String(copyOpacity)
      )
      if (meterRef.current) {
        meterRef.current.style.transform = `scaleX(${value.state.hardware})`
      }
      if (percentRef.current) {
        percentRef.current.textContent = `${Math.round(value.state.hardware * 100)}%`
      }
      if (chapterRef.current !== value.state.chapter) {
        chapterRef.current = value.state.chapter
        setChapter(value.state.chapter)
      }
    },
    [journey.stageRef]
  )

  return (
    <section
      ref={journey.journeyRef}
      className='hema-turing-journey'
      aria-labelledby='turing-home-title'
      data-reduced-motion={reducedMotion}
      data-scene-failed={failed}
      onKeyDown={(event) => {
        if (event.key === 'Escape') sceneRef.current?.clearSelection()
      }}
    >
      <div
        ref={journey.stageRef}
        className='hema-turing-stage'
        data-chapter={chapter}
        data-inspecting={Boolean(selectedPart)}
      >
        <TuringScene
          key={attempt}
          ref={sceneRef}
          progress={journey.progress}
          reducedMotion={reducedMotion}
          paused={paused}
          onReady={onReady}
          onSelect={setSelectedPart}
          onFrame={onFrame}
          onError={onError}
          ariaLabel={t(
            'Interactive three-dimensional Turing machine. Scroll to separate its parts, scroll upward to reassemble, or use the scene stages.'
          )}
        />
        <div className='hema-turing-vignette' aria-hidden />
        <a className='hema-turing-skip' href='#home-models'>
          {t('Skip to models')}
        </a>

        <div
          className='hema-turing-hero-copy'
          aria-hidden={chapter > 0 || Boolean(selectedPart)}
          inert={chapter > 0 || Boolean(selectedPart)}
        >
          <p className='hema-turing-eyebrow'>{t('An homage to curiosity')}</p>
          <h1 id='turing-home-title'>
            {t('Intelligence,')}
            <br />
            <em>{t('set in motion.')}</em>
          </h1>
          <p className='hema-turing-hero-lead'>
            {t('One interface. A world of possibilities.')}
          </p>
          <div className='hema-turing-hero-actions'>
            {showCatalogLink && (
              <Button
                role='link'
                className='hema-turing-primary'
                render={<Link to='/pricing' />}
              >
                {t('Explore models')}
                <ArrowUpRight aria-hidden />
              </Button>
            )}
            {showConsoleLink && (
              <Button
                role='link'
                className='hema-turing-secondary'
                variant='ghost'
                render={<Link to='/keys' />}
              >
                {t('Start building')}
                <ArrowUpRight aria-hidden />
              </Button>
            )}
          </div>
        </div>

        {!ready && !failed && (
          <p className='hema-turing-loading' role='status'>
            {t('Building the machine…')}
          </p>
        )}
        {failed && (
          <div className='hema-turing-scene-error' role='status'>
            <p>
              {t(
                'The 3D scene could not load. You can still explore the models.'
              )}
            </p>
            <Button
              variant='outline'
              onClick={() => {
                setFailed(false)
                setReady(null)
                setAttempt((value) => value + 1)
              }}
            >
              {t('Retry')}
            </Button>
          </div>
        )}

        {!failed && (
          <nav className='hema-turing-stages' aria-label={t('Scene stages')}>
            {chapters.map((item, index) => (
              <Button
                key={item.progress}
                variant='ghost'
                size='icon'
                aria-label={item.label}
                aria-current={chapter === index ? 'step' : undefined}
                onClick={() => journey.seek(item.progress)}
              >
                <span>{String(index + 1).padStart(2, '0')}</span>
                <i aria-hidden />
              </Button>
            ))}
          </nav>
        )}

        {selectedPart && part && (
          <aside
            className='hema-turing-part'
            aria-label={t('Selected component')}
          >
            <Button
              size='icon-sm'
              variant='ghost'
              className='hema-turing-part-close'
              aria-label={t('Close component details')}
              onClick={() => sceneRef.current?.clearSelection()}
            >
              <X aria-hidden />
            </Button>
            <p className='hema-turing-eyebrow'>{t('Selected component')}</p>
            <h2>{part.title}</h2>
            <p>{part.description}</p>
            <span>{t('Keep scrolling to continue exploring.')}</span>
          </aside>
        )}

        <div className='hema-turing-bottom'>
          <div className='hema-turing-caption' aria-live='polite'>
            <span>{String(chapter + 1).padStart(2, '0')} / 04</span>
            <p>{chapters[chapter]?.caption}</p>
          </div>
          <Button
            role='link'
            className='hema-turing-scroll'
            variant='ghost'
            render={<a href='#home-models' />}
          >
            <span>{t('Discover the platform')}</span>
            <ArrowDown aria-hidden />
          </Button>
          <div className='hema-turing-status'>
            {ready && (
              <span className='hema-turing-parts-count'>
                {t('{{total}} components', {
                  total: formatNumber(ready.partCount, locale),
                })}
              </span>
            )}
            <span className='hema-turing-assembly-meter' aria-hidden>
              <span ref={meterRef} />
            </span>
            <span ref={percentRef} aria-hidden>
              0%
            </span>
            <Button
              variant='ghost'
              size='icon-sm'
              disabled={!ready || reducedMotion}
              aria-label={paused ? t('Resume animation') : t('Pause animation')}
              aria-pressed={paused}
              onClick={() => setPaused((value) => !value)}
            >
              {paused ? <Play aria-hidden /> : <Pause aria-hidden />}
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
