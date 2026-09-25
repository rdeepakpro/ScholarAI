import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'

export default tseslint.config(
  { ignores: ['dist', 'release', 'runtime', 'node_modules'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    languageOptions: { globals: { window: 'readonly', document: 'readonly', localStorage: 'readonly', navigator: 'readonly', location: 'readonly', Blob: 'readonly', FileList: 'readonly', File: 'readonly', crypto: 'readonly', URL: 'readonly', HTMLElement: 'readonly', HTMLInputElement: 'readonly', HTMLButtonElement: 'readonly', MediaQueryList: 'readonly', setTimeout: 'readonly' } },
    rules: { ...reactHooks.configs.recommended.rules, ...reactRefresh.configs.vite.rules, '@typescript-eslint/no-explicit-any': 'off', 'react-hooks/set-state-in-effect': 'off', 'react-hooks/purity': 'off' },
  },
)
