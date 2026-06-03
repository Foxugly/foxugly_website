// @ts-check
const eslint = require('@eslint/js');
const { defineConfig } = require('eslint/config');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');

module.exports = defineConfig([
  {
    files: ['**/*.ts'],
    extends: [
      eslint.configs.recommended,
      tseslint.configs.recommended,
      tseslint.configs.stylistic,
      angular.configs.tsRecommended,
    ],
    processor: angular.processInlineTemplates,
    rules: {
      '@angular-eslint/directive-selector': [
        'error',
        {
          type: 'attribute',
          prefix: 'app',
          style: 'camelCase',
        },
      ],
      '@angular-eslint/component-selector': [
        'error',
        {
          type: 'element',
          prefix: 'app',
          style: 'kebab-case',
        },
      ],
      // `content` des blocs = JSON dynamique du page-builder (typé `any` à dessein) ;
      // les mocks de test utilisent aussi `any`. La règle reste désactivée plutôt que
      // de parsemer le code de casts `unknown`.
      '@typescript-eslint/no-explicit-any': 'off',
      // Le projet mélange volontairement `type` et `interface` (alias locaux courts) :
      // contrainte purement stylistique, non bloquante.
      '@typescript-eslint/consistent-type-definitions': 'off',
      // @Output() nommé comme un événement DOM : suggestion, non bloquant.
      '@angular-eslint/no-output-native': 'warn',
    },
  },
  {
    files: ['**/*.html'],
    extends: [angular.configs.templateRecommended, angular.configs.templateAccessibility],
    // Accessibilité : suggestions suivies en `warn` (non bloquantes pour la CI).
    // Les occurrences actuelles sont dans le back-office admin (outil interne
    // mono-utilisateur) ; à améliorer progressivement sur les pages publiques.
    rules: {
      '@angular-eslint/template/label-has-associated-control': 'warn',
      '@angular-eslint/template/click-events-have-key-events': 'warn',
      '@angular-eslint/template/interactive-supports-focus': 'warn',
    },
  },
]);
