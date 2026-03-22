/**
 * Shared label configuration used across MealCard, RecipeModal,
 * RecipesView, HomeView, Step1, Step3, and WeekDetailView.
 *
 * Keep this file as the single source of truth for label colours,
 * display names, and icons.
 */

import { Leaf, Zap, Flame, Coffee, Dumbbell, Shuffle } from 'lucide-react';

export type DayLabelKey = 'healthy' | 'low-carb' | 'cheat' | 'high-protein' | 'any' | 'none';

export interface LabelConfig {
  /** React icon element */
  icon: React.ReactNode;
  /** Human-readable display name */
  text: string;
  /** Tailwind bg class (light tint) */
  bg: string;
  /** Tailwind text colour class */
  color: string;
  /** Tailwind border-left accent class (used in WeekDetailView) */
  border: string;
  /** Hex / Tailwind dot colour used in calendar strips */
  dot: string;
}

export const LABEL_CONFIG: Record<string, LabelConfig> = {
  healthy: {
    icon:   <Leaf size={13} />,
    text:   'Healthy',
    bg:     'bg-emerald-100',
    color:  'text-emerald-700',
    border: 'border-l-emerald-400',
    dot:    'bg-emerald-400',
  },
  'high-protein': {
    icon:   <Dumbbell size={13} />,
    text:   'High Protein',
    bg:     'bg-violet-100',
    color:  'text-violet-700',
    border: 'border-l-violet-400',
    dot:    'bg-violet-400',
  },
  'low-carb': {
    icon:   <Zap size={13} />,
    text:   'Low Carb',
    bg:     'bg-sky-100',
    color:  'text-sky-700',
    border: 'border-l-sky-400',
    dot:    'bg-sky-400',
  },
  cheat: {
    icon:   <Flame size={13} />,
    text:   'Cheat Day',
    bg:     'bg-orange-100',
    color:  'text-orange-700',
    border: 'border-l-orange-400',
    dot:    'bg-orange-400',
  },
  any: {
    icon:   <Shuffle size={13} />,
    text:   'Any',
    bg:     'bg-zinc-100',
    color:  'text-zinc-600',
    border: 'border-l-zinc-300',
    dot:    'bg-zinc-400',
  },
  none: {
    icon:   <Coffee size={13} />,
    text:   'Free day',
    bg:     'bg-zinc-100',
    color:  'text-zinc-500',
    border: 'border-l-zinc-200',
    dot:    'bg-zinc-200',
  },
};

/** Fallback for unknown labels */
export const DEFAULT_LABEL = LABEL_CONFIG.healthy;
