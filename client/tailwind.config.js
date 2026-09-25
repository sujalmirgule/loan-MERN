/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '1rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      colors: {
        background: 'var(--background)',
        surface: 'var(--surface)',
        'surface-elevated': 'var(--surface-elevated)',
        primary: {
          DEFAULT: 'var(--primary)',
          foreground: 'var(--background)',
        },
        secondary: {
          DEFAULT: 'var(--secondary)',
          foreground: 'var(--background)',
        },
        success: 'var(--success)',
        warning: 'var(--warning)',
        danger: 'var(--danger)',
        info: 'var(--info)',
        border: 'var(--border)',
        input: 'var(--input)',
        'input-border': 'var(--input-border)',
        focus: 'var(--focus)',
        placeholder: 'var(--text-muted)',
        disabled: 'var(--disabled)',
        text: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted: 'var(--text-muted)',
        },
        navy: {
          DEFAULT: '#07152F',
          primary: '#07152F',
          secondary: '#0B2147',
          deep: '#123B8E',
          surface: '#0B2147',
          border: '#1E3A6B',
        },
        brand: {
          blue: '#155EEF',
          accent: '#3B82F6',
          light: '#E8F1FF',
          bg: '#F4F8FF',
          border: '#D7E3F5',
        },
        gold: {
          primary: 'var(--gold-primary, #C9A227)',
          bright: 'var(--gold-bright, #D4AF37)',
          muted: 'var(--gold-muted, #A88932)',
          soft: 'var(--gold-soft, #E0C766)',
          bg: 'var(--gold-bg, #FEF9E7)',
          border: 'var(--gold-border, #E6CF7A)',
        },
        /* Legacy mappings for shadcn compatibility */
        card: {
          DEFAULT: 'var(--card)',
          foreground: 'var(--card-foreground)',
          elevated: 'var(--card-elevated, #222222)',
        },
        popover: {
          DEFAULT: 'var(--popover)',
          foreground: 'var(--popover-foreground)',
        },
        muted: {
          DEFAULT: 'var(--muted)',
          foreground: 'var(--muted-foreground)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          foreground: 'var(--accent-foreground)',
        },
        destructive: {
          DEFAULT: 'var(--destructive)',
          foreground: 'var(--destructive-foreground)',
        },
        ring: 'var(--ring)',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      boxShadow: {
        'fintech-sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'fintech-md': '0 4px 6px -1px rgba(0, 0, 0, 0.07), 0 2px 4px -1px rgba(0, 0, 0, 0.04)',
        'fintech-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -2px rgba(0, 0, 0, 0.03)',
      },
    },
  },
  plugins: [],
};
