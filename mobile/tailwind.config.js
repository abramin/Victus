/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Match web design system - Dark slate backgrounds
        slate: {
          950: '#0d1117',
          900: '#141a1f',
          800: '#1a2129',
          700: '#232a36',
          600: '#334155',
          500: '#64748b',
          400: '#94a3b8',
          300: '#cbd5e1',
          200: '#e2e8f0',
          100: '#f1f5f9',
          50: '#f8fafc',
        },
        // Macro colors
        macro: {
          protein: '#a855f7', // purple-500
          carb: '#f59e0b',    // amber-500
          fat: '#f43f5e',     // rose-500
        },
        // Action colors
        action: {
          primary: '#2563eb',   // blue-600
          success: '#22c55e',   // green-500
          warning: '#eab308',   // yellow-500
          danger: '#ef4444',    // red-500
        },
      },
    },
  },
  plugins: [],
};
