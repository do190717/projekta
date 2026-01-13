// ===========================================
// Projekta - Design System
// ===========================================
// Modern, Professional, Clean
// Inspired by: Linear, Notion, Figma
// ===========================================

export const theme = {
  // ===========================================
  // Colors
  // ===========================================
  colors: {
    // Primary - Deep Blue with Purple undertones
    primary: {
      50: '#EEF2FF',
      100: '#E0E7FF',
      200: '#C7D2FE',
      300: '#A5B4FC',
      400: '#818CF8',
      500: '#6366F1', // Main
      600: '#4F46E5',
      700: '#4338CA',
      800: '#3730A3',
      900: '#312E81',
    },
    
    // Accent - Vibrant Teal
    accent: {
      50: '#F0FDFA',
      100: '#CCFBF1',
      200: '#99F6E4',
      300: '#5EEAD4',
      400: '#2DD4BF',
      500: '#14B8A6', // Main
      600: '#0D9488',
      700: '#0F766E',
      800: '#115E59',
      900: '#134E4A',
    },
    
    // Neutral - Warm Grays
    gray: {
      50: '#FAFAFA',
      100: '#F4F4F5',
      200: '#E4E4E7',
      300: '#D4D4D8',
      400: '#A1A1AA',
      500: '#71717A',
      600: '#52525B',
      700: '#3F3F46',
      800: '#27272A',
      900: '#18181B',
    },
    
    // Semantic Colors
    success: {
      light: '#ECFDF5',
      main: '#10B981',
      dark: '#059669',
    },
    warning: {
      light: '#FFFBEB',
      main: '#F59E0B',
      dark: '#D97706',
    },
    error: {
      light: '#FEF2F2',
      main: '#EF4444',
      dark: '#DC2626',
    },
    info: {
      light: '#EFF6FF',
      main: '#3B82F6',
      dark: '#2563EB',
    },
    
    // Background
    background: {
      primary: '#FAFAFA',
      secondary: '#FFFFFF',
      tertiary: '#F4F4F5',
      elevated: '#FFFFFF',
      overlay: 'rgba(0, 0, 0, 0.5)',
    },
    
    // Text
    text: {
      primary: '#18181B',
      secondary: '#52525B',
      tertiary: '#71717A',
      disabled: '#A1A1AA',
      inverse: '#FFFFFF',
    },
    
    // Borders
    border: {
      light: '#E4E4E7',
      medium: '#D4D4D8',
      dark: '#A1A1AA',
    },
  },
  
  // ===========================================
  // Typography
  // ===========================================
  typography: {
    fontFamily: {
      // Hebrew-friendly fonts
      sans: "'Heebo', 'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif",
      mono: "'JetBrains Mono', 'SF Mono', Consolas, monospace",
    },
    
    fontSize: {
      xs: '0.75rem',     // 12px
      sm: '0.875rem',    // 14px
      base: '1rem',      // 16px
      lg: '1.125rem',    // 18px
      xl: '1.25rem',     // 20px
      '2xl': '1.5rem',   // 24px
      '3xl': '1.875rem', // 30px
      '4xl': '2.25rem',  // 36px
    },
    
    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
    
    lineHeight: {
      tight: 1.25,
      normal: 1.5,
      relaxed: 1.75,
    },
  },
  
  // ===========================================
  // Spacing
  // ===========================================
  spacing: {
    0: '0',
    1: '0.25rem',   // 4px
    2: '0.5rem',    // 8px
    3: '0.75rem',   // 12px
    4: '1rem',      // 16px
    5: '1.25rem',   // 20px
    6: '1.5rem',    // 24px
    8: '2rem',      // 32px
    10: '2.5rem',   // 40px
    12: '3rem',     // 48px
    16: '4rem',     // 64px
    20: '5rem',     // 80px
  },
  
  // ===========================================
  // Border Radius
  // ===========================================
  borderRadius: {
    none: '0',
    sm: '0.375rem',   // 6px
    md: '0.5rem',     // 8px
    lg: '0.75rem',    // 12px
    xl: '1rem',       // 16px
    '2xl': '1.5rem',  // 24px
    full: '9999px',
  },
  
  // ===========================================
  // Shadows
  // ===========================================
  shadows: {
    none: 'none',
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -4px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
    glow: '0 0 20px rgba(99, 102, 241, 0.15)',
    inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)',
  },
  
  // ===========================================
  // Transitions
  // ===========================================
  transitions: {
    fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
    normal: '200ms cubic-bezier(0.4, 0, 0.2, 1)',
    slow: '300ms cubic-bezier(0.4, 0, 0.2, 1)',
    spring: '400ms cubic-bezier(0.34, 1.56, 0.64, 1)',
  },
  
  // ===========================================
  // Z-Index
  // ===========================================
  zIndex: {
    base: 0,
    dropdown: 100,
    sticky: 200,
    modal: 300,
    popover: 400,
    tooltip: 500,
    toast: 600,
  },
  
  // ===========================================
  // Breakpoints
  // ===========================================
  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },
} as const

