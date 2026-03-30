# WeekCraft — QA Test Scenarios

> **Purpose:** Regression and functional test coverage for every feature area.
> **When to run:** Before every production release, after any change to stores, API routes, or UI flows.
> **Format:** Each scenario has a unique ID, preconditions, numbered steps, and expected results.
> **Notation:** `→` = action, `✓` = expected result.

---

## Table of Contents

1. [Authentication & Registration](#1-authentication--registration)
2. [Wizard — Plan Generation](#2-wizard--plan-generation)
3. [Calendar — Month View](#3-calendar--month-view)
4. [Calendar — Week Detail View](#4-calendar--week-detail-view)
5. [Recipe Modal](#5-recipe-modal)
6. [Shopping List](#6-shopping-list)
7. [Recipes Tab](#7-recipes-tab)
8. [Extras Tab](#8-extras-tab)
9. [Ingredients Tab](#9-ingredients-tab)
10. [Settings Page](#10-settings-page)
11. [Household Management](#11-household-management)
12. [Household Scope Switching](#12-household-scope-switching)
13. [Data Persistence & Hydration](#13-data-persistence--hydration)
14. [Security & Input Validation](#14-security--input-validation)
15. [Edge Cases & Boundary Values](#15-edge-cases--boundary-values)

---

## 1. Authentication & Registration

### TC-AUTH-01 — Successful registration
**Preconditions:** No existing account with the chosen username.

1. → Navigate to `/register`
2. → Enter username: `testuser1` (valid: 3–30 alphanumeric+`_.‑`)
3. → Enter password: `Password1` (valid: ≥8 chars, ≥1 uppercase, ≥1 digit)
4. → Submit

✓ User is created and auto-signed in
✓ Redirected to `/` (home / wizard)
✓ Session cookie is set

---

### TC-AUTH-02 — Registration validation — weak password
1. → Navigate to `/register`
2. → Enter username: `testuser2`
3. → Enter password: `weakpass` (no uppercase or digit)
4. → Submit

✓ Error message shown: "Password must be at least 8 characters and contain a digit and uppercase letter" (or similar)
✓ No account created

---

### TC-AUTH-03 — Registration validation — duplicate username
**Preconditions:** User `testuser1` already exists.

1. → Navigate to `/register`
2. → Enter username: `testuser1`
3. → Enter a valid password
4. → Submit

✓ Error shown: username taken
✓ No new account created

---

### TC-AUTH-04 — Registration rate limiting
1. → Submit registration form with invalid data 11 times in quick succession from the same IP

✓ After the 10th attempt within 15 minutes, response is HTTP 429
✓ Rate-limit error shown in the UI

---

### TC-AUTH-05 — Login with correct credentials
**Preconditions:** Account `testuser1` / `Password1` exists.

1. → Navigate to `/login`
2. → Enter correct credentials
3. → Submit

✓ Redirected to `/`
✓ Avatar initials in header match username

---

### TC-AUTH-06 — Login with wrong password
1. → Navigate to `/login`
2. → Enter correct username, wrong password
3. → Submit

✓ Error message shown
✓ User remains on `/login`

---

### TC-AUTH-07 — Unauthenticated access to protected routes
1. → Without logging in, navigate to `/`
2. → Without logging in, call `GET /api/plans` directly

✓ Both redirect to `/login` or return HTTP 401
✓ No user data exposed

---

## 2. Wizard — Plan Generation

### TC-WIZ-01 — Complete wizard with default settings
**Preconditions:** Logged-in user with no existing plans.

1. → Open app; wizard opens automatically (no plans exist)
2. → Step 1: leave all days as default label (`healthy`)
3. → Step 2: leave people = default from `defaultPeople`; extras unchanged
4. → Step 3: click "Save plan"

✓ 7 recipe cards shown in Step 3 (one per day)
✓ Plan is saved (visible in calendar)
✓ Wizard closes, home view shown
✓ That week is auto-selected in shopping list

---

### TC-WIZ-02 — Per-day label selection
1. → Step 1: set Mon=Healthy, Tue=Low Carb, Wed=Cheat, Thu=High Protein, Fri=Any, Sat=Free day (none), Sun=Healthy
2. → Proceed to Step 3

✓ Saturday shows "Free day" card (no recipe)
✓ Other days show a recipe matching their label
✓ "Cheat" day shows a recipe tagged `cheat`

---

### TC-WIZ-03 — People counter (Step 2)
1. → Step 2: increase people to 4
2. → Proceed to Step 3
3. → Confirm plan
4. → Open recipe modal for any day

✓ Ingredient amounts in modal are scaled to 4 people (`(4 / recipeYield) * amount`)

---

### TC-WIZ-04 — Days counter (Step 2)
1. → Step 2: set days = 5
2. → Step 3: confirm plan

✓ Only 5 day cards shown in the plan
✓ Days 6–7 are absent or shown as empty

---

### TC-WIZ-05 — Max prep time filter
1. → Step 1: set Monday's max prep time to 20 min
2. → Step 3: confirm

✓ Recipe assigned to Monday has prep time ≤ 20 min
✓ If no recipe matches, any recipe is used as fallback (no crash)

---

### TC-WIZ-06 — Max calories filter
1. → Step 1: set Wednesday's max calories to 400 kcal/person
2. → Step 3: confirm

✓ Recipe on Wednesday has calories ≤ 400 per person
✓ Fallback used if no recipe qualifies

---

### TC-WIZ-07 — Disabled recipes are excluded from generation
**Preconditions:** Disable "Grilled Salmon & Quinoa Bowl" in the Recipes tab.

1. → Create a new plan via wizard
2. → Step 3: inspect all 7 days

✓ "Grilled Salmon & Quinoa Bowl" does not appear in any day slot
✓ Other recipes fill the pool normally

---

### TC-WIZ-08 — Extra selection (Step 2)
1. → Step 2: find a drink extra (e.g. "Green Smoothie"), set qty to 2
2. → Confirm plan
3. → Navigate to Shopping List

✓ Smoothie ingredients appear in shopping list, amounts × 2

---

### TC-WIZ-09 — Wizard plan avoids recipe repeats
**Preconditions:** Enough recipes exist in the pool for 7 days.

1. → Complete wizard with all days set to the same label
2. → Step 3: inspect plan

✓ No recipe appears in more than one day slot (or repeats only when pool is exhausted)

---

### TC-WIZ-10 — Planning a specific week from MonthCalendar
1. → Navigate to Calendar tab
2. → Click "Plan week" on a future unplanned week row
3. → Complete the wizard

✓ Wizard header shows the target week (e.g. "Planning week of Apr 6 – Apr 12")
✓ After confirmation, that week appears as planned in the month grid
✓ Wizard closes and returns to Calendar → MonthCalendar

---

### TC-WIZ-11 — Regenerate week from WeekDetailView
**Preconditions:** One week plan exists.

1. → Open that week in WeekDetailView
2. → Click "Regenerate week"
3. → Complete wizard
4. → Confirm

✓ Week plan is overwritten with new recipes
✓ Old plan no longer visible

---

### TC-WIZ-12 — Cancel wizard when plans exist
**Preconditions:** At least one plan exists.

1. → Click "New plan" in the header
2. → Wizard opens
3. → Click cancel / back

✓ Wizard closes
✓ Previous plans are unchanged
✓ Home view is shown

---

## 3. Calendar — Month View

### TC-CAL-01 — Month grid renders correctly
1. → Navigate to Calendar tab

✓ Month name and year shown in header
✓ Week rows displayed Mon–Sun
✓ Day numbers correct for current month
✓ Weeks spanning month boundaries show days from both months

---

### TC-CAL-02 — Current week highlight
1. → Navigate to Calendar tab
2. → Observe the current week row (today falls within this week)

✓ Row has visible ring/border highlight
✓ "This week" badge is shown above the row

---

### TC-CAL-03 — Month navigation
1. → Click `<` (previous month) button
2. → Click `>` (next month) button

✓ Month and year update correctly
✓ Week rows update to show correct weeks
✓ "This week" badge only appears if current week is visible in that month

---

### TC-CAL-04 — Planned week shows recipe chips
**Preconditions:** Plan exists for current week.

1. → Navigate to Calendar tab

✓ Planned week row shows recipe name chips (truncated if long)
✓ Each chip has a colour matching its label (healthy = green, cheat = orange, etc.)

---

### TC-CAL-05 — Click planned week opens WeekDetailView
**Preconditions:** Plan exists for a week.

1. → Click on a planned week row

✓ WeekDetailView opens for that week
✓ Week range title shown (e.g. "Mar 23 – Mar 29")
✓ 7-day strip visible

---

### TC-CAL-06 — "Plan week" button on unplanned row
1. → Navigate to Calendar tab
2. → Find an unplanned week row
3. → Click "Plan week"

✓ Wizard opens
✓ Wizard targets that specific week (header shows week range)

---

### TC-CAL-07 — Delete planned week
**Preconditions:** At least one planned week exists.

1. → Hover / tap the `×` delete icon on a planned week row
2. → Confirm deletion

✓ Week is removed from the month grid
✓ Row returns to "unplanned" state with "Plan week" button
✓ Week is also removed from shopping list selector

---

## 4. Calendar — Week Detail View

### TC-WDV-01 — 7-day strip navigation
**Preconditions:** A plan exists for a week.

1. → Open WeekDetailView for that week
2. → Tap each day in the strip

✓ Active day card updates to show selected day's recipe
✓ Day strip highlights the active day

---

### TC-WDV-02 — Swap recipe
1. → Open WeekDetailView
2. → Tap a day
3. → Click "Swap" on the meal card

✓ Recipe changes to a different recipe with the same label
✓ Change persists after page reload (saved to DB via weekPlanStore)
✓ Shopping list reflects new ingredient set

---

### TC-WDV-03 — Swap with disabled recipes available
**Preconditions:** Disable one recipe; ensure the label pool has at least 2 enabled recipes.

1. → Swap a day that uses that label

✓ Disabled recipe appears as a swap option (disabled recipes are available for manual swap)

---

### TC-WDV-04 — Per-day people override
1. → Open WeekDetailView
2. → Tap a day
3. → Use people stepper (+ / −) to change to 3

✓ Meal card shows updated people count
✓ Recipe modal for that day shows ingredients scaled to 3
✓ Change persists across reload

---

### TC-WDV-05 — Mark day as free day
1. → Open WeekDetailView
2. → Tap a day that has a recipe
3. → Click "Mark as free day"
4. → Optionally add a note

✓ Day slot shows "Free day" instead of a recipe
✓ Note (if entered) displays on the card
✓ Shopping list removes that day's ingredients

---

### TC-WDV-06 — Back to month calendar
1. → Open WeekDetailView
2. → Click `← Month` back button

✓ Returns to MonthCalendar
✓ Active week is deselected (monthCalendar shows full grid)

---

### TC-WDV-07 — Recipe Picker modal (manual assign)
1. → Open WeekDetailView
2. → Tap a day
3. → Click "Choose recipe" / use recipe picker
4. → Search for and select a specific recipe

✓ Selected recipe assigned to that day
✓ Persists across reload

---

## 5. Recipe Modal

### TC-MOD-01 — Modal covers full screen (portal rendering)
1. → Open any recipe modal (from WeekDetailView meal card)

✓ Modal covers the bottom navigation bar completely
✓ Modal covers the top header bar
✓ No UI elements are visible behind the modal backdrop

---

### TC-MOD-02 — Ingredient scaling
**Preconditions:** Day is set to 4 people; recipe yield is 2.

1. → Open recipe modal for that day

✓ Each ingredient amount is `(4 / 2) × base amount = 2× base`
✓ Unit is preserved

---

### TC-MOD-03 — Numbered instructions
1. → Open any recipe modal

✓ Instructions shown as a numbered list
✓ All steps present and in order

---

### TC-MOD-04 — Favourite toggle
1. → Open recipe modal
2. → Click the star/heart favourite button

✓ Icon changes to filled/active state
✓ Recipe appears in "Favourites" filter in Recipes tab
✓ State persists after reload (stored server-side)

---

### TC-MOD-05 — Recipe note auto-save
1. → Open recipe modal
2. → Type a note in the notes field
3. → Wait 1 second (debounce fires)
4. → Reload the page
5. → Reopen the modal

✓ Note is still present (saved to server)

---

### TC-MOD-06 — Source URL link
**Preconditions:** Recipe has a `sourceUrl`.

1. → Open recipe modal

✓ Link renders with `rel="nofollow"` and opens in a new tab
✓ `javascript:` URLs do not render as links

---

### TC-MOD-07 — YouTube embed
**Preconditions:** Recipe has a `youtubeUrl`.

1. → Open recipe modal

✓ YouTube iframe embed is visible and playable
✓ No CSP violations in browser console

---

### TC-MOD-08 — Backdrop dismiss
1. → Open recipe modal
2. → Click the dark backdrop area outside the modal

✓ Modal closes
✓ WeekDetailView is still visible and functional

---

## 6. Shopping List

### TC-SHP-01 — List builds from single week plan
**Preconditions:** One week plan with 7 recipes exists; that week is selected.

1. → Navigate to Shopping tab

✓ Items grouped by aisle
✓ Each item shows aggregated amount and unit
✓ Item count matches expected ingredients across 7 days

---

### TC-SHP-02 — Pantry toggle
1. → Tick an item in the shopping list

✓ Item moves to "In Pantry" section
✓ Progress bar percentage increases
✓ Untick: item returns to main list

---

### TC-SHP-03 — Progress bar
**Preconditions:** Shopping list has 10 items.

1. → Mark 5 items as in pantry

✓ Progress bar shows 50%
✓ Label reads "5 of 10 items ready" (or similar)

---

### TC-SHP-04 — Show / hide staples
1. → Open shopping list
2. → Toggle "Show staples"

✓ Staple items appear / disappear
✓ Item count updates accordingly
✓ Progress bar recalculates

---

### TC-SHP-05 — Multi-week selection
**Preconditions:** Two week plans exist.

1. → Click "All weeks" pill in the shopping header to expand week selector
2. → Check Week 1 only

✓ Shopping list shows only Week 1 ingredients
3. → Also check Week 2

✓ Ingredients from both weeks are aggregated (matching items summed)

---

### TC-SHP-06 — "Select all" weeks
1. → Expand week selector
2. → Click "Select all"

✓ All planned weeks checked
✓ List aggregates all weeks

---

### TC-SHP-07 — "Clear" weeks
1. → With all weeks selected, click "Clear"

✓ No weeks selected
✓ Shopping list shows empty state or 0 items

---

### TC-SHP-08 — Extras included in shopping list
**Preconditions:** A plan with qty-2 "Green Smoothie" extra exists; that week is selected.

1. → Open shopping list

✓ Smoothie ingredients present, amounts × 2
✓ Aisle grouping correct

---

### TC-SHP-09 — Pantry state preserved across rebuild
1. → Mark 3 items as in pantry
2. → Toggle a different week in the selector (triggers rebuildMultiList)

✓ The 3 items that were in pantry remain ticked / in-pantry after rebuild
✓ New items from the added week appear un-ticked

---

### TC-SHP-10 — Compact header (collapsed state)
1. → Navigate to Shopping tab

✓ Header shows compact "N weeks" pill and `…` button
✓ Week rows and action buttons are hidden by default
2. → Click the "N weeks" pill

✓ Week selector expands inline
3. → Click `…`

✓ Action buttons expand inline

---

## 7. Recipes Tab

### TC-RCP-01 — Browse all recipes
1. → Navigate to Recipes tab

✓ "BUILT-IN (N)" section shows seed recipes
✓ "MY RECIPES" section empty if no custom recipes
✓ Each card shows: name, cuisine/label badges, "Built-in" lock badge, prep time, calories

---

### TC-RCP-02 — Search recipes
1. → Type "salmon" in the search box

✓ Only recipes with "salmon" in the name (or matching text) are shown
✓ Clear (×) button resets the list

---

### TC-RCP-03 — Filter by cuisine
1. → Click the "Italian" cuisine chip

✓ Only Italian recipes shown
✓ Chip is visually selected

---

### TC-RCP-04 — Filter by favourites
**Preconditions:** At least one recipe is favourited.

1. → Click the ★ Favourites chip

✓ Only favourited recipes shown

---

### TC-RCP-05 — Add custom recipe
1. → Click "+ Add"
2. → Fill in: Name, labels (pick "Healthy"), cuisine, prep time, calories, yield, instructions (2 steps), ingredients (2 items)
3. → Click "Add Recipe"

✓ Recipe appears in "MY RECIPES" section
✓ Recipe is available in wizard plan generation and swap pool
✓ Persisted server-side (visible after reload)

---

### TC-RCP-06 — Edit custom recipe
**Preconditions:** Custom recipe "My Pasta" exists.

1. → Click the pencil (Edit) button on "My Pasta"
2. → Change name to "My Pasta v2"
3. → Click "Save Changes"

✓ Recipe card shows "My Pasta v2"
✓ Change persists after reload

---

### TC-RCP-07 — Delete custom recipe
1. → Click delete (trash) on a custom recipe
2. → Confirm dialog

✓ Recipe removed from "MY RECIPES"
✓ Removed from favourites if previously favourited
✓ Persisted (not re-added on reload)

---

### TC-RCP-08 — Duplicate & edit a built-in recipe
1. → Find a built-in recipe (e.g. "Grilled Salmon & Quinoa Bowl")
2. → Click "Duplicate & edit"
3. → Editor opens pre-filled with built-in's data
4. → Change name to "My Salmon Bowl"
5. → Click "Save as My Recipe"

✓ New custom recipe "My Salmon Bowl" appears in MY RECIPES
✓ Original built-in "Grilled Salmon & Quinoa Bowl" is unchanged
✓ New recipe available in wizard pool

---

### TC-RCP-09 — Disable a built-in recipe
1. → Find a built-in recipe
2. → Click the eye toggle (EyeOff icon)

✓ Recipe card dims / shows "Disabled" badge
✓ Eye icon changes to indicate disabled state
✓ State survives page reload (stored in `disabledBuiltinIds` localStorage)

---

### TC-RCP-10 — Re-enable a disabled built-in
1. → Click the eye toggle again on a disabled built-in

✓ "Disabled" badge disappears
✓ Recipe returns to full opacity
✓ Recipe included in next plan generation

---

### TC-RCP-11 — Disable custom recipe
1. → Click eye toggle on a custom recipe
2. → Confirm (optimistic update)
3. → Reload

✓ Recipe shown as disabled after reload (DB persisted via `PUT /api/user-recipes/[id]`)
✓ Excluded from wizard auto-generation

---

## 8. Extras Tab

### TC-EXT-01 — Browse extras
1. → Navigate to Recipes tab → Extras sub-tab

✓ Built-in extras shown in "Built-in" section
✓ Category badges (Drink / Breakfast / Snack / Other) displayed
✓ Ingredient preview (up to 3 names + "+N more")

---

### TC-EXT-02 — Add custom extra
1. → Click "+ Add Extra"
2. → Fill in: name "My Oat Smoothie", emoji 🥣, category "Drink", add 2 ingredients
3. → Save

✓ "My Oat Smoothie" appears in "My Extras" section
✓ Available in wizard Step 2 for selection
✓ Persisted after reload

---

### TC-EXT-03 — Edit custom extra
1. → Click "Edit" on a custom extra
2. → Change the name
3. → Save

✓ Updated name shown on the card
✓ Persisted after reload

---

### TC-EXT-04 — Delete custom extra
1. → Click "Delete" on a custom extra
2. → Confirm

✓ Extra removed from My Extras
✓ No longer available in wizard

---

### TC-EXT-05 — Duplicate & edit built-in extra
1. → Find a built-in extra
2. → Click "Duplicate & edit"
3. → Editor pre-filled with built-in's data
4. → Change name, save

✓ New custom extra created with updated name
✓ Built-in extra unchanged
✓ Custom extra available in wizard

---

### TC-EXT-06 — Built-in extras cannot be directly edited or deleted
1. → Inspect a built-in extra card

✓ No "Edit" button visible — only "Duplicate & edit"
✓ No "Delete" button visible

---

## 9. Ingredients Tab

### TC-ING-01 — Browse ingredients
1. → Navigate to Recipes tab → Ingredients sub-tab

✓ Ingredients grouped by aisle
✓ Each entry shows name and default unit
✓ Built-in entries show lock badge "Built-in"

---

### TC-ING-02 — Search ingredients
1. → Type "tomato" in the search field

✓ Only matching ingredients shown
✓ Aisle groups with no matches hidden

---

### TC-ING-03 — Filter by aisle
1. → Select "Produce" from the aisle dropdown

✓ Only Produce ingredients shown

---

### TC-ING-04 — Add custom ingredient
1. → Click "+ Add"
2. → Fill: name "Sumac", default unit "tsp", aisle "Spices"
3. → Save

✓ "Sumac" appears in Spices group
✓ Available as autocomplete in recipe editor
✓ Persisted after reload

---

### TC-ING-05 — Edit custom ingredient
1. → Click pencil on a custom ingredient
2. → Change the unit
3. → Save

✓ Updated unit shown
✓ Persisted after reload

---

### TC-ING-06 — Delete custom ingredient
1. → Click trash on a custom ingredient
2. → Confirm dialog

✓ Ingredient removed
✓ Not present after reload

---

### TC-ING-07 — Duplicate built-in ingredient
1. → Find a built-in ingredient (e.g. "Garlic")
2. → Click "Duplicate"

✓ New custom ingredient "Garlic (copy)" created
✓ Original built-in unchanged

---

### TC-ING-08 — Built-in ingredients cannot be directly edited or deleted
1. → Inspect a built-in ingredient row

✓ Pencil/edit button absent; "Duplicate" button shown instead
✓ No delete button visible

---

## 10. Settings Page

### TC-SET-01 — Section ordering
1. → Navigate to `/settings`
2. → Scroll through the full page

✓ Sections appear in order:
  1. Default household size
  2. Username
  3. Password
  4. My household
  5. Joined households (only shown if member of ≥1)
  6. Sign out
  7. Danger zone (at the very bottom)

---

### TC-SET-02 — Change default household size
1. → Tap `+` to increase default people to 4
2. → Wait for auto-save feedback

✓ "Default saved" success message shown
✓ Next wizard opened has people pre-set to 4
✓ Persisted after reload (loaded from `/api/account/me`)

---

### TC-SET-03 — Change username
1. → Enter a new valid username
2. → Click "Save username"

✓ Success feedback shown
✓ Header avatar initials update
✓ Change persists after logout and re-login

---

### TC-SET-04 — Change username — too short
1. → Enter username "ab" (2 chars)
2. → Click "Save username"

✓ Error shown or form prevented (min 3 chars)

---

### TC-SET-05 — Change password
1. → Enter current correct password
2. → Enter new password (`NewPass2`)
3. → Enter confirm password (same)
4. → Click "Change password"

✓ Success message shown
✓ Can log in with new password
✓ Old password no longer works

---

### TC-SET-06 — Change password — wrong current password
1. → Enter wrong current password
2. → Enter new password
3. → Submit

✓ Error: "Current password is incorrect" (or similar)
✓ Password unchanged

---

### TC-SET-07 — Change password — mismatch confirm
1. → Enter new password "NewPass2"
2. → Enter confirm "NewPass3"
3. → Submit

✓ Error: "Passwords do not match" (client-side, before submit)

---

### TC-SET-08 — Delete account
1. → Click "Delete" in Danger zone
2. → Confirmation input appears; type username
3. → Click "Delete my account"

✓ Account deleted
✓ Signed out and redirected to `/login`
✓ Cannot log in with old credentials
✓ All plans/recipes/extras removed from DB (cascade)

---

### TC-SET-09 — Sign out
1. → Click "Sign out"

✓ Session cleared
✓ Redirected to `/login`
✓ Navigating to `/` redirects to `/login`

---

## 11. Household Management

### TC-HHD-01 — Create household
1. → Navigate to Settings
2. → Enter household name "The Smiths"
3. → Click "Create household"

✓ "My household" section updates to show household name + owner badge
✓ Household appears in HouseholdSwitcher dropdown
✓ "Create a household" option replaced by household name

---

### TC-HHD-02 — Generate invite link
**Preconditions:** User owns a household.

1. → In "My household" section, optionally enter a note
2. → Click "Generate & copy invite link"

✓ Link copied to clipboard (check clipboard content)
✓ Pending invite appears in "Pending invites" list
✓ Toast / "Link copied!" confirmation shown

---

### TC-HHD-03 — Accept invite
**Preconditions:** User A generated an invite link. User B is logged in.

1. → User B visits the invite URL
2. → Invite preview page shows household name and optional note
3. → User B clicks "Accept"

✓ User B becomes a member of the household
✓ User B's HouseholdSwitcher shows the household
✓ User A's member list shows User B

---

### TC-HHD-04 — Expired invite
**Preconditions:** Invite token older than 7 days.

1. → Visit the expired invite URL

✓ Error message: "This invite has expired"
✓ Accept button disabled or absent

---

### TC-HHD-05 — Accept own invite
**Preconditions:** Owner visits their own invite link.

1. → Click "Accept"

✓ Error: cannot join your own household
✓ No duplicate membership created

---

### TC-HHD-06 — Revoke invite
**Preconditions:** At least one pending invite exists.

1. → In Settings, click the trash icon next to a pending invite

✓ Invite removed from the list
✓ Visiting the revoked invite URL shows "Invite not found" or similar

---

### TC-HHD-07 — Remove household member
**Preconditions:** Household has at least one member.

1. → In Settings → My household → Members, click the remove button for a member

✓ Member removed from the list
✓ That user's HouseholdSwitcher no longer shows the household
✓ That user's active scope resets to "Personal" if they were on that household's scope

---

### TC-HHD-08 — Dissolve household
**Preconditions:** User owns a household with members.

1. → Click "Dissolve household"

✓ Confirmation prompt shown
✓ Household deleted from DB (cascade: members, invites, plans)
✓ Settings page returns to "Create a household" state
✓ HouseholdSwitcher reverts to "Personal" only

---

### TC-HHD-09 — Leave joined household
**Preconditions:** User is a member (not owner) of a household.

1. → Settings → Joined households → Click "Leave" for a household

✓ Household removed from "Joined households" list
✓ HouseholdSwitcher no longer shows it
✓ If user was scoped to that household, scope resets to Personal

---

### TC-HHD-10 — Invite rate limiting
1. → Generate 21 invite links within 1 hour

✓ After the 20th, HTTP 429 returned
✓ Error shown in the UI

---

## 12. Household Scope Switching

### TC-SCO-01 — HouseholdSwitcher always visible
1. → Log in as a user with no household
2. → Inspect the header

✓ HouseholdSwitcher dropdown is visible showing "Personal"
✓ Dropdown contains "Create a household" shortcut

---

### TC-SCO-02 — Switch to household scope
**Preconditions:** User is a member of "The Smiths".

1. → Click HouseholdSwitcher dropdown
2. → Select "The Smiths"

✓ Active scope switches to "The Smiths"
✓ Plans shown are the household's plans (not personal)
✓ Scope persists after reload (localStorage)

---

### TC-SCO-03 — Personal plans not visible in household scope
**Preconditions:** User has a personal plan for Week A and a household plan for Week B.

1. → Switch to household scope

✓ Only Week B (household plan) visible in Calendar
✓ Week A (personal) not visible

2. → Switch back to Personal scope

✓ Week A visible, Week B not visible

---

### TC-SCO-04 — Scope auto-reset on membership loss
**Preconditions:** User is scoped to a household; owner then removes the user.

1. → Reload the app

✓ Scope automatically resets to "Personal"
✓ No error or empty state crash

---

## 13. Data Persistence & Hydration

### TC-PER-01 — Plans persist across reload
**Preconditions:** A week plan was saved.

1. → Hard reload the page (`Cmd+Shift+R`)

✓ Plan is still shown in Calendar
✓ Shopping list still populated
✓ No loading error

---

### TC-PER-02 — DataLoader hydrates all stores on mount
1. → Log in as a user with recipes, extras, plans, and a household
2. → Open the app

✓ Recipes tab shows custom recipes
✓ Extras tab shows custom extras
✓ Calendar shows all plans
✓ HouseholdSwitcher shows correct household list
✓ No "Loading…" state persists beyond 3 seconds

---

### TC-PER-03 — Zustand localStorage sync
1. → Complete a plan via wizard
2. → Open browser DevTools → Application → localStorage
3. → Check `weekcraft-wizard-v3` key

✓ `dayConfigs`, `people`, `plan` match the created plan

---

### TC-PER-04 — Disabled built-in IDs persist via localStorage
1. → Disable a built-in recipe
2. → Reload the page

✓ Recipe still shown as disabled
✓ `weekcraft-recipes-v1` localStorage key contains the recipe's ID in `disabledBuiltinIds`

---

### TC-PER-05 — Shopping pantry state persists across reload
1. → Mark 5 items as in-pantry
2. → Reload the page

✓ 5 items still shown as in-pantry
✓ Progress bar shows correct percentage

---

## 14. Security & Input Validation

### TC-SEC-01 — XSS in recipe name
1. → Create a custom recipe with name: `<script>alert(1)</script>`

✓ Script does not execute
✓ Name rendered as escaped text (or rejected by validation)

---

### TC-SEC-02 — URL injection in recipe source URL
1. → Create/edit a recipe; set sourceUrl to `javascript:alert(1)`

✓ API rejects the URL (only `http://` and `https://` allowed)
✓ Error shown in editor; no JS link rendered

---

### TC-SEC-03 — Unauthorized recipe mutation
**Preconditions:** User A has a custom recipe with a known ID.

1. → As User B, call `PUT /api/user-recipes/[User A's recipe ID]`

✓ HTTP 403 or 404 returned
✓ Recipe unchanged

---

### TC-SEC-04 — Unauthorized plan access
**Preconditions:** User A has a personal plan.

1. → As User B, call `GET /api/plans?scope=personal` (User B's session)

✓ Returns User B's plans only, not User A's

---

### TC-SEC-05 — Household plan access limited to members
**Preconditions:** Household "The Smiths" has plans; User C is not a member.

1. → As User C, call `GET /api/plans?scope=[The Smiths' householdId]`

✓ HTTP 403 or empty response — plans not exposed

---

### TC-SEC-06 — Registration password strength
| Password | Expected result |
|---|---|
| `short1A` | Passes (8 chars, has digit, has uppercase) |
| `toolongpasswordwithnodigitorupper` | Fails — no digit/uppercase |
| `Password` | Fails — no digit |
| `password1` | Fails — no uppercase |
| `P@ssw0rd!` | Passes |

---

### TC-SEC-07 — Username character validation
| Username | Expected result |
|---|---|
| `alice` | Valid |
| `bob_123` | Valid |
| `hi` | Invalid — too short (< 3) |
| `a`.repeat(31) | Invalid — too long (> 30) |
| `alice!` | Invalid — special char `!` not allowed |

---

## 15. Edge Cases & Boundary Values

### TC-EDG-01 — All days set to "Free day" in wizard
1. → Wizard Step 1: set all 7 days to label "none" (free)
2. → Confirm plan

✓ 7 free-day cards shown
✓ Shopping list has no recipe ingredients (extras still included if selected)
✓ No crash

---

### TC-EDG-02 — All built-in recipes disabled, wizard generates plan
**Preconditions:** All 10+ built-in recipes disabled; no custom recipes.

1. → Open wizard, complete all steps

✓ Wizard does not crash
✓ Fallback behaviour: uses disabled recipes or shows "no recipes available" state gracefully (no blank/null day)

---

### TC-EDG-03 — 1 person, 1 day wizard
1. → Step 2: set people = 1, days = 1
2. → Confirm

✓ Plan saved with 1 day
✓ Ingredients scaled to 1 person
✓ Shopping list shows 1 day's worth of ingredients

---

### TC-EDG-04 — 12 people wizard
1. → Step 2: set people = 12
2. → Confirm
3. → Open recipe modal

✓ All ingredient amounts correctly scaled ×(12 / yield)
✓ No overflow or display issues

---

### TC-EDG-05 — Recipe with yield = 1 (no scaling adjustment needed)
**Preconditions:** A recipe has `recipeYield: 1`.

1. → Set people = 3
2. → Check recipe modal

✓ Ingredient amounts are `3 × base`

---

### TC-EDG-06 — Shopping list with 0 weeks selected
1. → Shopping tab: open week selector
2. → Deselect all weeks

✓ Shopping list shows empty state message
✓ No crash or blank items

---

### TC-EDG-07 — Two weeks with overlapping ingredients
**Preconditions:** Both weeks contain a recipe using "Olive Oil 30ml Oils & Vinegars".

1. → Select both weeks in shopping list

✓ Olive Oil appears once with combined amount (60ml)

---

### TC-EDG-08 — Delete the only planned week
**Preconditions:** Exactly one plan exists.

1. → Delete the week from MonthCalendar

✓ Calendar shows no planned weeks
✓ "Plan week" button appears
✓ Shopping list shows empty state
✓ Wizard does NOT auto-open (only opens automatically when no plans exist AND app first loads)

---

### TC-EDG-09 — Navigate directly to `/settings` without session
1. → Clear cookies / log out
2. → Navigate to `/settings`

✓ Redirected to `/login`
✓ After login, redirected back to settings

---

### TC-EDG-10 — Invite URL visited when already a member
**Preconditions:** User is already a member of "The Smiths".

1. → Visit an invite link for "The Smiths"

✓ Error shown: "You are already a member"
✓ No duplicate HouseholdMember record created

---

### TC-EDG-11 — Long recipe name / note overflow
1. → Create a custom recipe with a 100-character name
2. → View it in calendar chips and recipe cards

✓ Name truncated with ellipsis; no layout break

---

### TC-EDG-12 — Rapid swap (double-click)
1. → Open WeekDetailView
2. → Double-click "Swap" on a day very quickly

✓ No duplicate swaps applied
✓ Single recipe shown
✓ Store not in inconsistent state

---

## Appendix: Test Data Setup

| Entity | Value |
|---|---|
| Test user 1 | `tester1` / `Tester123` |
| Test user 2 | `tester2` / `Tester456` |
| Test household | "QA Household" |
| Built-in recipe to disable | "Grilled Salmon & Quinoa Bowl" |
| Custom recipe | "My Test Pasta" — Healthy, Italian, PT30M, 450 kcal, yield 2 |
| Custom extra | "QA Smoothie" — Drink, 3 ingredients |
| Custom ingredient | "Matcha Powder" — tsp, Baking |

---

## Appendix: Regression Checklist

Run after every release:

- [ ] TC-AUTH-01 — Registration and login
- [ ] TC-WIZ-01 — Default plan generation
- [ ] TC-WIZ-07 — Disabled recipes excluded
- [ ] TC-CAL-02 — Current week highlight
- [ ] TC-CAL-05 — Click week → WeekDetailView
- [ ] TC-WDV-02 — Swap recipe persists
- [ ] TC-MOD-01 — Modal covers full screen
- [ ] TC-SHP-01 — Shopping list populates
- [ ] TC-SHP-02 — Pantry toggle
- [ ] TC-SHP-09 — Pantry preserved on rebuild
- [ ] TC-RCP-08 — Duplicate & edit built-in recipe
- [ ] TC-RCP-09 — Disable built-in recipe
- [ ] TC-EXT-05 — Duplicate & edit built-in extra
- [ ] TC-HHD-03 — Accept household invite
- [ ] TC-SCO-01 — HouseholdSwitcher always visible
- [ ] TC-SET-01 — Settings section ordering
- [ ] TC-PER-01 — Plans persist across reload
- [ ] TC-SEC-03 — Unauthorized recipe mutation blocked
