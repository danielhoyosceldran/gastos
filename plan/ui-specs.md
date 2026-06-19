# UI Specs: Expense Tracking System

## Design Principles

- Minimalista y limpio
- Esquinas puntiagudas (border-radius: 0)
- Control y seriedad
- Mobile-first, responsive
- Modo claro y oscuro

---

## Typography

**Font:** DM Sans — Google Fonts

| Role | Size | Weight |
|---|---|---|
| **Display** | 32px | 700 |
| **H1** | 24px | 700 |
| **H2** | 20px | 600 |
| **H3** | 16px | 600 |
| **Body** | 14px | 400 |
| **Small** | 12px | 400 |
| **Label** | 12px | 500 |

---

## Color System

### Primary Color
Configurable per user, stored in `profiles.primary_color`.  
Three options, all calm and serious:

| Key | Name | Principal | Light | Dark |
|---|---|---|---|---|
| `blue` | Slate Blue | `#4F88DB` | `#7AAAE5` | `#2D64B5` |
| `green` | Sage Green | `#4A7C6F` | `#6B9E8F` | `#2E5C51` |
| `red` | Dusty Red | `#9B4A4A` | `#BF6B6B` | `#7A2E2E` |

---

### Light Mode

| Token | Role | Hex |
|---|---|---|
| `--bg-base` | Screen background | `#F8F9FA` |
| `--bg-surface-1` | Cards, panels | `#FFFFFF` |
| `--bg-surface-2` | Inputs, elevated elements | `#F0F2F5` |
| `--bg-surface-3` | Tooltips, dropdowns | `#E8EAED` |
| `--border` | Separators, outlines | `#DEE2E6` |
| `--text-primary` | Primary text | `#1A1A1A` |
| `--text-secondary` | Secondary text | `#6B7280` |
| `--text-disabled` | Disabled text | `#B0B4BB` |

---

### Dark Mode

| Token | Role | Hex |
|---|---|---|
| `--bg-base` | Screen background | `#000000` |
| `--bg-surface-1` | Cards, panels | `#111111` |
| `--bg-surface-2` | Inputs, elevated elements | `#1C1C1C` |
| `--bg-surface-3` | Tooltips, dropdowns | `#282828` |
| `--border` | Separators, outlines | `#2E2E2E` |
| `--text-primary` | Primary text | `#F5F5F5` |
| `--text-secondary` | Secondary text | `#A0A0A0` |
| `--text-disabled` | Disabled text | `#555555` |

---

### Toast Colors

| Toast | Background | Text |
|---|---|---|
| **Info** | `#EBF2FC` | `#2D64B5` |
| **Success** | `#E8F7F1` | `#2A7057` |
| **Error** | `#FCEAEA` | `#A83232` |
| **Warning** | `#FDF3E7` | `#A8621A` |

| Toast | Icon color |
|---|---|
| **Info** | `#4F88DB` |
| **Success** | `#3D9E7A` |
| **Error** | `#D94F4F` |
| **Warning** | `#D4872A` |

---

### Chart Color Palette

20 colors ordered for maximum contrast between adjacent items.  
Used for: categories, subcategories, tags, projects, events.

```typescript
export const CHART_COLORS = [
  "#F94144", "#F3722C", "#F8961E", "#F9C74F", "#E9D8A6",
  "#90BE6D", "#43AA8B", "#0A9396", "#005F73", "#577590",
  "#277DA1", "#CA6702", "#BB3E03", "#AE2012", "#9B2226",
  "#656D4A", "#414833", "#936639", "#A68A64", "#001219",
];
```

---

## Pages (v1)

```
Auth
  └── Login

App (authenticated)
  ├── Dashboard
  ├── Expenses
  │     └── Expense detail
  ├── Budgets
  └── Settings
        ├── Categories
        ├── Tags
        ├── Tag groups
        ├── Payment methods
        ├── Events
        ├── Projects
        └── Profile
```

---

## Dashboard

```
┌─────────────────────────────────┐
│  ← January 2025 →               │
│                                 │
│  Total spent      €1.240,00     │
│  Total income     €2.000,00     │
│  Net balance      +€760,00      │
│                                 │
│  Active budgets                 │
│  Food          ████░░  €320/400 │
│  Leisure       ██░░░░  €80/200  │
│                                 │
│  Expenses                       │
│  ─────────────────────────────  │
│  Restaurante La Mar    -€24,00  │
│  Supermercado Lidl     -€67,50  │
│  Nómina               +€2000,00 │
│  ...                            │
└─────────────────────────────────┘
```

