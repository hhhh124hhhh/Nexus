import { writeFileSync } from 'fs';

try {
  console.log('Initializing Tailwind CSS configuration...');
  // 手动创建配置文件
  writeFileSync('./tailwind.config.js', `module.exports = {
  content: [
    './index.html',
    './App.tsx',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        },
        surface: {
          50: '#f8fafc',
          100: '#f1f5f9',
        }
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.5s ease-out forwards',
      },
      keyframes: {
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        }
      }
    },
  },
  plugins: [],
}`);
  
  // 手动创建postcss配置文件
  writeFileSync('./postcss.config.js', `module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}`);
  
  // 创建CSS入口文件
  writeFileSync('./src/style.css', `@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  background-color: #f8fafc; /* slate-50 */
  color: #0f172a; /* slate-900 */
  -webkit-font-smoothing: antialiased;
}
/* Custom scrollbar - Minimalist */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 3px;
}
::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}`);
  
  console.log('Tailwind CSS configuration completed successfully!');
} catch (error) {
  console.error('Error initializing Tailwind CSS:', error);
  process.exit(1);
}