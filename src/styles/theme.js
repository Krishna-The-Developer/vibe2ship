/**
 * Theme Design System
 * Contains centralized color tokens, typography, spacing, and reusable styling constants.
 */
export const theme = {
  colors: {
    bg: {
      main: 'bg-slate-950',
      panel: 'bg-slate-900',
      dark: 'bg-slate-950/60',
      active: 'bg-slate-800',
    },
    text: {
      primary: 'text-slate-100',
      secondary: 'text-slate-400',
      muted: 'text-slate-500',
      white: 'text-white',
    },
    accent: {
      emerald: {
        bg: 'bg-emerald-500/10',
        border: 'border-emerald-500/30',
        text: 'text-emerald-400',
        gradient: 'from-emerald-600 to-teal-600',
        hover: 'hover:from-emerald-500 hover:to-teal-500',
      },
      blue: {
        bg: 'bg-blue-500/10',
        border: 'border-blue-500/30',
        text: 'text-blue-400',
        gradient: 'from-blue-600 to-indigo-600',
      },
      amber: {
        bg: 'bg-amber-500/10',
        border: 'border-amber-500/30',
        text: 'text-amber-400',
      },
      red: {
        bg: 'bg-red-500/10',
        border: 'border-red-500/30',
        text: 'text-red-400',
      },
    },
  },
  typography: {
    family: {
      sans: 'font-sans',
      mono: 'font-mono',
    },
    sizes: {
      title: 'text-2xl font-extrabold tracking-tight',
      subtitle: 'text-sm font-semibold tracking-wide uppercase',
      body: 'text-xs leading-relaxed',
    },
  },
  spacing: {
    panelPadding: 'p-6',
    cardPadding: 'p-5',
    sectionGap: 'gap-6',
  },
  shadows: {
    glow: 'shadow-lg shadow-emerald-500/5',
    glowRed: 'shadow-lg shadow-red-500/5',
    glowBlue: 'shadow-lg shadow-blue-500/5',
    heavy: 'shadow-2xl',
  },
  transitions: {
    fast: 'transition-all duration-150 ease-in-out',
    normal: 'transition-all duration-300 ease-in-out',
    slow: 'transition-all duration-500 ease-in-out',
  },
  borders: {
    panel: 'border border-slate-800/80 rounded-2xl',
    card: 'border border-slate-800 rounded-xl',
  },
};

export default theme;
