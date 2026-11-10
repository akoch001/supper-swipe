# Supper Swipe

Swipe through the dinners we like, filter by what's in the kitchen, and keep the scores in one place.

- `index.html`, `app.js`, `styles.css`, `shopping.js`: the page, with no build step.
- `data/recipes.json`: recipe text and starting scores. Editing it and pushing updates the deck, but scores saved in the app take priority.
- `netlify/functions/dishes.mjs` and `lib/dishes.mjs`: `/api/dishes`, which saves scores and added dishes in Netlify Blobs. The last save wins.
- `npm test` checks the saving rules and runs on every deploy.

## Starting ease score

Start at 5 and take off points. Oven and simmering time cost nothing.

- Pans and equipment: 2 = 1, 3 = 2, 4 or more = 3. Three mixing bowls count as one pan.
- Hands-on time: over 20 minutes = 1, over 40 minutes = 2.
- More than 10 ingredients = 1.
- Anything hard to find = 1.

The lowest score is 1. Anyone can change a score in the app.

## Shortlist and shopping list

The shortlist and the number of people per dish are kept per phone in the browser. `shopping.js` reads each recipe's ingredient lines, scales them to the number of people, adds up the same ingredient across dishes and sorts them by supermarket aisle. `node scripts/dump_shopping.mjs <file>` writes how every line was read, which is the quickest way to check a new recipe.

## Adding and editing dishes

"Get recipe" sends the link to `/api/dishes/import`, which reads the schema.org recipe data on the page (`lib/import.mjs`) and fills in the form. Nothing is saved until the form is. Any field can be edited; edits are stored like scores, field by field, and override `data/recipes.json`. The main ingredients are worked out from the ingredient list (`Shopping.mainsOf`). Dishes with `tried: false` are pink and dealt as every third card.

## Ticking off while cooking

On a dish's page, tapping an ingredient or a method step greys it out and strikes it through (a step's number becomes a tick); tapping again brings it back. The ticks are kept on the phone per dish (`supper-swipe-cooking` in localStorage), so locking the phone or reloading keeps your place, and they are forgotten after 18 hours.

## Cooking mode

"We're cooking this tonight" still does the bookkeeping (last cooked date, tried and tested, off the shortlist and Matches, a "cooked" count for the stats), then turns the dish's page into a kitchen view instead of going straight to the poster. The screen stays on while it is open (the Screen Wake Lock API, where the phone supports it), the ingredients and steps are bigger and tick off, and every time in the method ("roast for 30 to 40 minutes") becomes a button that starts a timer at the shorter time. Running timers stay in view at the top, named after the cooking word before the time and the step ("Roast · step 4"), and ring, buzz and show a message when they finish. A phone that locks may hold the ring until it is unlocked. Everything is kept on the phone (`supper-swipe-cook-session`, for 8 hours), so a reload keeps the timers. "Done cooking" ends it and shows the poster; "Tell someone" shows the poster at any time.

## History

"Your history" (top of All dishes, or `/history`) shows what the group has matched, chosen and cooked, newest first, each with a ✕ to delete it. Above the timeline it works out:

- **Hits**: how many times each dish was made, the usual gap between times ("usually every 3 weeks"), when you last had it and its average rating.
- **Picked a lot, never made**: swiped right 3 or more times but never cooked.
- **Always skipped**: swiped left 5 or more times and never right. A hint to delete it.

Events are one blob each, `history/<day>/<matched|chosen|cooked>/<dish>`, so the same thing twice in a day counts once. Matches are logged when the second like lands; "chosen" when someone presses "We're cooking this tonight". The first time a group opens its history, each dish's old "last cooked" date is copied in as a cooked event marked "from before history". Deleting a chosen or cooked event puts the dish's last cooked date back to the latest one left.

Swipes are not logged one by one (too much noise). Each phone counts rights and lefts per dish and sends them with its usage batch; the group keeps one blob, `swipes/per-dish`, with a running total and the last right swipe.

### How was it?

The next time anyone in the group opens the app, at least 3 hours after a dish was chosen (and within a week), it asks "How was the …?". A star rating saves the dish's rating and logs it as cooked; "We didn't make it after all" takes the chosen entry off the history; "Ask me later" asks again next time the app is opened. Whoever answers first answers for both.

### Later: predictions (v2)

The history is built so it can suggest dinners: "you usually have this every 3 weeks, it's been 5", dishes that are due, or a quiet nudge on the deck. Not built yet; it needs a few months of history first.

## How it looks

Each dish is a poster in the colour of its main ingredient (pink for dishes still to try), with a plate of up to three emoji. `plate()` in `app.js` picks them: first the foods the dish's name mentions, then its main ingredients. The colours, fonts and motion are all in `styles.css`; `prefers-reduced-motion` turns the motion off. Choosing "We're cooking this tonight" shows the dish as a full-screen poster that can be shared.

