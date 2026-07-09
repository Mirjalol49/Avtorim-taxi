import type { Config } from 'tailwindcss';

export default {
    content: [
        './index.html',
        './*.{ts,tsx}',
        './components/**/*.{ts,tsx}',
        './src/**/*.{ts,tsx}',
        './services/**/*.{ts,tsx}',
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                // Design-system surface tokens — resolve via CSS var so
                // dark/light switch automatically cascades everywhere.
                surface:   'var(--color-surface)',
                'surface-2': 'var(--color-surface-2)',
                'surface-3': 'var(--color-surface-3)',

                // Cyanide palette — teal primary overridden to match spec.
                // dark mode  primary: #6bd8cb  (teal-400)
                // light mode primary: #00685f  (teal-700)
                teal: {
                    50:  '#f0fdfa',
                    100: '#ccfbf1',
                    200: '#99f6e4',
                    300: '#89f5e7',  // primary-fixed
                    400: '#6bd8cb',  // Cyanide Night primary
                    500: '#29a195',  // primary-container dark
                    600: '#008378',  // primary-container light
                    700: '#00685f',  // Cyanide Day primary
                    800: '#005049',  // on-primary-fixed-variant
                    900: '#003732',  // on-primary dark
                    950: '#00201d',
                },

                // Accent token wired to CSS variable — flips with theme.
                accent: 'var(--color-accent)',

                // Legacy primary kept for backwards-compat.
                primary: {
                    DEFAULT: 'var(--color-accent)',
                    hover:   'var(--color-accent-hover)',
                    light:   'var(--color-accent-light)',
                },

                // Gray scale — Cyanide-aligned cool blue-gray slate palette.
                gray: {
                    50:  '#f8faff',
                    100: '#eef0ff',
                    200: '#dae2fd',
                    300: '#bcc9c6',
                    400: '#879391',
                    500: '#6b7a7e',
                    600: '#3d4947',
                    700: '#2d3449',
                    800: '#222a3d',
                    900: '#131b2e',
                    950: '#060e20',
                },
            },

            fontFamily: {
                heading: ['Manrope', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
                sans: [
                    'Inter', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto',
                    'Oxygen', 'Ubuntu', 'Cantarell', '"Fira Sans"', '"Droid Sans"',
                    '"Helvetica Neue"', 'sans-serif',
                ],
            },

            letterSpacing: {
                tight: '-0.02em',
                snug:  '-0.01em',
                caps:   '0.05em',
            },

            borderRadius: {
                'ds-sm':  '0.25rem',
                'ds':     '0.5rem',
                'ds-md':  '0.75rem',
                'ds-lg':  '1rem',
                'ds-xl':  '1.5rem',
            },

            boxShadow: {
                'modal': '0px 20px 50px rgba(0,0,0,0.5)',
                'card':  '0px 10px 30px rgba(15,23,42,0.08)',
            },
        },
    },
    plugins: [],
} satisfies Config;
