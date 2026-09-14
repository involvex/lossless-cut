module.exports = {
  extends: ['mifi'],
  parserOptions: {
    project: [
      './tsconfig.json',
      './tsconfig.web.json',
      './tsconfig.main.json',
      './tsconfig.node.json',
      './tsconfig.common.json',
      './tsconfig.preload.json'
    ],
    tsconfigRootDir: __dirname,
  },
  rules: {
    'jsx-a11y/click-events-have-key-events': 0,
    'jsx-a11y/interactive-supports-focus': 0,
    'jsx-a11y/control-has-associated-label': 0,
    'react/no-unused-prop-types': 0,
    'func-call-spacing': 0,
  },

  overrides: [
    {
      files: ['./src/renderer/**/*.{js,cjs,mjs,jsx,ts,tsx,mts}'],
      env: {
        node: false,
        browser: true,
      },
      rules: {
        'no-console': 0,
        'import/no-extraneous-dependencies': 0,
        'unicorn/prefer-global-this': 0,
      },
    },
    {
      files: ['./src/preload/**/*.{js,cjs,jsx,ts,tsx}'],
      env: {
        browser: true,
      },
      rules: {
        'no-console': 0,
        'import/no-extraneous-dependencies': 0,
        'unicorn/prefer-global-this': 0,
      },
    },
    {
      files: ['./script/**/*.{js,cjs,mjs,jsx,ts,tsx,mts}', 'electron.vite.config.ts'],
      rules: {
        'import/no-extraneous-dependencies': ['error', {
          devDependencies: true,
          optionalDependencies: false,
        }],
        'no-console': 0,
      },
    },
  ],
};
