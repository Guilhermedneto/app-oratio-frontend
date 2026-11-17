import type { SVGProps } from 'react'

type P = SVGProps<SVGSVGElement>
const base = (p: P) => ({
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  ...p,
})

export const IconToday = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="4.2" />
    <path d="M12 2.5v2.3M12 19.2v2.3M2.5 12h2.3M19.2 12h2.3M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6" />
  </svg>
)
export const IconRosary = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="6" r="1.3" />
    <circle cx="6.2" cy="9.5" r="1.3" />
    <circle cx="17.8" cy="9.5" r="1.3" />
    <circle cx="6.2" cy="15.5" r="1.3" />
    <circle cx="17.8" cy="15.5" r="1.3" />
    <circle cx="9" cy="19" r="1.3" />
    <circle cx="15" cy="19" r="1.3" />
    <path d="M12 2.2v1.6" />
  </svg>
)
export const IconBook = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 5.5C4 4.7 4.7 4 5.5 4H11v15H5.5C4.7 19 4 18.3 4 17.5zM20 5.5c0-.8-.7-1.5-1.5-1.5H13v15h5.5c.8 0 1.5-.7 1.5-1.5z" />
  </svg>
)
export const IconCandle = (p: P) => (
  <svg {...base(p)}>
    <rect x="8" y="10" width="8" height="10" rx="1.5" />
    <path d="M12 3.2c1.5 1.6 2 2.7 2 3.6a2 2 0 0 1-4 0c0-.9.5-2 2-3.6zM6 20.5h12" />
  </svg>
)
export const IconMore = (p: P) => (
  <svg {...base(p)}>
    <circle cx="5.5" cy="12" r="1.4" />
    <circle cx="12" cy="12" r="1.4" />
    <circle cx="18.5" cy="12" r="1.4" />
  </svg>
)
export const IconChevron = (p: P) => (
  <svg viewBox="0 0 8 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden {...p}>
    <path d="M1 1l6 6-6 6" />
  </svg>
)
export const IconBack = (p: P) => (
  <svg viewBox="0 0 12 20" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" width="12" height="20" aria-hidden {...p}>
    <path d="M10 2L2 10l8 8" />
  </svg>
)
export const IconHeart = (p: P & { filled?: boolean }) => {
  const { filled, ...rest } = p
  return (
    <svg {...base(rest)} fill={filled ? 'currentColor' : 'none'}>
      <path d="M12 20.5s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.7a4.3 4.3 0 0 1 7.5 2.6c0 5.6-7.5 10.2-7.5 10.2z" />
    </svg>
  )
}
export const IconSearch = (p: P) => (
  <svg {...base(p)} width="16" height="16">
    <circle cx="11" cy="11" r="6.5" />
    <path d="M16 16l4.5 4.5" />
  </svg>
)
export const IconCross = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 3v18M6 9h12" />
  </svg>
)
export const IconClose = (p: P) => (
  <svg {...base(p)}>
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
)
