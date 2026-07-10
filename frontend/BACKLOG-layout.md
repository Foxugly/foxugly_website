# Backlog — harmonisation layout · foxugly_website (frontend)

> **Cible :** `STANDARD-frontend-layout.md` (repo `foxugly-ops`).
> **Ce site est l'EXCEPTION documentée** : vitrine publique (HTML/CSS, pas d'auth,
> pas de widgets). Il **n'est pas soumis** au contrat canonique (`app-topmenu`,
> langue, cloches, user…). Backlog volontairement minimal.
> **Statut :** hors périmètre (audit 2026-07-10).

## Optionnel (si on veut)
- [ ] **Dark mode** sur la vitrine : ajouter un `ThemeService` + toggle (mêmes règles :
      `localStorage['theme']`, `.dark-mode`, anti-FOUC). Seulement si tu veux le thème sombre côté public.
- [ ] Aligner l'accent sur **emerald** et le comportement responsive (burger < `--bp-lg`) si on veut
      un minimum de cohérence visuelle avec la flotte.

## Hors périmètre (assumé)
- `app-topmenu` / langue / cloches / user-menu / page-header : **N/A** (vitrine).