// ===========================================
// CSS-in-JS Style Objects
// ===========================================

export const baseStyles = {
  // Card Styles
  card: {
    base: {
      backgroundColor: theme.colors.background.secondary,
      borderRadius: theme.borderRadius.xl,
      border: `1px solid ${theme.colors.border.light}`,
      boxShadow: theme.shadows.sm,
      transition: `all ${theme.transitions.normal}`,
    },
    hover: {
      boxShadow: theme.shadows.md,
      borderColor: theme.colors.border.medium,
    },
    elevated: {
      backgroundColor: theme.colors.background.elevated,
      boxShadow: theme.shadows.lg,
      border: 'none',
    },
  },
  
  // Button Styles
  button: {
    base: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing[2],
      fontFamily: theme.typography.fontFamily.sans,
      fontWeight: theme.typography.fontWeight.medium,
      fontSize: theme.typography.fontSize.sm,
      borderRadius: theme.borderRadius.lg,
      cursor: 'pointer',
      transition: `all ${theme.transitions.fast}`,
      border: 'none',
      outline: 'none',
    },
    primary: {
      backgroundColor: theme.colors.primary[500],
      color: theme.colors.text.inverse,
      padding: `${theme.spacing[3]} ${theme.spacing[5]}`,
    },
    secondary: {
      backgroundColor: theme.colors.background.tertiary,
      color: theme.colors.text.primary,
      padding: `${theme.spacing[3]} ${theme.spacing[5]}`,
      border: `1px solid ${theme.colors.border.light}`,
    },
    ghost: {
      backgroundColor: 'transparent',
      color: theme.colors.text.secondary,
      padding: `${theme.spacing[2]} ${theme.spacing[3]}`,
    },
    danger: {
      backgroundColor: theme.colors.error.main,
      color: theme.colors.text.inverse,
      padding: `${theme.spacing[3]} ${theme.spacing[5]}`,
    },
    success: {
      backgroundColor: theme.colors.success.main,
      color: theme.colors.text.inverse,
      padding: `${theme.spacing[3]} ${theme.spacing[5]}`,
    },
  },
  
  // Input Styles
  input: {
    base: {
      width: '100%',
      padding: `${theme.spacing[3]} ${theme.spacing[4]}`,
      backgroundColor: theme.colors.background.secondary,
      border: `1.5px solid ${theme.colors.border.light}`,
      borderRadius: theme.borderRadius.lg,
      fontSize: theme.typography.fontSize.base,
      fontFamily: theme.typography.fontFamily.sans,
      color: theme.colors.text.primary,
      transition: `all ${theme.transitions.fast}`,
      outline: 'none',
      boxSizing: 'border-box' as const,
    },
    focus: {
      borderColor: theme.colors.primary[500],
      boxShadow: `0 0 0 3px ${theme.colors.primary[100]}`,
    },
  },
  
  // Badge/Chip Styles
  badge: {
    base: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: theme.spacing[1],
      padding: `${theme.spacing[1]} ${theme.spacing[3]}`,
      borderRadius: theme.borderRadius.full,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.medium,
      fontFamily: theme.typography.fontFamily.sans,
    },
  },
  
  // Modal Styles
  modal: {
    overlay: {
      position: 'fixed' as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: theme.colors.background.overlay,
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: theme.zIndex.modal,
    },
    content: {
      backgroundColor: theme.colors.background.secondary,
      borderRadius: theme.borderRadius['2xl'],
      boxShadow: theme.shadows.xl,
      maxHeight: '90vh',
      overflow: 'auto',
    },
  },
  
  // Header Styles
  header: {
    base: {
      background: `linear-gradient(135deg, ${theme.colors.primary[600]} 0%, ${theme.colors.primary[700]} 100%)`,
      color: theme.colors.text.inverse,
      boxShadow: theme.shadows.lg,
    },
  },
}

// ===========================================
// Animation Keyframes (as CSS string)
// ===========================================

