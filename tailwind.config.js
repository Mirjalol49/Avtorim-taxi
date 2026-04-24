/** @type {import('tailwindcss').Config} */
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
                // Override default gray with Tailwind slate — cool blue-gray palette
                // This affects every bg-gray-*, text-gray-*, border-gray-* across the app
                gray: {
                    50:  '#F8FAFC',
                    100: '#F1F5F9',
                    200: '#E2E8F0',
                    300: '#CBD5E1',
                    400: '#94A3B8',
                    500: '#64748B',
                    600: '#475569',
                    700: '#334155',
                    800: '#1E293B',
                    900: '#0F172A',
                    950: '#020617',
                },
                primary: {
                    DEFAULT: '#0f766e',
                    hover:   '#0a5c56',
                    light:   '#CCFBF1',
                },
            },
            fontFamily: {
                sans: [
                    '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto',
                    'Oxygen', 'Ubuntu', 'Cantarell', '"Fira Sans"', '"Droid Sans"',
                    '"Helvetica Neue"', 'sans-serif',
                ],
            },
        },
    },
    plugins: [],
};
