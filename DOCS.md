# WeekCraft — Technical & Functional Documentation

> **Purpose of this document**
> This file serves as the single source of truth for both functional understanding and technical onboarding. It is intended for:
> - **Functional owners** who want to understand what the app does and how it is structured
> - **New development sessions / AI assistants** who need to understand dependencies, architecture, and conventions before making changes

---

## Table of Contents

1. [App Overview](#1-app-overview)
2. [Feature Inventory](#2-feature-inventory)
3. [Tech Stack](#3-tech-stack)
4. [Repository & Deployment](#4-repository--deployment)
5. [Local Development Setup](#5-local-development-setup)
6. [Architecture Overview](#6-architecture-overview)
7. [Directory Structure](#7-directory-structure)
8. [Data Models (TypeScript)](#8-data-models-typescript)
9. [Database Schema (Prisma / PostgreSQL)](#9-database-schema-prisma--postgresql)
10. [State Management (Zustand)](#10-state-management-zustand)
11. [API Routes](#11-api-routes)
12. [Authentication](#12-authentication)
13. [Seed Data — Recipes & Extras](#13-seed-data--recipes--extras)
14. [Security](#14-security)
15. [Key Conventions & Patterns](#15-key-conventions--patterns)
16. [Known Decisions & Trade-offs](#16-known-decisions--trade-offs)
17. [Environment Variables](#17-environment-variables)
18. [Common Tasks & How-Tos](#18-common-tasks--how-tos)

---

## 1. App Overview

**WeekCraft** is a weekly meal planning Progressive Web App (PWA) built with Next.js. Users plan meals day-by-day for the week, generate a shopping list, track pantry items, and view recipes with scaled ingredients.

### Core user journey

```
Register / Login
      ↓
Wizard (3 steps)
  Step 1 — Daily Vibe: pick meal label per day (Healthy / High-Protein / Low-Carb / Cheat / Any / Free day),
            optionally set max prep time, max calories, per-day people count
  Step 2 — Extras: pick non-meal items (drinks, snacks) with qty steppers
  Step 3 — Confirm & Generate: preview the auto-generated week plan
      ↓
Calendar View (home screen after wizard)
  — 7-day strip showing each day's recipe
  — Tap a day → full meal card with swap, recipe modal
  — Recipe modal: scaled ingredients, step-by-step instructions, notes, source/YouTube link
      ↓
Shopping List
  — All ingredients aggregated across the week, grouped by supermarket aisle
  — Tick items off (moves to "In Pantry")
  — Toggle staples visibility
  — Only shows current week + next 4 weeks (past weeks hidden)
      ↓
Settings
  — Change username / password
  — Set default household size (defaultPeople)
  — Manage household sharing (invite members, view/remove members, leave/dissolve)
```

---

## 2. Feature Inventory

### Meal Planning
- **Wizard** — 3-step flow to configure and generate a week plan
- **Label system** — 6 labels: `healthy`, `high-protein`, `low-carb`, `cheat`, `any`, `none` (free day)
- **Per-day overrides** — each day can have its own people count, max prep time, max calorie filter
- **Plan generation** — `generatePlan()` in `wizardStore.ts` picks recipes matching each day's label, avoids repeating recipes across the week
- **Multi-week** — plans are saved per ISO week start date; navigate between weeks

### Calendar & Recipes
- **7-day strip** — Monday–Sunday overview on the home screen
- **Meal cards** — show recipe name, label badge, calories, prep time
- **Swap** — replace the recipe for a day with another matching-label recipe
- **Recipe modal** — full recipe view:
  - Ingredients scaled to the day's `people` count
  - Step-by-step instructions
  - Source URL (http/https only, `nofollow`)
  - YouTube embed (whitelisted in CSP)
  - Per-recipe text notes (debounced 800 ms auto-save)
  - Favourite toggle

### Extras
- Pre-defined and custom non-meal items (smoothies, snacks, drinks, etc.)
- Each extra has: name, emoji, category (`drink | breakfast | snack | other`), and an ingredient list
- Selected in wizard Step 2 with a quantity stepper (− N +)
- In the week detail view: qty steppers + tap-to-expand ingredient list
- Extras contribute to the shopping list, scaled by qty

### Shopping List
- Aggregates ingredients from all DayPlans + selected Extras for a week
- Grouped by aisle (Produce, Dairy & Eggs, Meat & Poultry, etc.)
- Per-item: tick → moves to "In Pantry" section
- Progress bar showing % checked
- "Show staples" toggle — staples hidden by default
- Filters to current + next 4 weeks; past weeks not shown

### User Accounts
- Username + password auth (bcrypt hashed)
- `defaultPeople` setting — wizard pre-fills people count from this on load
- Custom recipes (CRUD) — appear alongside seed recipes in wizard
- Custom extras (CRUD)
- Custom ingredients (used when building custom recipes)
- Recipe favourites
- Recipe notes (per recipe, stored server-side)

### Household Sharing
- One user can **create a household** (becomes owner)
- Owner can **generate invite links** (token-based, 7-day expiry)
- Invited users visit `/invite/[token]` to preview and accept/decline
- Household members **share the same WeekPlan** — all members see and edit the same weekly plan
- Owner can remove members; members can leave
- Owner can dissolve the household (deletes all household data)
- Plan scoping: `resolveScope(userId)` helper checks owner → member → personal, returns `{ householdId }` or `{ userId }` for Prisma queries

### PWA
- Registered as a Progressive Web App
- `PWARegister.tsx` component handles service worker registration

### Security (see §14 for full details)
- Rate limiting, input validation, CSP headers, XSS protection

---

## 3. Tech Stack

| Layer | Technology | Version / Notes |
|---|---|---|
| Framework | Next.js (App Router) | 16.x |
| Language | TypeScript | strict mode |
| Styling | Tailwind CSS v4 | via `@import "tailwindcss"` in globals.css |
| Icons | Lucide React | |
| State | Zustand | with `persist` middleware → localStorage |
| Auth | NextAuth.js v5 | JWT sessions, Credentials provider |
| ORM | Prisma 5 | |
| Database | Neon PostgreSQL | serverless, connection pooling via `DATABASE_URL` |
| Deployment | Vercel | auto-deploy from `weekcraftnext` GitHub repo |
| Node.js | v25.8.1 | via Homebrew: `/opt/homebrew/bin/node` |
| Package manager | npm | |

---

## 4. Repository & Deployment

### Git remotes

| Remote name | URL | Purpose |
|---|---|---|
| `weekcraftnext` | `https://github.com/nverl/weekcraftnext.git` | **Vercel-connected** — pushes here trigger production deploys |
| `origin` | `https://github.com/nverl/WeekCraft.git` | Mirror / backup |

> ⚠️ **Always push to both remotes:**
> ```bash
> git push origin main && git push weekcraftnext main
> ```

### Vercel
- Production URL: the Vercel-assigned URL for the `weekcraftnext` project
- Builds trigger on push to `main` branch of `weekcraftnext`
- Environment variables are set in the Vercel dashboard (see §17)

### Local canonical path
```
/Users/root1/kitchenflow/
```
> The path `/Users/root1/Documents/Claude/WhatDoWeEat?/kitchenflow` exists but has a `?` in the path that causes macOS TCC sandbox `EPERM` in preview tools. Always use `/Users/root1/kitchenflow/`.

---

## 5. Local Development Setup

```bash
# Install dependencies
cd /Users/root1/kitchenflow
npm install

# Set environment variables (see §17)
cp .env.example .env.local   # if it exists, otherwise create .env.local manually

# Push schema to database (first time or after schema changes)
npx prisma db push

# Start dev server
npm run dev
# → http://localhost:3000
```

> **Note on schema changes**: If you add a new `@@unique` constraint or make a destructive schema change, Prisma will refuse `db push` by default. Use:
> ```bash
> npx prisma db push --accept-data-loss
> ```

---

## 6. Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│  Browser                                                      │
│                                                               │
│  ┌───────────────┐    ┌───────────────────────────────────┐  │
│  │  Zustand      │    │  React Components (App Router)    │  │
│  │  Stores       │◄──►│                                   │  │
│  │               │    │  app/page.tsx  (RSC)              │  │
│  │  wizardStore  │    │    └─ reads data/recipes.json     │  │
│  │  shoppingStore│    │    └─ passes seedRecipes prop     │  │
│  │  weekPlanStore│    │                                   │  │
│  │  recipeStore  │    │  HomeClient.tsx  (Client)         │  │
│  │  extrasStore  │    │    └─ DataLoader (fetches user    │  │
│  │  ingredientSt.│    │       data from API on mount)     │  │
│  └───────────────┘    │    └─ routes: Wizard ↔ Calendar   │  │
│  localStorage persist │                                   │  │
│                        │  /wizard → WizardContainer       │  │
│                        │  /calendar → CalendarView        │  │
│                        │  /shopping → ShoppingList        │  │
│                        │  /settings → Settings page       │  │
│                        │  /invite/[token] → InvitePage    │  │
│                        └───────────────────────────────────┘  │
└────────────────────────────┬────────────────────────────────┘
                              │ fetch()
┌────────────────────────────▼────────────────────────────────┐
│  Next.js API Routes  (app/api/*)                              │
│                                                               │
│  /register   /auth    /account    /account/me                 │
│  /plans      /plans/[weekStart]                               │
│  /user-recipes        /user-recipes/[id]                      │
│  /user-extras         /user-ingredients                       │
│  /household           /household/invite                       │
│  /household/invite/[token]   /household/member/[userId]       │
│  /favourites          /notes          /reminders              │
└────────────────────────────┬────────────────────────────────┘
                              │ Prisma
┌────────────────────────────▼────────────────────────────────┐
│  Neon PostgreSQL  (serverless)                                │
│  Models: User, WeekPlan, Household, HouseholdMember,          │
│          HouseholdInvite, UserRecipe, UserExtra,              │
│          UserIngredient, RecipeFavourite, RecipeNote          │
└─────────────────────────────────────────────────────────────┘
```

### Key architectural decisions

| Decision | Rationale |
|---|---|
| RSC reads `recipes.json` server-side | Seed recipes never need a DB query; passed as `seedRecipes` prop to `HomeClient` |
| Zustand + localStorage persist | Offline-capable; no loading state needed for UI state |
| Per-recipe notes saved server-side | Notes must survive localStorage clears and work across devices |
| Household plan scoping via `resolveScope()` | Single helper centralises ownership/membership logic for all plan API routes |
| Ingredient scaling client-side | `scaledAmount = (people / recipe.recipeYield) * ingredient.amount` — no server round-trip needed |
| ISO 8601 durations for prep time | `PT30M`, `PT1H15M` — machine-readable, parsed by `parseISODuration()` in `wizardStore.ts` |

---

## 7. Directory Structure

```
/Users/root1/kitchenflow/
├── app/
│   ├── page.tsx                    # RSC entry — reads recipes.json, passes to HomeClient
│   ├── layout.tsx                  # Root layout — SessionProvider, NavBar, PWARegister
│   ├── globals.css                 # Tailwind v4 import + custom animations (slideUp)
│   ├── error.tsx                   # Global App Router error boundary
│   │
│   ├── HomeClient.tsx              # Client entry — routes between Wizard & Calendar
│   │
│   ├── login/page.tsx              # Login page
│   ├── settings/page.tsx           # Account settings + household management
│   ├── invite/[token]/page.tsx     # Household invite acceptance page
│   │
│   ├── api/
│   │   ├── register/route.ts       # POST — create account (rate limited)
│   │   ├── auth/[...nextauth]/     # NextAuth handler
│   │   ├── account/
│   │   │   ├── route.ts            # GET/PATCH — account info, defaultPeople, username, password
│   │   │   └── me/route.ts         # GET — lightweight: {id, username, defaultPeople}
│   │   ├── plans/
│   │   │   ├── route.ts            # GET/PUT — week plans (household-aware)
│   │   │   └── [weekStart]/route.ts # DELETE
│   │   ├── user-recipes/
│   │   │   ├── route.ts            # GET/POST
│   │   │   └── [id]/route.ts       # PUT/DELETE
│   │   ├── user-extras/
│   │   │   └── route.ts            # GET/POST/PATCH/DELETE
│   │   ├── user-ingredients/
│   │   │   └── route.ts            # GET/POST/DELETE
│   │   ├── household/
│   │   │   ├── route.ts            # GET/POST/PATCH/DELETE — household CRUD
│   │   │   ├── invite/
│   │   │   │   ├── route.ts        # POST/GET — create/list invites
│   │   │   │   └── [token]/route.ts # GET/POST/DELETE — view/accept/revoke invite
│   │   │   └── member/[userId]/route.ts # DELETE — remove member
│   │   ├── favourites/route.ts     # GET/POST/DELETE
│   │   ├── notes/route.ts          # GET/POST/DELETE
│   │   └── reminders/route.ts      # GET/POST/DELETE
│   │
│   ├── components/
│   │   ├── DataLoader.tsx          # Fetches all user data on mount after session auth
│   │   ├── NavBar.tsx
│   │   ├── PWARegister.tsx
│   │   ├── SessionProviderWrapper.tsx
│   │   │
│   │   ├── wizard/
│   │   │   ├── WizardContainer.tsx # Step navigator, Next/Back/Confirm buttons
│   │   │   ├── StepIndicator.tsx   # Top progress indicator (Daily Vibe → Extras → Confirm)
│   │   │   ├── Step1DailyVibe.tsx  # Day accordion — label, prep time, calories, people
│   │   │   ├── Step2Household.tsx  # Extras picker with qty steppers
│   │   │   └── Step3Confirm.tsx    # Plan preview before generation
│   │   │
│   │   ├── calendar/
│   │   │   ├── CalendarView.tsx    # Week strip + active day display
│   │   │   ├── WeekDetailView.tsx  # Full week view with extras bar + qty steppers
│   │   │   ├── MealCard.tsx        # Individual meal card with swap button
│   │   │   └── RecipeModal.tsx     # Recipe detail: scaled ingredients, instructions, notes
│   │   │
│   │   ├── extras/
│   │   │   └── ExtraPickerModal.tsx # Modal to select/deselect extras with ingredient preview
│   │   │
│   │   ├── shopping/
│   │   │   └── ShoppingList.tsx    # Shopping list grouped by aisle
│   │   │
│   │   ├── home/
│   │   │   └── HomeView.tsx        # Home screen wrapper (week summary)
│   │   │
│   │   ├── recipes/                # Custom recipe CRUD UI
│   │   ├── ingredients/            # Custom ingredient management UI
│   │   └── ui/
│   │       └── Toast.tsx           # Slide-up toast notification component
│   │
│   ├── constants/
│   │   └── labels.tsx              # LABEL_CONFIG — single source of truth for label styles
│   │
│   ├── hooks/
│   │   └── useToast.ts             # showError / showSuccess / dismiss
│   │
│   ├── store/
│   │   ├── wizardStore.ts          # Wizard state + generatePlan() + parseISODuration()
│   │   ├── shoppingStore.ts        # Shopping list state + pantry toggle
│   │   ├── weekPlanStore.ts        # Multi-week plans + setExtraQtyForWeek()
│   │   ├── recipeStore.ts          # User recipes (custom + seed merge)
│   │   ├── extrasStore.ts          # User extras
│   │   └── ingredientStore.ts      # User ingredients
│   │
│   └── types/
│       └── index.ts                # All TypeScript interfaces (see §8)
│
├── data/
│   └── recipes.json                # 53 seed recipes (r001–r053), read server-side only
│
├── lib/
│   ├── prisma.ts                   # Prisma client singleton
│   ├── rateLimit.ts                # In-memory rate limiter (Map-based, auto-pruned)
│   └── validate.ts                 # Input validation helpers
│
├── prisma/
│   └── schema.prisma               # Database schema (see §9)
│
├── public/                         # PWA icons, manifest, service worker
│
├── auth.ts                         # NextAuth v5 config (Credentials provider)
├── middleware.ts                   # Route protection (redirects unauthenticated users)
├── next.config.ts                  # CSP headers, security headers, body size limit
├── tailwind.config.ts              # Tailwind configuration
├── tsconfig.json
├── package.json
├── README.md                       # Basic Next.js scaffold readme
└── DOCS.md                         # ← This file
```

---

## 8. Data Models (TypeScript)

Defined in `app/types/index.ts`:

```typescript
// Meal labels
type DayLabel = 'healthy' | 'low-carb' | 'cheat' | 'high-protein' | 'any';

// Ingredient (used inside Recipe, Extra, ShoppingItem)
interface Ingredient {
  name: string;       // Always capitalised first letter, English
  amount: number;
  unit: string;       // "tbsp","tsp","cup","g","ml","L","piece","pieces","can","cans","cloves","bunch","bag","head","large","stalks"
  aisle: string;      // See aisle list below
  isStaple: boolean;  // Staples hidden by default in shopping list
}

// Aisle values (enforced by convention):
// "Produce" | "Grains & Pasta" | "Meat & Poultry" | "Seafood" | "Dairy & Eggs"
// "Canned Goods" | "Frozen Foods" | "Bread & Bakery" | "Condiments"
// "Oils & Vinegars" | "Spices" | "Baking"

// A recipe (seed or user-created)
interface Recipe {
  id: string;               // Seed: "r001"–"r053"; custom: cuid
  name: string;
  labels: DayLabel[];
  cuisine?: string;         // Must be one of CUISINES constant
  prepTimeISO: string;      // ISO 8601 duration: "PT30M", "PT1H15M"
  caloriesPerPerson: number;
  recipeYield: number;      // Number of servings the recipe makes
  instructions: string[];
  ingredients: Ingredient[];
  sourceUrl?: string;       // http/https only (validated by isSafeUrl)
  youtubeUrl?: string;      // YouTube URL for embed
}

// Per-day wizard configuration
interface DayConfig {
  label: DayLabel | 'none';
  maxPrepMins: number | null;   // null = Any
  maxCalories: number | null;   // null = Any
  freeNote: string;             // Used when label === 'none'
  freeCalories: number | null;
  people?: number;              // Per-day override; falls back to week-level default
}

// A planned day (output of generatePlan)
interface DayPlan {
  day: string;              // "Monday"–"Sunday"
  date: string;             // ISO date string
  label: DayLabel | 'none';
  recipe: Recipe | null;    // null for free days
  scaledIngredients: Ingredient[];
  freeNote?: string;
  freeCalories?: number | null;
  people?: number;
}

// An extra (non-meal item: drink, snack, etc.)
interface Extra {
  id: string;
  name: string;
  emoji: string;
  category: 'drink' | 'breakfast' | 'snack' | 'other';
  ingredients: Ingredient[];
  isCustom?: boolean;
}

// Selected extra with quantity (stored in WeekPlan)
interface SelectedExtra {
  id: string;
  qty: number;
}

// A full week plan
interface WeekPlan {
  weekStart: string;            // ISO string of Monday 00:00:00 UTC
  dayConfigs: DayConfig[];
  people: number;               // Week-level default people
  days: DayPlan[];              // 7 entries Mon–Sun
  selectedExtras?: SelectedExtra[];
}

// Shopping list item
interface ShoppingItem extends Ingredient {
  recipeId: string;
  recipeName: string;
  scaledAmount: number;
  inPantry: boolean;
}
```

### CUISINES constant
```typescript
const CUISINES = [
  'American', 'Asian', 'French', 'Greek', 'Indian',
  'Italian', 'Japanese', 'Mediterranean', 'Mexican',
  'Middle Eastern', 'Spanish', 'Thai', 'Other'
] as const;
```

### LABEL_CONFIG
Defined in `app/constants/labels.tsx`. Single source of truth for label display properties:
```typescript
// Each label has: icon (JSX), text, bg (Tailwind bg class), color, border, dot
export const LABEL_CONFIG: Record<string, LabelConfig> = {
  healthy, 'high-protein', 'low-carb', cheat, any, none
}
export const DEFAULT_LABEL = LABEL_CONFIG.healthy
```
**Do not redefine label styles locally in components** — always import from `app/constants/labels.tsx`.

---

## 9. Database Schema (Prisma / PostgreSQL)

Database: **Neon PostgreSQL** (serverless). Schema in `prisma/schema.prisma`.

### Models

#### `User`
| Field | Type | Notes |
|---|---|---|
| id | String (cuid) | PK |
| username | String | Unique; 3–30 chars, alphanumeric + `_.-` |
| password | String | bcrypt hashed |
| defaultPeople | Int | Default 2; used to pre-fill wizard |
| createdAt | DateTime | |

Relations: `recipes`, `extras`, `ingredients`, `weekPlans`, `favourites`, `notes`, `ownedHousehold`, `householdMember`, `sentInvites`

#### `WeekPlan`
| Field | Type | Notes |
|---|---|---|
| id | String (cuid) | PK |
| userId | String? | Nullable — either userId or householdId is set |
| householdId | String? | Nullable — set when household shares a plan |
| weekStart | String | ISO Monday date string |
| data | Json | Full `WeekPlan` object serialised as JSON |
| createdAt / updatedAt | DateTime | |

Unique constraints:
- `@@unique([userId, weekStart])` — one plan per user per week
- `@@unique([householdId, weekStart])` — one plan per household per week

#### `Household`
| Field | Type | Notes |
|---|---|---|
| id | String (cuid) | PK |
| name | String | Default "My Household" |
| ownerId | String | Unique — one household per owner |

Relations: `owner (User)`, `members (HouseholdMember[])`, `invites (HouseholdInvite[])`, `weekPlans (WeekPlan[])`

#### `HouseholdMember`
Composite PK `[householdId, userId]`. Each `userId` is unique (one household membership per user).

#### `HouseholdInvite`
| Field | Type | Notes |
|---|---|---|
| token | String | Unique cuid — used in invite URL |
| expiresAt | DateTime | 7 days from creation |
| acceptedAt | DateTime? | Set when accepted; invite becomes one-use |

#### `UserRecipe`
Stores custom recipes created by users. Fields mirror the `Recipe` TypeScript interface. `ingredients` is stored as `Json`.

#### `UserExtra`
Stores custom extras. `items` (ingredients) stored as `Json`.

#### `UserIngredient`
A catalogue of reusable ingredient definitions a user has created.

#### `RecipeFavourite`
Composite PK `[userId, recipeId]`. Works for both seed recipes and user recipes.

#### `RecipeNote`
Composite PK `[userId, recipeId]`. One note per user per recipe. `note` is plain text.

### Applying schema changes

```bash
# Non-destructive changes
npx prisma db push

# Changes that require dropping/recreating data (e.g. new unique constraints)
npx prisma db push --accept-data-loss

# Generate updated Prisma Client after schema changes
npx prisma generate
```

---

## 10. State Management (Zustand)

All stores use Zustand's `persist` middleware writing to `localStorage`.

### Store inventory

| Store | localStorage key | Responsibility |
|---|---|---|
| `wizardStore` | `kitchenflow-wizard` | Wizard step state, day configs, people, plan, extras |
| `shoppingStore` | `kitchenflow-shopping` | Shopping items, pantry state |
| `weekPlanStore` | `kitchenflow-weekplan` | Saved week plans (multi-week) |
| `recipeStore` | `kitchenflow-recipes` | Seed + custom recipes merged |
| `extrasStore` | `kitchenflow-extras` | Seed + custom extras merged |
| `ingredientStore` | `kitchenflow-ingredients` | User ingredient catalogue |

### Key actions

#### `wizardStore`
- `setPeople(n)` — set week-level default people count
- `setDayConfig(index, config)` — update a day's config
- `setCurrentStep(step)` — navigate wizard steps
- `generatePlan(recipes, extras)` — generates `DayPlan[]` respecting labels, filters, per-day people
- `resetWizard()` — resets to step 1 but preserves `people` and `targetWeekStart`
- `parseISODuration(iso)` — exported helper: parses `"PT1H30M"` → `90` (minutes)

#### `weekPlanStore`
- `setExtraQtyForWeek(weekStart, extraId, qty)` — update qty of an extra for a specific week; qty ≤ 0 removes the extra
- `savePlan(weekStart, plan)` — persist a plan
- `getActivePlan(weekStart)` — retrieve plan for a week

#### `shoppingStore`
- `buildShoppingList(plans, extras)` — aggregate ingredients across all DayPlans + selected Extras
- `togglePantry(itemKey)` — mark item as in pantry / not in pantry

### `DataLoader.tsx`

Runs once after session authentication. Fetches:
1. `/api/plans` — all week plans
2. `/api/user-recipes` — custom recipes
3. `/api/user-extras` — custom extras
4. `/api/user-ingredients` — custom ingredients
5. `/api/account/me` — account info including `defaultPeople`

After fetching, calls `setPeople(account.defaultPeople)` on the wizard store so the wizard always reflects the user's saved household size.

---

## 11. API Routes

All routes require an authenticated session (checked via `auth()` from NextAuth) unless noted.

### Authentication

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/api/register` | None | Create account. Rate limited: 10/IP/15 min |

### Account

| Method | Route | Description |
|---|---|---|
| GET | `/api/account` | Full account info |
| PATCH | `/api/account` | Update username or password (rate limited: 5 changes/user/15 min) |
| GET | `/api/account/me` | Lightweight: `{id, username, defaultPeople}` — used by DataLoader |

### Plans

| Method | Route | Description |
|---|---|---|
| GET | `/api/plans` | Returns all WeekPlans for the user (or their household) |
| PUT | `/api/plans` | Upsert a WeekPlan. Uses `resolveScope(userId)` to determine household vs personal |
| DELETE | `/api/plans/[weekStart]` | Delete a specific week's plan |

**`resolveScope(userId)`** logic:
1. If user owns a household → use `{ householdId }`
2. Else if user is a member of a household → use `{ householdId }`
3. Else → use `{ userId }`

### Custom Recipes

| Method | Route | Description |
|---|---|---|
| GET | `/api/user-recipes` | List all custom recipes for the user |
| POST | `/api/user-recipes` | Create a custom recipe (full validation) |
| PUT | `/api/user-recipes/[id]` | Update (ownership guard) |
| DELETE | `/api/user-recipes/[id]` | Delete (ownership guard) |

### Custom Extras

| Method | Route | Description |
|---|---|---|
| GET | `/api/user-extras` | List extras |
| POST | `/api/user-extras` | Create extra |
| PATCH | `/api/user-extras` | Update extra (ownership guard) |
| DELETE | `/api/user-extras` | Delete extra |

### Household

| Method | Route | Description |
|---|---|---|
| GET | `/api/household` | Get current user's household info + members |
| POST | `/api/household` | Create a household |
| PATCH | `/api/household` | Update household name |
| DELETE | `/api/household` | Dissolve household (owner only) |
| POST | `/api/household/invite` | Generate a new invite token (7-day expiry) |
| GET | `/api/household/invite` | List active invites |
| GET | `/api/household/invite/[token]` | Preview invite (no auth required) |
| POST | `/api/household/invite/[token]` | Accept invite |
| DELETE | `/api/household/invite/[token]` | Revoke invite (owner only) |
| DELETE | `/api/household/member/[userId]` | Remove a member (owner) or leave (self) |

### Other

| Route | Description |
|---|---|
| `/api/favourites` | GET/POST/DELETE recipe favourites |
| `/api/notes` | GET/POST/DELETE recipe notes |
| `/api/user-ingredients` | GET/POST/DELETE custom ingredient catalogue |
| `/api/reminders` | GET/POST/DELETE meal reminders |

---

## 12. Authentication

- **Provider**: NextAuth.js v5 — Credentials provider (username + password)
- **Strategy**: JWT session (`strategy: 'jwt'`)
- **Session maxAge**: 30 days
- **Password hashing**: bcrypt (via `bcryptjs`)
- **Sign-in page**: `/login`
- **Middleware**: `middleware.ts` protects all routes except `/login`, `/register`, and public assets

### Token flow
```
User submits credentials
  → authorize() in auth.ts fetches User from DB
  → bcrypt.compare(password, user.password)
  → returns { id, name: username }
  → JWT stores { id } in token
  → Session contains token.id
  → API routes call auth() → session.user.id
```

---

## 13. Seed Data — Recipes & Extras

### recipes.json

Located at `data/recipes.json`. Read **server-side only** by `app/page.tsx` (RSC) and passed as `seedRecipes` prop to `HomeClient`.

**53 seed recipes (r001–r053)**:
- r001–r010: Original scaffold recipes (mixed healthy/low-carb/cheat)
- r011–r028: Veggie recipes (soups, bowls, salads) — translated from Dutch PDF menu
- r029–r047: Meat & fish recipes — translated from Dutch PDF menu
- r048–r053: Desserts & extras (cake, banana bread, matcha bars, granola, etc.)

**Recipe labels used**: `healthy`, `high-protein`, `low-carb`, `cheat`, `any`

**To add new seed recipes**:
1. Edit `data/recipes.json`
2. Use the next available ID (`r054`, etc.)
3. Follow the `Recipe` interface exactly (see §8)
4. Use consistent ingredient naming (capitalize first letter, English)
5. `cuisine` must be one of the CUISINES constant values
6. `prepTimeISO` must match `/^PT(?:\d+H)?(?:\d+M)?(?:\d+S)?$/`

**Validation**:
```bash
node -e "const r=require('./data/recipes.json'); console.log(r.length, 'recipes')"
```

### Extras seed data

Extras (drinks, snacks, etc.) are defined in `extrasStore.ts` as default seed extras. Users can add custom extras via the UI or API.

---

## 14. Security

### Rate limiting (`lib/rateLimit.ts`)
- In-memory `Map<key, timestamps[]>` — **does not persist across server restarts / serverless invocations**
- Auto-pruned every 5 minutes
- Applied to:
  - `POST /api/register` — 10 requests/IP/15 min
  - `PATCH /api/account` (password change) — 5 requests/userId/15 min

### Input validation (`lib/validate.ts`)

| Helper | Validates |
|---|---|
| `isString(val, maxLen)` | String with max length |
| `isNumber(val, min, max)` | Number within range |
| `isStringArray(val, maxItems, maxItemLen)` | String array |
| `isISODuration(val)` | `/^PT(?:\d+H)?(?:\d+M)?(?:\d+S)?$/` |
| `isSafeUrl(val)` | `http:` or `https:` only — blocks `javascript:` / `data:` |
| `isValidIngredient(val)` | `{name, amount, unit}` object |
| `isStrongPassword(pw)` | 8+ chars, at least 1 digit or uppercase; returns `{ok, message}` |

### Content Security Policy (`next.config.ts`)

```
default-src 'self'
script-src 'self' 'unsafe-inline' 'unsafe-eval'
style-src 'self' 'unsafe-inline'
img-src 'self' data: blob:
frame-src https://www.youtube.com https://www.youtube-nocookie.com
connect-src 'self'
font-src 'self'
object-src 'none'
base-uri 'self'
form-action 'self'
```

### Security headers
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`

### Other
- Server Actions body size limited to 512 KB
- Source URLs rendered with `rel="nofollow"` and validated by `isSafeUrl()`
- Ownership guards on all user-scoped CRUD routes (e.g. can't edit another user's recipe)
- Generic error messages on register (duplicate username not revealed)

---

## 15. Key Conventions & Patterns

### Ingredient naming
- Always capitalize first letter: `"Olive oil"`, `"Cherry tomatoes"`, `"Garlic cloves"`
- English only (seed data was originally Dutch — all translated)
- Reuse existing names where possible to keep shopping list aggregation clean
- Staple rule: common pantry items (`Olive oil`, `Salt`, `Black pepper`, dry spices, `Butter`, `Garlic cloves`, `Yellow onion`, `Red onion`, etc.) have `isStaple: true`

### Amount/unit formatting
- `fmtAmount(n)` in `RecipeModal.tsx`: strips trailing zeros, rounds to 2dp — prevents `0.3333…` display
- Units: `tbsp`, `tsp`, `cup`, `g`, `ml`, `L`, `piece`, `pieces`, `can`, `cans`, `cloves`, `bunch`, `bag`, `head`, `large`, `stalks`, `slices`, `strips`

### Ingredient scaling
```typescript
scaledAmount = (dayPlan.people / recipe.recipeYield) * ingredient.amount
```
- `people` falls back: `dayConfig.people ?? weekPlan.people ?? 2`

### Debounced note saves
`RecipeModal.tsx` uses a `useRef<ReturnType<typeof setTimeout>>` for 800 ms debounced note auto-save. The timeout is cleared on unmount.

### Toast notifications
```typescript
const { showError, showSuccess } = useToast();
showError('Something went wrong');
showSuccess('Saved!');
```
Auto-dismisses after 4 seconds. Uses `role="alert"` for accessibility.

### useMemo in HomeView
`selectedExtrasMap`, `selectedExtraIds`, `weekExtras`, and `usedIds` are all wrapped in `useMemo` to prevent recalculation on every render.

### Backwards compatibility for extras data
Old saved plans may store `selectedExtras` as a `string[]` (just IDs) rather than `SelectedExtra[]`. The `normExtras` helper in `WeekDetailView.tsx` handles both formats:
```typescript
const normExtras: SelectedExtra[] = rawExtras.map(e =>
  typeof e === 'string' ? { id: e, qty: 1 } : e
);
```

---

## 16. Known Decisions & Trade-offs

| Topic | Decision | Implication |
|---|---|---|
| Rate limiting in-memory | Simple, no Redis dependency | Resets on cold start; serverless instances don't share state |
| `recipes.json` as seed | No DB needed for seed data | Adding recipes requires a deploy; users can't edit seed recipes (only add custom ones) |
| `db push` instead of migrations | Faster iteration | No migration history; destructive changes need `--accept-data-loss` |
| Zustand localStorage persist | Offline-capable, simple | State can get stale; DataLoader re-syncs on every page load |
| WeekPlan.data as Json | Flexible schema | No type safety at DB level; validated client-side |
| `?` in workspace path | macOS TCC sandbox issue | Always use `/Users/root1/kitchenflow/` not the Documents path |

---

## 17. Environment Variables

Set in `.env.local` (local) and Vercel dashboard (production).

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | Neon PostgreSQL connection string (pooled) |
| `DATABASE_URL_UNPOOLED` | ✅ | Neon direct connection (used for migrations) |
| `NEXTAUTH_SECRET` | ✅ | Random secret for JWT signing (generate with `openssl rand -base64 32`) |
| `AUTH_URL` | Production | Full URL of the deployment (e.g. `https://weekcraft.vercel.app`) |

---

## 18. Common Tasks & How-Tos

### Add a new seed recipe
1. Open `data/recipes.json`
2. Append a new entry after `r053` with id `r054` (etc.)
3. Follow the `Recipe` interface (§8), use valid `cuisine` from CUISINES list, `prepTimeISO` as ISO 8601
4. Run `node -e "require('./data/recipes.json')"` to validate JSON
5. Commit and push to both remotes

### Add a new API route
1. Create `app/api/your-route/route.ts`
2. Import `auth` from `@/auth` and check session: `const session = await auth(); if (!session) return Response.json({error:'Unauthorized'},{status:401})`
3. Validate all inputs using helpers from `lib/validate.ts`
4. Use `prisma` from `lib/prisma.ts`

### Change the database schema
1. Edit `prisma/schema.prisma`
2. Run `npx prisma db push` (add `--accept-data-loss` if needed)
3. Run `npx prisma generate` if the Prisma client needs regenerating

### Add a new Zustand store
1. Create `app/store/yourStore.ts`
2. Use `create` with `persist` middleware, key `kitchenflow-yourstore`
3. Import and hydrate in `DataLoader.tsx` if server data is needed

### Deploy to production
```bash
git add .
git commit -m "Your message

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
git push origin main && git push weekcraftnext main
```
Vercel auto-deploys from `weekcraftnext/main`.

### Run locally with preview tools
Use the Python launcher at `/tmp/kf-launch.py` which bypasses the `?` path issue:
```bash
python3 /tmp/kf-launch.py
# or directly:
cd /Users/root1/kitchenflow && npm run dev
```
Dev server runs on **port 3000**.

### Inspect/debug the Prisma DB
```bash
cd /Users/root1/kitchenflow
npx prisma studio   # opens a web UI at localhost:5555
```

### Validate recipes.json
```bash
cd /Users/root1/kitchenflow
node -e "const r=require('./data/recipes.json'); console.log(r.length,'recipes'); r.forEach(x=>{ if(!x.id||!x.name||!x.labels||!x.ingredients) console.log('MISSING FIELDS:',x.id) })"
```
