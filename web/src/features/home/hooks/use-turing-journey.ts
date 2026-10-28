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
import { useCallback, useEffect, useRef, useState } from 'react'

/** Native document scrolling remains the only continuous journey input. */
export function useTuringJourney(reducedMotion: boolean) {
  const journeyRef = useRef<HTMLElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (reducedMotion) return
    const journey = journeyRef.current
    const stage = stageRef.current
    if (!journey || !stage) return
    let frame = 0
    const update = () => {
      frame = 0
      const rect = journey.getBoundingClientRect()
      const topInset = Number.parseFloat(getComputedStyle(stage).top) || 0
      const travel = Math.max(1, journey.offsetHeight - stage.offsetHeight)
      setProgress(Math.max(0, Math.min(1, (topInset - rect.top) / travel)))
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule, { passive: true })
    const observer = new ResizeObserver(schedule)
    observer.observe(journey)
    observer.observe(stage)
    schedule()
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      observer.disconnect()
    }
  }, [reducedMotion])

  const seek = useCallback(
    (next: number) => {
      const value = Math.max(0, Math.min(1, next))
      if (reducedMotion) {
        setProgress(value)
        return
      }
      const journey = journeyRef.current
      const stage = stageRef.current
      if (!journey || !stage) return
      const topInset = Number.parseFloat(getComputedStyle(stage).top) || 0
      const top = journey.getBoundingClientRect().top + window.scrollY
      const travel = Math.max(1, journey.offsetHeight - stage.offsetHeight)
      window.scrollTo({
        top: top - topInset + travel * value,
        behavior: 'smooth',
      })
    },
    [reducedMotion]
  )

  return { journeyRef, stageRef, progress, seek }
}
