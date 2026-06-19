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

## Current state (Phase 2 complete)

Base structure initialized. Nothing runnable yet — no pages, no routing, no components.

What exists:
- `src/lib/supabase.ts` — Supabase client (needs `.env` with VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY)
- `src/lib/i18n.ts` — i18next setup, 5 languages (en/es/ca/fr/it)
- `src/locales/*.json` — translations for all default data keys
- `src/styles/` — SCSS tokens, reset, typography, mixins, index entry
- `src/store/auth.store.ts` — session, profile, language, currency
- `src/store/expenses.store.ts` — expenses[], activeFilters
- `src/store/settings.store.ts` — UI preferences (sidebar)
- `vite.config.ts` — PWA configured, SCSS alias `@/` → `src/`
- `src/App.tsx` — empty shell, ready for routing

## Next: Phase 3 — Auth

- Login page (email/password, no registration UI)
- Session persistence via Supabase Auth
- `profiles.approved` gate — unapproved users → waiting screen
- Logout

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
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
```

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