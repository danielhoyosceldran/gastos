# Gastos — Personal Expense Tracker

## What this is

Personal finance PWA. Multi-dimensional expense classification: category (what) + tags (why) + event (which occasion) + project (which goal). Stack: React + Vite + TypeScript + SCSS + Zustand + Supabase + i18next.

## Specs

Full specs live in `plan/`:
- `concept-specs.md` — core data model and design philosophy
- `technical-specs.md` — stack decisions, currency model, RLS, i18n scope
- `architecture-specs.md` — folder structure, state management, services layer
- `db-specs.md` — full schema, triggers, RLS policies, budget RPC
- `ui-specs.md` — design tokens, color system, page layouts, formatting
- `roadmap.md` — 10-phase build plan (Phase 1 DB done, Phase 2 setup done)

## Current state

App is built and runnable: auth (login + `approved` gate + waiting screen),
expenses CRUD, budgets, analytics, settings (categories/tags/tag-groups/payment
methods/events/projects/profile), export (CSV/PDF), PWA install. Routing in
`src/App.tsx` (BrowserRouter). Services in `src/services/supabase/*`, shared
reference data cached in `src/lib/refDataCache.ts` (invalidated by the settings
services on mutation). Default-vs-custom name resolution via `src/lib/displayName.ts`.

Still server-side / process work pending:
- Version the DB schema: only `supabase/migrations/006_analytics.sql` and
  `007_restrict_grants.sql` are committed; run `supabase db pull` to backfill
  the rest from `plan/db-specs.md`.

## Key rules

- `expenses.currency` and `budgets.currency` are set by DB trigger at insert, immutable — never show as editable
- Default data (categories, tags, payment methods) stored as i18n keys in DB, translated at render time; editing a default sets `is_default = false` permanently
- No offline support — online only
- RLS requires `profiles.approved = true` for all data access — new users are blocked until admin sets it via SQL
- Budget progress via Supabase RPC `get_budget_progress(budget_id, year, month)`
- Format currency with `Intl.NumberFormat` using `expense.currency` (not `profiles.currency`) and `profiles.language`

## Commands

```bash
npm run dev      # dev server
npm run build    # production build
npm run preview  # preview build
```

## Env

Copy `.env.example` → `.env` and fill in Supabase credentials.


## Troubleshooting

### Supabase: permission denied for table (42501)

RLS activo pero sin GRANT al role `authenticated`. Solución:

```sql
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
```

> ⚠️ NO conceder a `anon`. La app no lee tablas antes del login (auth via GoTrue,
> `profiles` se lee tras iniciar sesión). Conceder a `anon` elimina defensa en
> profundidad: cualquier política RLS ausente expondría datos sin autenticar.
> Ver `supabase/migrations/007_restrict_grants.sql`.

---

### Supabase: handle_new_user trigger falla al crear usuario

El trigger necesita `SET search_path = public` explícito o no encuentra las tablas del schema público. Solución — recrear la función añadiendo al final:

```sql
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
```

---

### Supabase: trigger on_auth_user_created no aparece en Database → Triggers

Normal — Supabase solo muestra triggers del schema `public` en el dashboard. Los triggers sobre `auth.users` existen pero son invisibles en la UI. Verificar con:

```sql
SELECT trigger_name FROM information_schema.triggers 
WHERE event_object_schema = 'auth' 
  AND event_object_table = 'users';
```