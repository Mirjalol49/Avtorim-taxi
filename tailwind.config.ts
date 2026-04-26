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
                primary: {
                    DEFAULT: '#0f766e',
                    hover: '#0a5c56',
                    dark: '#0d9488',
                    light: 'rgba(15, 118, 110, 0.10)',
                },
                /* iOS system colors */
                ios: {
                    blue:   '#007AFF',
                    green:  '#34C759',
                    red:    '#FF3B30',
                    orange: '#FF9500',
                    yellow: '#FFCC00',
                    purple: '#AF52DE',
                    teal:   '#5AC8FA',
                    gray:   '#8E8E93',
                    'gray2': '#AEAEB2',
                    'gray3': '#C7C7CC',
                    'gray4': '#D1D1D6',
                    'gray5': '#E5E5EA',
                    'gray6': '#F2F2F7',
                },
            },
            fontFamily: {
                sans: [
                    '-apple-system', 'BlinkMacSystemFont', 'SF Pro Display',
                    'SF Pro Text', '"Segoe UI"', 'Roboto', '"Helvetica Neue"', 'sans-serif',
                ],
            },
            borderRadius: {
                'ios-sm': '8px',
                'ios': '12px',
                'ios-lg': '16px',
                'ios-xl': '20px',
            },
            boxShadow: {
                'ios-sm': '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)',
                'ios': '0 2px 8px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.05)',
                'ios-md': '0 4px 16px rgba(0,0,0,0.10), 0 2px 6px rgba(0,0,0,0.06)',
                'ios-lg': '0 8px 32px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.07)',
            },
        },
    },
    plugins: [],
} satisfies Config;
