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
      // @Output() nommé comme un événement DOM : interdit (masque l'événement natif).
      '@angular-eslint/no-output-native': 'error',
      // Angular 22 : OnPush par défaut. La migration v22 a gardé le comportement
      // d'avant (ChangeDetectionStrategy.Eager explicite sur les 31 composants) ;
      // on la conserve et on passe les composants en OnPush progressivement.
      '@angular-eslint/prefer-on-push-component-change-detection': 'off',
    },
  },
  {
    files: ['**/*.html'],
    extends: [angular.configs.templateRecommended, angular.configs.templateAccessibility],
    // Accessibilité : bloquante pour la CI depuis que l'admin est en règle
    // (libellés reliés aux champs, modales fermables au clavier).
    rules: {
      '@angular-eslint/template/label-has-associated-control': 'error',
      '@angular-eslint/template/click-events-have-key-events': 'error',
      '@angular-eslint/template/interactive-supports-focus': 'error',
    },
  },
]);
