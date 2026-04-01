export type DayLabel = 'healthy' | 'low-carb' | 'cheat' | 'high-protein' | 'any';

/** A selected extra with a quantity (e.g. 3 smoothies). */
export interface SelectedExtra {
  id: string;
  qty: number;
}
export type ExtraCategory = 'drink' | 'breakfast' | 'snack' | 'other';

export interface Ingredient {
  name: string;
  amount: number;
  unit: string;
  aisle: string;
  isStaple: boolean;
}

/** A non-meal food item (smoothie, snack, etc.) that adds to the shopping list. */
export interface Extra {
  id: string;
  name: string;
  emoji: string;
  category: ExtraCategory;
  ingredients: Ingredient[];
  isCustom?: boolean;
}

export const CUISINES = [
  'American', 'Asian', 'French', 'Greek', 'Indian',
  'Italian', 'Japanese', 'Mediterranean', 'Mexican',
  'Middle Eastern', 'Spanish', 'Thai', 'Other',
] as const;
export type Cuisine = typeof CUISINES[number];

export interface Recipe {
  id: string;
  name: string;
  labels: DayLabel[];
  cuisine?: string;     // e.g. "Italian", "Asian"
  prepTimeISO: string;
  caloriesPerPerson: number;
  recipeYield: number;
  instructions: string[];
  ingredients: Ingredient[];
  sourceUrl?: string;   // Link to the original recipe page
  youtubeUrl?: string;  // YouTube video URL (embedded in the recipe modal)
  enabled?: boolean;    // false = disabled, excluded from auto-generation (default true)
}

/** Per-day wizard configuration: meal type + per-day filters + free-day metadata. */
export interface DayConfig {
  label: DayLabel | 'none';
  maxPrepMins: number | null;   // null = Any
  maxCalories: number | null;   // null = Any
  freeNote: string;             // Used when label === 'none'
  freeCalories: number | null;  // Used when label === 'none'
  people?: number;              // Per-day override; falls back to week-level default
}

export interface DayPlan {
  day: string;    // e.g. "Monday"
  date: string;   // ISO date string
  label: DayLabel | 'none';
  recipe: Recipe | null;        // null for 'none' / free days
  scaledIngredients: Ingredient[];
  freeNote?: string;
  freeCalories?: number | null;
  people?: number;  // per-day override; falls back to week-level people
}

export interface ShoppingItem extends Ingredient {
  recipeId: string;
  recipeName: string;
  scaledAmount: number;
  inPantry: boolean;
}

// ─── Ingredient catalog ───────────────────────────────────────────────────────

/** A reusable ingredient entry in the catalog (not tied to a recipe amount). */
export interface IngredientEntry {
  id: string;
  name: string;
  defaultUnit: string;   // e.g. "g", "piece", "cup"
  aisle: string;         // e.g. "Produce"
  isCustom?: boolean;
}

// ─── Multi-week planning ──────────────────────────────────────────────────────

export interface WeekPlan {
  weekStart: string;       // ISO string of Monday 00:00:00 UTC
  dayConfigs: DayConfig[]; // per-day config (replaces legacy dayLabels)
  people: number;
  days: DayPlan[];         // 7 entries (Mon–Sun)
  selectedExtras?: SelectedExtra[]; // extras selected for this week with quantities
}

// ─── Custom shopping items ────────────────────────────────────────────────────

export interface CustomShoppingItem {
  id: string;
  name: string;
  inCart: boolean;
}

// ─── Wizard state ─────────────────────────────────────────────────────────────

export interface WizardState {
  dayConfigs: DayConfig[];
  people: number;
  days: number;
  plan: DayPlan[];
  currentStep: 1 | 2 | 3;
  targetWeekStart: string | null; // ISO Monday — which week this wizard run is for
  selectedExtras: SelectedExtra[]; // extras picked during this wizard session with quantities
}
