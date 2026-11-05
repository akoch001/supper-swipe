# Supper Swipe

Swipe through the dinners we like, filter by what's in the kitchen, and keep the scores in one place.

- `index.html`, `app.js`, `styles.css`: the page, with no build step.
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
