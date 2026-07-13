/**
 * NAV MENU — the premium dropdown navbar (desktop) + grouped overlay (mobile).
 *
 * Driven entirely by `navConfig.NAV`, so the desktop and mobile views can never
 * drift apart. Desktop groups open on hover (with a small close-delay so the
 * diagonal trip to the panel doesn't drop it) AND on click (touch/keyboard); the
 * chevron flips 180° while open. Auth-gated leaves route through `onLeaf`, which
 * the HeaderBar wires to either navigation or the login overlay.
 *
 * All visuals are pure-CSS (`.gl-nav-*` / `.gl-mnav-*` in index.css) — no extra
 * WebGL/backdrop-filter, 60fps, reduced-motion aware.
 */
import { useCallback, useRef, useState } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  NAV,
  CHEVRON_ICON,
  type NavGroup,
  type NavLeaf,
  type NavPage,
} from './navConfig'

interface NavCommon {
  isEn: boolean
  currentPage?: NavPage
}

// ── Desktop: a hover/click dropdown ──────────────────────────────────────────
function GroupMenu({
  group,
  isEn,
  currentPage,
}: NavCommon & { group: NavGroup }) {
  const [open, setOpen] = useState(false)
  const timer = useRef<number | undefined>(undefined)

  const openNow = useCallback(() => {
    if (timer.current) window.clearTimeout(timer.current)
    setOpen(true)
  }, [])
  // brief delay so moving the cursor from trigger → panel across the gap doesn't close it
  const closeSoon = useCallback(() => {
    timer.current = window.setTimeout(() => setOpen(false), 110)
  }, [])

  const active =
    currentPage !== undefined && group.items.some((i) => i.page === currentPage)

  return (
    <div
      className="gl-nav-group"
      onMouseEnter={openNow}
      onMouseLeave={closeSoon}
    >
      <button
        type="button"
        className={`gl-nav-trigger${active ? ' header-nav-active' : ''}`}
        data-open={open}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span>{isEn ? group.label : group.zh}</span>
        <HugeiconsIcon
          icon={CHEVRON_ICON}
          size={13}
          strokeWidth={2.2}
          className="gl-nav-chev"
        />
      </button>

      {open && (
        <div
          className={`gl-nav-dropdown gl-expand-in${group.columns === 2 ? ' gl-nav-dropdown--mega' : ''}`}
          role="menu"
        >
          {group.items.map((leaf) => (
            <a
              key={leaf.page}
              href={leaf.path}
              role="menuitem"
              className={`gl-nav-dd-item${leaf.page === currentPage ? ' is-active' : ''}`}
              onClick={() => setOpen(false)}
            >
              <span className="gl-nav-dd-ico">
                <HugeiconsIcon icon={leaf.icon} size={18} strokeWidth={1.8} />
              </span>
              <span className="gl-nav-dd-text">
                <span className="gl-nav-dd-label">
                  {isEn ? leaf.label : leaf.zh}
                </span>
                <span className="gl-nav-dd-desc">
                  {isEn ? leaf.desc : leaf.descZh}
                </span>
              </span>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}

function LinkItem({ leaf, isEn, currentPage }: NavCommon & { leaf: NavLeaf }) {
  const active = leaf.page === currentPage
  return (
    <a
      href={leaf.path}
      className={`gl-nav-link${active ? ' header-nav-active' : ''}`}
    >
      <span>{isEn ? leaf.label : leaf.zh}</span>
    </a>
  )
}

export function DesktopNav(props: NavCommon) {
  return (
    <div className="flex items-center gap-0.5">
      {NAV.map((entry) =>
        entry.kind === 'group' ? (
          <GroupMenu key={entry.group.id} group={entry.group} {...props} />
        ) : (
          <LinkItem key={entry.leaf.page} leaf={entry.leaf} {...props} />
        )
      )}
    </div>
  )
}

// ── Mobile: grouped sections, every leaf a tappable row with its icon ─────────
function MobileRow({ leaf, isEn, currentPage }: NavCommon & { leaf: NavLeaf }) {
  const active = leaf.page === currentPage
  return (
    <a href={leaf.path} className={`gl-mnav-row${active ? ' is-active' : ''}`}>
      <span className="gl-mnav-ico">
        <HugeiconsIcon icon={leaf.icon} size={20} strokeWidth={1.8} />
      </span>
      <span className="gl-mnav-text">
        <span className="gl-mnav-label">{isEn ? leaf.label : leaf.zh}</span>
        <span className="gl-mnav-desc">{isEn ? leaf.desc : leaf.descZh}</span>
      </span>
      <HugeiconsIcon
        icon={CHEVRON_ICON}
        size={16}
        strokeWidth={2}
        className="gl-mnav-arrow"
      />
    </a>
  )
}

export function MobileNav(props: NavCommon) {
  const { isEn } = props
  return (
    <div className="flex flex-col gap-5">
      {NAV.map((entry) => {
        if (entry.kind === 'link') {
          return (
            <MobileRow key={entry.leaf.page} leaf={entry.leaf} {...props} />
          )
        }
        const g = entry.group
        return (
          <div key={g.id} className="flex flex-col gap-1">
            <div className="gl-mnav-section">{isEn ? g.label : g.zh}</div>
            {g.items.map((leaf) => (
              <MobileRow key={leaf.page} leaf={leaf} {...props} />
            ))}
          </div>
        )
      })}
    </div>
  )
}
