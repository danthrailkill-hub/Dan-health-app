import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      // Fetch-on-mount with setState in a .then()/async callback is the standard
      // data-loading pattern and isn't the synchronous-setState case this rule targets.
      'react-hooks/set-state-in-effect': 'off',
    },
  },
  {
    files: ['src/lib/AuthContext.jsx'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
])
