# Architecture Specs: Expense Tracking System

## Stack

| Layer | Technology |
|---|---|
| **Language** | TypeScript |
| **Frontend** | React + Vite |
| **Styles** | SCSS + CSS Modules |
| **Global state** | Zustand |
| **PWA** | vite-plugin-pwa |
| **Hosting** | Vercel |
| **Backend** | Supabase (PostgreSQL + Auth) |
| **i18n** | i18next |

---

## Folder Structure

```
src/
  components/               # Reusable UI components
    Button/
      Button.tsx
      Button.module.scss
    Input/
    Modal/
    ...

  features/                 # Feature-specific components and logic
    expenses/
    budgets/
    categories/
    tags/
    events/
    projects/
    settings/

  services/                 # External integrations and data layer
    supabase/               # Supabase queries, one file per entity
      expenses.service.ts
      categories.service.ts
      tags.service.ts
      budgets.service.ts
      events.service.ts
      projects.service.ts
      auth.service.ts

  hooks/                    # Custom React hooks
    useExpenses.ts
    useAuth.ts
    ...

  store/                    # Zustand global stores
    expenses.store.ts
    auth.store.ts
    settings.store.ts

  lib/                      # Client configuration
    supabase.ts             # Supabase client instance
    i18n.ts                 # i18next setup

  types/                    # TypeScript interfaces and types
    expense.types.ts
    category.types.ts
    tag.types.ts
    budget.types.ts
    user.types.ts

  styles/                   # Global styles
    _variables.scss         # Color, typography and spacing tokens
    _mixins.scss            # Reusable SCSS mixins
    _reset.scss             # Base reset
    _typography.scss        # Global typography rules
    index.scss              # Entry point — imports all globals

  assets/                   # Static assets
    icons/
    images/

  locales/                  # Translation files
    en.json
    es.json
    ca.json
    fr.json
    it.json
```

---

## Styling Convention

- **Global styles** → `src/styles/` — tokens, reset, typography
- **Component styles** → co-located with component as `.module.scss`
- **No global class names** — all component styles are scoped via CSS Modules

```
components/
  Button/
    Button.tsx
    Button.module.scss    # Scoped to Button only
```

---

## State Management (Zustand)

Each store handles one domain. Stores are independent and composable.

| Store | Responsibility |
|---|---|
| `auth.store.ts` | Session, user profile, language, currency |
| `expenses.store.ts` | Cached expenses, active filters |
| `settings.store.ts` | App-wide UI preferences |

---

## Data Flow

```
User action
    │
    ▼
Zustand store (immediate UI update)
    │
    ▼
Supabase service (write to DB)
    │
    ▼
Updated state reflected in UI
```

---

## Services Layer

Each service file maps to one entity and exposes CRUD operations:

```typescript
// services/supabase/expenses.service.ts
export const expensesService = {
  getAll: (userId: string) => { ... },
  create: (expense: CreateExpenseDTO) => { ... },
  update: (id: string, data: UpdateExpenseDTO) => { ... },
  delete: (id: string) => { ... },
}
```

Components call services directly — no intermediate sync layer.

---

## i18n

- Library: `i18next` + `react-i18next`
- Language stored in user profile (Supabase), loaded on login
- **Only UI strings are translated** — labels, buttons, messages, and default data names
- User-created data (categories, tags, etc.) is free text, never translated
- Default data seeded by the trigger uses i18n keys (e.g. `category.food`) — translated at render time

### Supported languages
| Code | Language |
|---|---|
| `en` | English |
| `es` | Spanish |
| `ca` | Catalan |
| `fr` | French |
| `it` | Italian |

---

## PWA

- Plugin: `vite-plugin-pwa`
- Service Worker handles asset caching on first load
- App installable from browser — no App Store required
- No offline support — the app requires an active connection

---

## Deployment

- **Platform:** Vercel
- **Trigger:** Auto-deploy on push to `main`
- **Environment variables:** Stored in Vercel dashboard
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
