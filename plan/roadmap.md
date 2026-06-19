# Roadmap: Expense Tracking System

## Approach

- One developer, personal project
- Organized by phases
- Each phase delivers something visible and usable
- Online-only — no offline support

---

## Phase 1 — Database

**Goal:** Supabase fully configured and ready.

- [ ] Create Supabase project
- [ ] Write migration `001_initial_schema.sql` — all tables + CHECK + UNIQUE constraints
- [ ] Write migration `002_indexes.sql` — all indexes
- [ ] Write migration `003_rls.sql` — `is_approved()` helper + all RLS policies
- [ ] Write migration `004_triggers.sql` — `set_updated_at`, `protect_profile_admin_fields`, `enforce_currency_from_profile`, `handle_new_user`
- [ ] Write migration `005_rpc.sql` — budget calculation RPC functions
- [ ] Verify trigger populates categories, tags, tag groups and payment methods with i18n keys
- [ ] Verify `enforce_currency_from_profile` trigger sets and freezes `currency` on `expenses` and `budgets`
- [ ] Bootstrap owner account — set BOTH `approved = true` AND `is_admin = true` via SQL (RLS requires `approved` for all data access)

**Deliverable:** Database ready, RLS active, new users get default data automatically.

---

## Phase 2 — Project Setup

**Goal:** Runnable project with full structure in place.

- [ ] Init Vite + React + TypeScript
- [ ] Create folder structure (`components`, `features`, `services`, `store`, `hooks`, `lib`, `types`, `styles`, `locales`, `assets`)
- [ ] Configure SCSS + CSS Modules
- [ ] Set up SCSS tokens (`_variables.scss`, `_mixins.scss`, `_reset.scss`, `_typography.scss`)
- [ ] Configure Supabase client (`lib/supabase.ts`)
- [ ] Configure i18next with 5 languages (`en`, `es`, `ca`, `fr`, `it`) — UI strings only
- [ ] Set up Zustand stores (`auth.store.ts`, `settings.store.ts`, `expenses.store.ts`)
- [ ] Configure `vite-plugin-pwa`
- [ ] Deploy to Vercel with environment variables

**Deliverable:** Blank app running on Vercel, PWA installable.

---

## Phase 3 — Auth

**Goal:** Users can log in and maintain their session.

- [ ] Login page only — no registration UI
- [ ] Session persistence (Supabase Auth)
- [ ] Approval gate — check `profiles.approved` after login; redirect unapproved users to waiting screen
- [ ] Logout

**Deliverable:** Login-only auth flow working. Access controlled via `approved` flag set by admin SQL.

---

## Phase 4 — App Shell

**Goal:** Navigable app with visual identity applied.

- [ ] Main layout (sidebar on desktop, bottom nav on mobile)
- [ ] Routing between pages (Dashboard, Expenses, Budgets, Settings)
- [ ] Light / dark mode toggle (saved to `profiles` and `localStorage` to avoid flash-of-wrong-theme)
- [ ] Primary color applied from `profiles.primary_color`
- [ ] DM Sans font loaded
- [ ] SCSS tokens applied globally
- [ ] Toast component (info, success, error, warning)

**Deliverable:** Navigable app with full visual system applied.

---

## Phase 5 — CRUD Settings

**Goal:** Users can manage all their configuration data before adding expenses.

- [ ] Categories: list (hierarchical), create, edit, delete (up to 3 levels), reorder via `position`
- [ ] Tags: list (grouped by tag group), create, edit, delete, reorder via `position` — with tag group, color, icon
- [ ] Tag groups: own settings page — list, create, edit, delete, reorder via `position`
- [ ] Payment methods: list, create, edit, delete, reorder via `position`
- [ ] Events: list, create, edit, delete
- [ ] Projects: list, create, edit, delete
- [ ] Profile: edit language, currency (blocked with warning if live budgets with transactions exist), primary color, dark mode

**Deliverable:** App fully configurable. User can set up their own taxonomy before entering any data.

---

## Phase 6 — CRUD Expenses

**Goal:** Users can create, edit and delete expenses.

- [ ] Create expense — all fields (amount, type, date, description, notes, category, tags, payment method, event, project)
- [ ] Currency shown as read-only display (auto-set from `profiles.currency` via DB trigger)
- [ ] Edit expense — currency field not editable
- [ ] Editing a default category/tag/payment method sets `is_default = false`
- [ ] Delete expense (with confirmation)
- [ ] Warn user when deleting a category/tag/event/project that has budgets attached (cascade)
- [ ] Category hierarchical selector
- [ ] Tags grouped selector (multi-select)

**Deliverable:** Full expense management working end to end.

---

## Phase 7 — Dashboard (without budgets)

**Goal:** Dashboard shows real expense data. Budget section placeholder shown.

- [ ] Month navigation (← month →)
- [ ] Total spent for selected month (expenses − refunds, for expenses matching `profiles.currency`)
- [ ] Total income and net balance
- [ ] Full expense list for selected month
- [ ] Placeholder shown where active budgets will appear

**Deliverable:** Dashboard fully functional except budget progress (added in Phase 9b).

---

## Phase 8 — Expenses Page

**Goal:** Expenses page shows and filters real data.

- [ ] Full expense list
- [ ] Filter by: category, tag, event, project, payment method, type, date range
- [ ] Expense detail view (all fields; currency shown as read-only display)

**Deliverable:** Expenses fully browsable and filterable.

---

## Phase 9a — CRUD Budgets

**Goal:** Users can create, edit and delete budgets.

- [ ] Budget list with progress bar per item — progress fetched via Supabase RPC `get_budget_progress(budget_id, year, month)`
- [ ] `total` type budgets shown only on this page (not on Dashboard)
- [ ] Filter by active / expired
- [ ] Create budget (name, dimension, type, amount, months/range/total config)
- [ ] Currency shown as read-only display (auto-set from `profiles.currency` via DB trigger)
- [ ] Edit budget — currency field not editable
- [ ] Delete budget (with confirmation)
- [ ] Warn user when deleting a category/tag/event/project that has budgets attached (cascade)

**Deliverable:** Full budget management working end to end.

---

## Phase 9b — Dashboard Budget Integration

**Goal:** Active budgets section live in the Dashboard.

- [ ] Active budgets with progress bar (RPC `get_budget_progress`, follows navigated month)
- [ ] Only `months` and `range` type budgets shown (not `total`)
- [ ] Progress updates when navigating months

**Deliverable:** Dashboard complete with live budget progress.

---

## Phase 10 — Export

**Goal:** Users can export their data.

- [ ] Export expenses to CSV (filtered or full)
- [ ] Export expenses to PDF (via @react-pdf/renderer, client-side)
- [ ] Date range selector for export

**Deliverable:** User data is exportable — no lock-in.

---

## v2 Backlog

- Analytics page (charts by category, tag, project, event)
- Admin UI for user approval and management
- Push notifications
- Public registration with usage limits
- Recurring expenses
- Account deletion (GDPR)
