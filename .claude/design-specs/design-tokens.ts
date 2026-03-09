/**
 * Oni Auction Platform — Design Tokens
 * Single source of truth for all UI constants.
 * Import this file everywhere; never hardcode hex colors or spacing values.
 */

export const tokens = {
  color: {
    // Semantic bid state — drives all bid-related UI
    bid: {
      winning:     '#16A34A', // green-600  — user is current leader
      losing:      '#DC2626', // red-600    — user was outbid
      neutral:     '#6B7280', // gray-500   — user not in this auction
      closing:     '#D97706', // amber-600  — auction entering final seconds
      dutch_ready: '#2563EB', // blue-600   — Dutch: user about to strike
    },

    // Surfaces
    surface: {
      base:      '#FFFFFF',
      elevated:  '#F9FAFB', // gray-50  — secondary panels
      overlay:   '#111827', // gray-900 — dark modal/overlay backdrop
      muted:     '#F3F4F6', // gray-100 — disabled / closed state
    },

    // Borders
    border: {
      default:  '#E5E7EB', // gray-200
      strong:   '#D1D5DB', // gray-300
      focus:    '#2563EB', // blue-600
    },

    // Text
    text: {
      primary:   '#111827', // gray-900
      secondary: '#6B7280', // gray-500
      tertiary:  '#9CA3AF', // gray-400 — timestamps, metadata
      inverse:   '#F9FAFB', // on dark backgrounds
      winning:   '#16A34A',
      losing:    '#DC2626',
      closing:   '#D97706',
    },

    // Status badges
    status: {
      active:    { bg: '#DCFCE7', text: '#15803D' }, // green-100 / green-700
      closing:   { bg: '#FEF3C7', text: '#B45309' }, // amber-100 / amber-700
      closed:    { bg: '#F3F4F6', text: '#6B7280' }, // gray-100  / gray-500
      scheduled: { bg: '#DBEAFE', text: '#1D4ED8' }, // blue-100  / blue-700
    },
  },

  spacing: {
    // 4px base grid
    px:  '1px',
    0.5: '2px',
    1:   '4px',
    2:   '8px',
    3:   '12px',
    4:   '16px',
    5:   '20px',
    6:   '24px',
    7:   '28px',
    8:   '32px',
    10:  '40px',
    12:  '48px',
    16:  '64px',
  },

  typography: {
    // Procurement users scan, not read — tabular figures for all numbers
    bid_price_hero: {
      size:        '3rem',    // 48px — current bid/price, above the fold
      weight:      '800',
      font:        "'Inter', system-ui, sans-serif",
      features:    "'tnum' on",  // tabular numerals
      lineHeight:  '1',
    },
    bid_price:  {
      size:    '1.75rem',   // 28px — bid history entries
      weight:  '700',
      features: "'tnum' on",
    },
    countdown: {
      size:    '1.5rem',    // 24px
      weight:  '700',
      features: "'tnum' on",
    },
    label: {
      size:          '0.6875rem', // 11px
      weight:        '600',
      letterSpacing: '0.06em',
      textTransform: 'uppercase' as const,
    },
    body: {
      size:       '0.875rem', // 14px
      weight:     '400',
      lineHeight: '1.5',
    },
    caption: {
      size:   '0.75rem', // 12px
      weight: '400',
    },
  },

  radius: {
    sm:   '4px',  // tags, chips, inputs
    md:   '8px',  // cards, panels
    lg:   '12px', // modals, drawers
    full: '9999px', // pills, badges
  },

  shadow: {
    sm:  '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md:  '0 4px 6px -1px rgb(0 0 0 / 0.07), 0 2px 4px -2px rgb(0 0 0 / 0.07)',
    lg:  '0 10px 15px -3px rgb(0 0 0 / 0.08), 0 4px 6px -4px rgb(0 0 0 / 0.08)',
  },

  animation: {
    // Only animate where it communicates meaning
    priceUpdate:   'number-tick 100ms ease-out',  // bid price counting up
    statusFade:    'fade-in 150ms ease-out',      // status badge appearing
    urgentPulse:   'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite', // closing soon
    criticalPulse: 'pulse 0.8s cubic-bezier(0.4, 0, 0.6, 1) infinite', // <60s left
  },

  zIndex: {
    base:    0,
    above:   10,
    sticky:  20,
    overlay: 30,
    modal:   40,
    toast:   50,
  },
} as const

export type BidStatus = 'winning' | 'losing' | 'neutral' | 'closed'
export type AuctionStatus = 'SCHEDULED' | 'ACTIVE' | 'CLOSING' | 'CLOSED'
export type AuctionType   = 'ENGLISH'  | 'DUTCH'