export const animations = `
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  @keyframes fadeInUp {
    from { 
      opacity: 0; 
      transform: translateY(10px); 
    }
    to { 
      opacity: 1; 
      transform: translateY(0); 
    }
  }
  
  @keyframes fadeInDown {
    from { 
      opacity: 0; 
      transform: translateY(-10px); 
    }
    to { 
      opacity: 1; 
      transform: translateY(0); 
    }
  }
  
  @keyframes slideInRight {
    from { 
      opacity: 0;
      transform: translateX(-20px); 
    }
    to { 
      opacity: 1;
      transform: translateX(0); 
    }
  }
  
  @keyframes slideInLeft {
    from { 
      opacity: 0;
      transform: translateX(20px); 
    }
    to { 
      opacity: 1;
      transform: translateX(0); 
    }
  }
  
  @keyframes scaleIn {
    from { 
      opacity: 0;
      transform: scale(0.95); 
    }
    to { 
      opacity: 1;
      transform: scale(1); 
    }
  }
  
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
  
  @keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
  
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  
  @keyframes bounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-4px); }
  }
`

// ===========================================
// Global CSS (as string)
// ===========================================

export const globalStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;600;700&display=swap');
  
  ${animations}
  
  :root {
    --color-primary: ${theme.colors.primary[500]};
    --color-primary-light: ${theme.colors.primary[100]};
    --color-accent: ${theme.colors.accent[500]};
    --color-background: ${theme.colors.background.primary};
    --color-surface: ${theme.colors.background.secondary};
    --color-text: ${theme.colors.text.primary};
    --color-text-secondary: ${theme.colors.text.secondary};
    --color-border: ${theme.colors.border.light};
    --font-sans: ${theme.typography.fontFamily.sans};
    --shadow-sm: ${theme.shadows.sm};
    --shadow-md: ${theme.shadows.md};
    --shadow-lg: ${theme.shadows.lg};
    --radius-lg: ${theme.borderRadius.lg};
    --radius-xl: ${theme.borderRadius.xl};
    --transition-fast: ${theme.transitions.fast};
    --transition-normal: ${theme.transitions.normal};
  }
  
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }
  
  html {
    direction: rtl;
    scroll-behavior: smooth;
  }
  
  body {
    font-family: var(--font-sans);
    background-color: var(--color-background);
    color: var(--color-text);
    line-height: ${theme.typography.lineHeight.normal};
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
  
  /* Scrollbar Styling */
  ::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }
  
  ::-webkit-scrollbar-track {
    background: ${theme.colors.gray[100]};
    border-radius: ${theme.borderRadius.full};
  }
  
  ::-webkit-scrollbar-thumb {
    background: ${theme.colors.gray[300]};
    border-radius: ${theme.borderRadius.full};
  }
  
  ::-webkit-scrollbar-thumb:hover {
    background: ${theme.colors.gray[400]};
  }
  
  /* Selection */
  ::selection {
    background: ${theme.colors.primary[200]};
    color: ${theme.colors.primary[900]};
  }
  
  /* Focus Visible */
  :focus-visible {
    outline: 2px solid ${theme.colors.primary[500]};
    outline-offset: 2px;
  }
  
  /* Animations */
  .animate-fadeIn { animation: fadeIn 0.2s ease-out; }
  .animate-fadeInUp { animation: fadeInUp 0.3s ease-out; }
  .animate-fadeInDown { animation: fadeInDown 0.3s ease-out; }
  .animate-slideInRight { animation: slideInRight 0.3s ease-out; }
  .animate-slideInLeft { animation: slideInLeft 0.3s ease-out; }
  .animate-scaleIn { animation: scaleIn 0.2s ease-out; }
  .animate-pulse { animation: pulse 2s infinite; }
  .animate-spin { animation: spin 1s linear infinite; }
  .animate-bounce { animation: bounce 1s infinite; }
`

// ===========================================
// Utility Functions
// ===========================================

export const getStatusColor = (status: string): { bg: string; text: string; border: string } => {
  const statusColors: { [key: string]: { bg: string; text: string; border: string } } = {
    open: { bg: theme.colors.error.light, text: theme.colors.error.main, border: theme.colors.error.main },
    in_review: { bg: theme.colors.warning.light, text: theme.colors.warning.dark, border: theme.colors.warning.main },
    disputed: { bg: '#FFF7ED', text: '#C2410C', border: '#F97316' },
    approved: { bg: theme.colors.success.light, text: theme.colors.success.dark, border: theme.colors.success.main },
    rejected: { bg: theme.colors.gray[100], text: theme.colors.gray[600], border: theme.colors.gray[400] },
    in_progress: { bg: theme.colors.info.light, text: theme.colors.info.dark, border: theme.colors.info.main },
    completed: { bg: '#D1FAE5', text: '#047857', border: '#059669' },
    verified: { bg: '#EDE9FE', text: '#6D28D9', border: '#7C3AED' },
    cancelled: { bg: theme.colors.gray[100], text: theme.colors.gray[500], border: theme.colors.gray[300] },
  }
  return statusColors[status] || statusColors.open
}

export const hexToRgba = (hex: string, alpha: number): string => {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}
