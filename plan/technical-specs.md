# Technical Specs: Expense Tracking System

## Stack Overview

| Layer | Technology |
|---|---|
| **Frontend** | React + Vite |
| **PWA** | Vite PWA Plugin |
| **Hosting** | Vercel |
| **Database** | Supabase (PostgreSQL) |
| **Auth** | Supabase Auth |
| **PDF export** | @react-pdf/renderer (client-side generation) |
| **Budget calculations** | Supabase RPC `get_budget_progress(budget_id, year, month)` |
| **Data isolation** | Row Level Security (RLS) |

---

## Frontend

### React + Vite
- Mobile-first responsive design
- PWA installable from browser — no App Store required
- Opens without browser chrome (feels native)
- Requires active internet connection — no offline support

### PWA Setup
- `manifest.json` for install metadata and icons
- Service Worker via `vite-plugin-pwa` for asset caching only
- Assets cached on first load for fast subsequent opens

---

## Backend: Supabase

### Database: PostgreSQL
- Structured queries for multi-dimensional filtering
- Tags stored relationally via `expense_tags` join table (not as `text[]`)
- `expenses.currency` and `budgets.currency` are set automatically from `profiles.currency` at insert time via DB trigger — immutable after creation
- No currency conversion anywhere in the system
- Free tier: 500 MB storage, unlimited auth users, 50k requests/month

### Currency Model
- `profiles.currency` is the single source of truth for the user's active currency
- Each expense and budget stores the `currency` value at time of creation — read-only, never editable
- Changing `profiles.currency` is **allowed**, with a clear warning that existing records keep their original currency
- The change is **blocked** if there is a live budget in the current currency that already has transactions. A budget is considered live when:
  - `total` type → always live
  - `range` type → `ends_month IS NULL` or `ends_month >= current month`
  - `months` type → the highest month in the array `>= current month`
- Totals and budget progress are calculated per `budgets.currency` / `expenses.currency` — no conversion needed

### Auth: Supabase Auth
- Email/password authentication
- Session management handled by Supabase client
- JWT tokens used for RLS policy enforcement

### Row Level Security (RLS)
Uses the `is_approved()` helper function (defined in `003_rls.sql`):

```sql
-- Pattern applied to all standard tables
CREATE POLICY "approved users manage own data" ON expenses
  FOR ALL USING (user_id = auth.uid() AND is_approved());
```

### Access Control: Login-Only
- Registration is disabled in the UI — no signup page
- Users are created directly via Supabase Auth dashboard or CLI by the admin
- Owner approves users and sets `is_admin` via SQL in the Supabase dashboard
- Admin UI is a v2 feature

---

## i18n

- Library: `i18next` + `react-i18next`
- Language stored in `profiles.language`, loaded on login
- **Only UI strings are translated** — labels, buttons, messages, and default data names
- User-created data (categories, tags, etc.) is stored as free text and never translated
- Default data seeded by the trigger uses i18n keys (e.g. `category.food`) — translated at render time

### Supported Languages

| Code | Language |
|---|---|
| `en` | English |
| `es` | Spanish |
| `ca` | Catalan |
| `fr` | French |
| `it` | Italian |

---

## Number & Currency Formatting

Currency amounts are formatted using `Intl.NumberFormat` based on the user's `language` and the expense's own `currency` field. This ensures locale-correct separators and symbols even when multiple currencies appear in the same list.

```typescript
// Utility function — uses expense's own currency, not profiles.currency
export function formatCurrency(amount: number, currency: string, language: string): string {
  return new Intl.NumberFormat(language, {
    style: 'currency',
    currency,
  }).format(amount);
}

// Examples
formatCurrency(1240, 'EUR', 'es') // → '1.240,00 €'
formatCurrency(1240, 'EUR', 'en') // → '€1,240.00'
formatCurrency(1240, 'GBP', 'fr') // → '1 240,00 £GB'
```

---

## Hosting: Vercel

- Deploys automatically on push to `main`
- Environment variables stored in Vercel dashboard
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
- Free tier sufficient for personal/small user base
- CDN included — fast global load times

---

## Key Decisions Log

| Decision | Choice | Reason |
|---|---|---|
| Offline support | None | Simplifies architecture significantly; online-only is sufficient for personal use |
| UUID generation | Server-side (`gen_random_uuid()`) | No offline sync needed; DB generates all PKs |
| Tags storage | Relational (`expense_tags`) | Required for metadata and renaming |
| Data isolation | RLS + `is_approved()` helper | Enforced at DB level, not just client |
| Access control | Login-only, invite by admin | No public registration |
| Currency model | Immutable per record, no conversion | Avoids rate fluctuation affecting historical data |
| i18n scope | UI strings only | User data is always free text |
| Admin UI | Deferred to v2 | SQL manual sufficient for personal use |

---

## v2 Considerations

- Admin UI for user approval and management
- Push notifications
- Public registration with usage limits
- Analytics page (charts by category, tag, project, event)
- Recurring expenses
- Account deletion (GDPR)
