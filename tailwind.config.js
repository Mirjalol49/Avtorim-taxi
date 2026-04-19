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
                primary: {
                    DEFAULT: '#0f766e',
                    hover: '#0a5c56',
                    light: '#e0f2f0',
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
