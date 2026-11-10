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

## How it looks

Each dish is a poster in the colour of its main ingredient (pink for dishes still to try), with a plate of up to three emoji. `plate()` in `app.js` picks them: first the foods the dish's name mentions, then its main ingredients. The colours, fonts and motion are all in `styles.css`; `prefers-reduced-motion` turns the motion off. Choosing "We're cooking this tonight" shows the dish as a full-screen poster that can be shared.

`icons/icon.svg` is the home-screen icon. The two PNGs are that file rendered at 192 and 512 pixels.

The site sits behind Netlify's site-wide password, which also covers `/api`. The API has no login of its own.

## Reading a recipe with AI

When a link has no recipe data, or you pick a PDF or photo in the Add a dish form, an AI model reads it and fills in the form for you to check. It needs `ANTHROPIC_API_KEY` set in Netlify's environment variables. Without one, the form says AI reading is not switched on and everything else works as before. Each reading is paid for on that API account. Since 10 Nov 2026 the key belongs to its own **supper-swipe workspace** in the Anthropic Console, with its own monthly spend limit (Console → Spending → Spend limits → Workspace limits → supper-swipe), so this app can never spend past it; the organisation's limit still sits above it. To rotate the key, create the new one inside that workspace (a key made in Default is uncapped), paste it into Netlify's `ANTHROPIC_API_KEY` for Production, Deploy Previews, Branch deploys and Preview Server (leave Local development empty: Netlify treats that value as not secret), then trigger a deploy, because Netlify does not redeploy on a variable change. Revoke the old key afterwards. The model is named in `lib/reader.mjs`. The work runs in a background function, `netlify/functions/read-recipe.mjs`, because it can outlast a normal request.

## Matches

Each phone says once whether it is Adam's or Laura's. A right swipe, or adding a dish to the shortlist, also saves a like on the server (`likes/<person>/<dish>`). A dish you both like is a match, and it stays in the Matches list until it is cooked or removed. The shortlist itself stays per phone.

## Sending the list to AH

The shopping list can put its items on an AH account's list, using the API AH's own app uses. There is no official one, so it may stop working. To connect, run `node scripts/ah-login.mjs` on a computer and log in to AH in the window it opens. The tokens stay in Netlify Blobs under `ah/tokens` and never reach the page. Disconnect AH on the shopping list removes them. Nothing here can touch the basket or place an order.