- Month navigation: previous / next arrows
- **Total spent:** expenses minus refunds for the month
- **Total income:** income entries for the month
- **Net balance:** income minus net spent
- Active budgets: progress bar per budget (expenses + refunds counted, income excluded)
- Full expense list for the selected month (all types shown, color-coded by type)

---

## Expenses Page

- Full list of expenses with filters
- Filterable by: category, tag, event, project, payment method, type, date range
- Each row shows: date, description, category, amount
- Tap to open expense detail

---

## Expense Detail

All fields editable inline:

- Amount
- Currency (display only — auto-set from `profiles.currency`, not editable)
- Type (expense / income / refund)
- Date
- Description
- Notes
- Category (hierarchical selector)
- Tags (grouped selector)
- Payment method
- Event (optional)
- Project (optional)

---

## Budgets Page

- List of all budgets
- Each budget shows: name, dimension (category/tag/project/event), type (months/range/total), progress bar, amount spent / limit
- `total` type budgets show lifetime accumulated spend, no monthly window
- Filter by active / expired

---

## Settings

Each settings section (Categories, Tags, Tag groups, Payment methods, Events, Projects) follows the same pattern:

- List of items with drag-to-reorder (updates `position`)
- Add / Edit / Delete
- Default items marked but fully editable — editing a default sets `is_default = false` (loses i18n translation permanently)
- Deletion shows a confirmation warning if the item has budgets attached (cascade effect)

### Profile
- Language selector (EN, ES, CA, FR, IT)
- Currency — sets the currency for all new expenses and budgets
- Primary color selector (Blue, Green, Red)
- Dark / Light mode toggle — saved to `profiles.theme` and `localStorage`

---

## Number & Currency Formatting

All monetary amounts are formatted using `Intl.NumberFormat`. The locale comes from `profiles.language`; the currency comes from the **record itself** (`expense.currency` or `budget.currency`), not from `profiles.currency`. This ensures correct display even when a list contains records from different currencies.

```typescript
// Format a monetary amount using the record's own currency and the user's locale
export function formatCurrency(
  amount: number,
  currency: string,  // from expense.currency or budget.currency
  language: string   // from profiles.language
): string {
  return new Intl.NumberFormat(language, { style: 'currency', currency }).format(amount);
}

// Examples
formatCurrency(1240, 'EUR', 'es') // → '1.240,00 €'
formatCurrency(1240, 'USD', 'en') // → '$1,240.00'
formatCurrency(1240, 'EUR', 'fr') // → '1 240,00 €'
```

> Never hardcode currency symbols or number formats — always use `Intl.NumberFormat`.

---

## Empty States

Each list or page shows a contextual message and a primary action button when no data exists.

| Screen | Message | Action |
|---|---|---|
| Dashboard (no expenses) | "No expenses this month" | Add expense |
| Expenses page | "No expenses yet" | Add expense |
| Budgets page | "No budgets defined" | Create budget |
| Categories | "No categories yet" | Add category |
| Tags | "No tags yet" | Add tag |
| Tags (ungrouped bucket) | Tags reassigned from a deleted group appear under the "Ungrouped" system group — always visible if any exist | — |
| Payment methods | "No payment methods yet" | Add payment method |
| Events | "No events yet" | Add event |
| Projects | "No projects yet" | Add project |
| Tag groups | "No tag groups yet" | Add tag group |

- No wizard or onboarding flow — empty states are the entry point
- Message and button use the same i18n system as the rest of the UI
- Illustration or icon optional, kept minimal to match the design language

```scss
// _variables.scss

// Typography
$font-family: 'DM Sans', sans-serif;
$font-display: 32px;
$font-h1: 24px;
$font-h2: 20px;
$font-h3: 16px;
$font-body: 14px;
$font-small: 12px;

// Borders
$border-radius: 0;
$border-width: 1px;

// Spacing scale
$space-1: 4px;
$space-2: 8px;
$space-3: 12px;
$space-4: 16px;
$space-5: 24px;
$space-6: 32px;
$space-7: 48px;
$space-8: 64px;
```