`icons/icon.svg` is the home-screen icon. The two PNGs are that file rendered at 192 and 512 pixels.

The site has no password. The API has no login of its own: the group cookie (set by a group's link) decides which group's dishes, likes and history you see.

## Reading a recipe with AI

When a link has no recipe data, or you pick a PDF or photo in the Add a dish form, an AI model reads it and fills in the form for you to check. It needs `ANTHROPIC_API_KEY` set in Netlify's environment variables. Without one, the form says AI reading is not switched on and everything else works as before. Each reading is paid for on that API account. Since 10 Nov 2026 the key belongs to its own **supper-swipe workspace** in the Anthropic Console, with its own monthly spend limit (Console → Spending → Spend limits → Workspace limits → supper-swipe), so this app can never spend past it; the organisation's limit still sits above it. To rotate the key, create the new one inside that workspace (a key made in Default is uncapped), paste it into Netlify's `ANTHROPIC_API_KEY` for Production, Deploy Previews, Branch deploys and Preview Server (leave Local development empty: Netlify treats that value as not secret), then trigger a deploy, because Netlify does not redeploy on a variable change. Revoke the old key afterwards. The model is named in `lib/reader.mjs`. The work runs in a background function, `netlify/functions/read-recipe.mjs`, because it can outlast a normal request.

## Matches

Each phone says once who it belongs to. A right swipe, or adding a dish to the shortlist, also saves a like on the server (`likes/<person>/<dish>`). A dish any two people in the group like is a match, and it stays in the Matches list until it is cooked or removed. The shortlist itself stays per phone.

## Groups

Each group has its own link (`/?g=ludo-eva`) and its own store in Netlify Blobs, so its likes, scores, added dishes and photos never reach another group. The groups and their people are listed in `lib/groups.mjs`; adding a group is a line there. Adam and Laura's group uses the store everything was in before groups, and a phone that sends no group is treated as theirs. A new group starts with the dishes in `data/recipes.json`, with their ease and speed but no liked ratings. A phone opened without its link, such as from the home screen, asks who it is from everyone in every group, and the name picked sets the group.

## Sending the list to AH

The shopping list can put its items on an AH account's list, using the API AH's own app uses. There is no official one, so it may stop working. To connect, run `node scripts/ah-login.mjs` on a computer and log in to AH in the window it opens. The tokens stay in Netlify Blobs under `ah/tokens` and never reach the page. Disconnect AH on the shopping list removes them. Nothing here can touch the basket or place an order.

## Stage two: sharing with family (in progress)

Agreed with Adam, November 2026. Check off as each step is done.

1. Done: groups. Each has its own link and store (see Groups above). Groups so far: Adam and Laura, Ludo and Eva, Marius and Marinke.
2. Done: AI reading is capped at 5 reads per person per calendar month (Dutch time), in `lib/allowance.mjs`. The page sends who it is with each read, and the count sits in the group's own store under `usage/reads/<month>/<person>`. A read counts when the model is about to be asked, so one that never starts, or a page that can't be fetched, is free. The Add a dish form shows reads left and says when they are used up; recipe links with their own recipe data still import free. Also set a monthly spend limit in the Anthropic Console as the hard ceiling. A cheaper model in `lib/reader.mjs` could cut costs, but test it on a few PDFs and photos first.
3. Done: "Lexi proof" is "Kid friendly" on screen. The saved field is still `lexi`, so existing marks stay.
4. Done: usage is tracked per group, person and day in `lib/usage.mjs`: one blob per group per day (`usage/day/2026-11-10`) holding everyone's swipes, likes, matches, dishes cooked and AI reads. The server counts likes, matches and reads where they happen. The phone counts swipes and cooking and sends them to `/api/dishes/usage` in batches (20 seconds after a swipe, 2 after cooking, and when the page is put away), so swiping never waits on the network. A like sent twice counts once. Undoing a swipe doesn't take a count back.
5. Done: `/stats` (also `/status`) shows that usage: per group, totals per person, when each person last used it, and a day-by-day table. Adam and Laura's group sees every group; any other group sees only its own. It goes by the group cookie the app sets, so a browser that has never opened the app sees nothing (`lib/stats.mjs`, `stats.html`, `stats.js`).

Decided: the dishes Adam and Laura added in the app, with their edits and photos, are copied once into each new group on its first load, without their liked score or last-cooked date (`lib/copy.mjs`). A marker blob `copied/first-group` stops it running twice. After that each copy belongs to the group, and dishes Adam and Laura add later are not copied.

The AH buttons only open a search in the AH app or site on whoever's phone it is. Sending to an AH list was never connected, so nothing reaches Adam's account.
