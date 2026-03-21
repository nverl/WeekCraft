import { NextRequest, NextResponse } from 'next/server';

// ── Ingredient parser ─────────────────────────────────────────────────────────
// Handles strings like "2 cups all-purpose flour", "1/2 tsp salt", "3 large eggs"

const UNIT_MAP: Record<string, string> = {
  cup: 'cup', cups: 'cup',
  tablespoon: 'tbsp', tablespoons: 'tbsp', tbsp: 'tbsp', tbs: 'tbsp',
  teaspoon: 'tsp', teaspoons: 'tsp', tsp: 'tsp',
  ounce: 'oz', ounces: 'oz', oz: 'oz',
  pound: 'lb', pounds: 'lb', lb: 'lb', lbs: 'lb',
  gram: 'g', grams: 'g', g: 'g',
  kilogram: 'kg', kilograms: 'kg', kg: 'kg',
  milliliter: 'ml', milliliters: 'ml', ml: 'ml',
  liter: 'l', liters: 'l', l: 'l',
  clove: 'clove', cloves: 'clove',
  slice: 'slice', slices: 'slice',
  can: 'can', cans: 'can',
  bunch: 'bunch', bunches: 'bunch',
  piece: 'piece', pieces: 'piece',
};

function parseIngredientString(raw: string): {
  name: string; amount: number; unit: string; aisle: string; isStaple: boolean;
} {
  const trimmed = raw.trim();

  // Match leading number (integer, decimal, or fraction like 1/2 or 1 1/2)
  const numMatch = trimmed.match(/^(\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:\.\d+)?)/);
  let amount = 1;
  let rest = trimmed;

  if (numMatch) {
    const numStr = numMatch[1].trim();
    if (numStr.includes('/')) {
      if (numStr.includes(' ')) {
        // mixed number: "1 1/2"
        const [whole, frac] = numStr.split(/\s+/);
        const [n, d] = frac.split('/');
        amount = parseInt(whole) + parseInt(n) / parseInt(d);
      } else {
        const [n, d] = numStr.split('/');
        amount = parseInt(n) / parseInt(d);
      }
    } else {
      amount = parseFloat(numStr);
    }
    rest = trimmed.slice(numMatch[0].length).trim();
  }

  // Match optional unit word
  const unitMatch = rest.match(/^([a-zA-Z]+)\b/);
  let unit = 'piece';
  if (unitMatch) {
    const candidate = unitMatch[1].toLowerCase();
    if (UNIT_MAP[candidate]) {
      unit = UNIT_MAP[candidate];
      rest = rest.slice(unitMatch[0].length).trim();
    }
  }

  // Whatever remains is the ingredient name
  const name = rest.replace(/^[,\s]+/, '').trim() || trimmed;

  return { name: name || trimmed, amount: Math.round(amount * 100) / 100, unit, aisle: 'Other', isStaple: false };
}

// ── ISO duration helpers ──────────────────────────────────────────────────────

function isoToMins(iso: string): number {
  if (!iso) return 30;
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!m) return 30;
  return (parseInt(m[1] ?? '0') * 60) + parseInt(m[2] ?? '0');
}

// ── JSON-LD recipe extraction ─────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractRecipeFromJsonLd(parsed: any): any | null {
  if (!parsed) return null;
  const check = (obj: any): any | null => {
    if (!obj || typeof obj !== 'object') return null;
    const type = Array.isArray(obj['@type']) ? obj['@type'] : [obj['@type']];
    if (type.includes('Recipe')) return obj;
    if (obj['@graph']) {
      for (const node of obj['@graph']) {
        const r = check(node);
        if (r) return r;
      }
    }
    return null;
  };
  if (Array.isArray(parsed)) {
    for (const item of parsed) {
      const r = check(item);
      if (r) return r;
    }
    return null;
  }
  return check(parsed);
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  let url: string;
  try {
    ({ url } = await request.json());
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  if (!url || typeof url !== 'string') {
    return NextResponse.json({ error: 'URL is required.' }, { status: 400 });
  }

  // Fetch the page
  let html: string;
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; KitchenFlow/1.0; recipe-importer)',
        'Accept': 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: `Page returned HTTP ${res.status}. Check the URL and try again.` },
        { status: 422 },
      );
    }
    html = await res.text();
  } catch {
    return NextResponse.json(
      { error: 'Could not reach the page. Check the URL and your internet connection.' },
      { status: 422 },
    );
  }

  // Extract all JSON-LD blocks and find a Recipe schema
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let recipeData: any = null;
  const scriptRe = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = scriptRe.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(match[1]);
      recipeData = extractRecipeFromJsonLd(parsed);
      if (recipeData) break;
    } catch {
      // malformed JSON-LD — skip
    }
  }

  if (!recipeData) {
    return NextResponse.json(
      { error: 'No Recipe schema found on this page. The site may not support structured data.' },
      { status: 422 },
    );
  }

  // ── Parse fields ────────────────────────────────────────────────────────────

  const name: string = recipeData.name ?? '';

  // Prep time — prefer prepTime, fall back to totalTime
  const prepTimeSrc: string = recipeData.prepTime || recipeData.totalTime || 'PT30M';
  const prepMins = isoToMins(prepTimeSrc);
  const prepTimeISO = `PT${prepMins}M`;

  // Calories — nutrition.calories may be "450 calories" or just "450"
  const calRaw: string = String(recipeData.nutrition?.calories ?? recipeData.nutrition?.Energy ?? '');
  const caloriesPerPerson = parseInt(calRaw) || 400;

  // Recipe yield
  const yieldRaw = recipeData.recipeYield;
  const yieldStr = Array.isArray(yieldRaw) ? String(yieldRaw[0]) : String(yieldRaw ?? '2');
  const recipeYield = parseInt(yieldStr) || 2;

  // Ingredients
  const rawIngredients: string[] = Array.isArray(recipeData.recipeIngredient)
    ? recipeData.recipeIngredient.map(String)
    : [];
  const ingredients = rawIngredients.map(parseIngredientString);

  // Instructions
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawInstructions: any = recipeData.recipeInstructions ?? [];
  const instructions: string[] = [];

  const extractText = (node: any): void => {
    if (typeof node === 'string') { instructions.push(node); return; }
    if (node?.text) { instructions.push(String(node.text)); return; }
    if (Array.isArray(node?.itemListElement)) {
      node.itemListElement.forEach(extractText);
    }
  };

  if (typeof rawInstructions === 'string') {
    instructions.push(rawInstructions);
  } else if (Array.isArray(rawInstructions)) {
    rawInstructions.forEach(extractText);
  }

  // Source URL
  const sourceUrl = url;

  return NextResponse.json({
    name,
    prepTimeISO,
    caloriesPerPerson,
    recipeYield,
    ingredients,   // parsed { name, amount, unit, aisle, isStaple }[]
    instructions,  // string[]
    sourceUrl,
  });
}
