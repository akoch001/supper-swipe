import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import '../shopping.js';

const read = line => Shopping.parseLine(line).map(p => [p.name, p.aisle, p.qty, p.unit]);
const find = (aisles, name) => aisles.flatMap(a => a.items).find(i => i.name === name);

test('reads the awkward ingredient lines', () => {
  assert.deepEqual(read('2 x 400g tins plum tomatoes'), [['Tinned plum tomatoes', 'tins', 800, 'g']]);
  assert.deepEqual(read('1 head of garlic, puréed'), [['Garlic', 'veg', 10, 'clove']]);
  assert.deepEqual(read('4 boneless, skinless chicken thighs'), [['Chicken thighs', 'meat', 4, '']]);
  assert.deepEqual(read('180ml cream or coconut milk'), [['Cream', 'dairy', 180, 'ml']]);
  assert.deepEqual(read('Rice, about 250g dry'), [['Rice', 'dry', 250, 'g']]);
  assert.deepEqual(read('1 tbsp egg white'), [['Eggs', 'dairy', 1, '']]);
  assert.deepEqual(read('4 to 5 celery sticks, diced'), [['Celery', 'veg', 5, 'stick']]);
  assert.deepEqual(read('Salt and pepper').map(p => p[0]), ['Salt', 'Black pepper']);
  assert.deepEqual(read('Handful of coriander and basil').map(p => p[0]), ['Coriander', 'Basil']);
  assert.deepEqual(read('130g smooth peanut butter')[0].slice(0, 2), ['Peanut butter', 'tins']);
  assert.deepEqual(read('70g Parma ham (optional)')[0].slice(0, 2), ['Parma ham', 'meat']);
  assert.equal(Shopping.parseLine('70g Parma ham (optional)')[0].optional, true);
});

test('adds up the same ingredient across dishes and shows each dish', () => {
  const aisles = Shopping.build([
    { title: 'A', shopping: ['3 garlic cloves, sliced', '100g feta', '1 tbsp olive oil'], factor: 1 },
    { title: 'B', shopping: ['2 garlic cloves', '150g feta, cubed', '2 tbsp olive oil'], factor: 1 }
  ]);
  assert.equal(find(aisles, 'Garlic').amount, '5 cloves');
  assert.equal(find(aisles, 'Feta').amount, '250 g');
  assert.equal(find(aisles, 'Olive oil').amount, '3 tbsp');
  assert.deepEqual(find(aisles, 'Feta').uses.map(u => [u.dish, u.amount]), [['A', '100 g'], ['B', '150 g']]);
});

test('scales amounts for the number of people and rounds whole items up', () => {
  const aisles = Shopping.build([{ title: 'A', shopping: ['500g chicken breast', '3 onions', '1 lemon'], factor: 0.5 }]);
  assert.equal(find(aisles, 'Chicken breasts').amount, '250 g');
  assert.equal(find(aisles, 'Onions').amount, '2');
  assert.equal(find(aisles, 'Lemons').amount, '1');
});

test('sorts by aisle and keeps unknown items', () => {
  const aisles = Shopping.build([{ title: 'A', shopping: ['1 lime', '100g dragon fruit', '2 eggs'], factor: 1 }]);
  assert.deepEqual(aisles.map(a => a.key), ['veg', 'dairy', 'other']);
  assert.equal(aisles[2].items[0].name, '100g dragon fruit'.replace('100g d', 'D'));
});

test('every line in the real recipes lands in a known aisle', () => {
  const dishes = JSON.parse(readFileSync(new URL('../data/recipes.json', import.meta.url), 'utf8'));
  const unknown = Object.values(dishes).flatMap(d => d.shopping).flatMap(Shopping.parseLine).filter(p => p.aisle === 'other').map(p => p.raw);
  assert.deepEqual(unknown, []);
});

test('reads American measures from imported recipes', () => {
  assert.deepEqual(read('1.5 lbs boneless, skinless chicken breast, cubed'), [['Chicken breasts', 'meat', 681, 'g']]);
  assert.deepEqual(read('1 1/2 cups orzo'), [['Orzo', 'dry', 1.5, 'cup']]);
  assert.deepEqual(read('2 tablespoons olive oil'), [['Olive oil', 'sauces', 6, 'tsp']]);
  assert.deepEqual(read('4 ounces feta cheese'), [['Feta', 'dairy', 112, 'g']]);
});

test('takes the main ingredients from the full list', () => {
  assert.deepEqual(Shopping.mainsOf(['1 onion', '2 tbsp olive oil', '500g chicken thighs', '70g Parma ham (optional)', '200g orzo', '100g feta', '200ml chicken stock', '2 garlic cloves']), ['chicken', 'orzo', 'feta']);
  assert.deepEqual(Shopping.mainsOf(['400g tin chopped tomatoes', '100g cherry tomatoes']), ['tomatoes']);
  assert.deepEqual(Shopping.mainsOf(undefined), []);
});

test('writes a readable PDF that spills onto new pages', () => {
  const short = Buffer.from(Shopping.toPdf(Shopping.build([{ title: 'A', shopping: ['200ml crème fraîche', '2 (small) onions'], factor: 1 }]), 'Shopping list', 'For: A (one)')).toString('latin1');
  assert.ok(short.startsWith('%PDF-1.4'));
  assert.ok(short.includes('(Crème fraîche: 200 ml) Tj'));
  assert.ok(short.includes('(For: A \\(one\\)) Tj'));
  assert.ok(short.includes('/Count 1 '));
  const lines = Array.from({ length: 150 }, (_, i) => '100g item number ' + i);
  const long = Buffer.from(Shopping.toPdf(Shopping.build([{ title: 'A', shopping: lines, factor: 1 }]), 'Shopping list', 'For: A')).toString('latin1');
  assert.ok(long.includes('/Count 2 '));
  const offsets = long.slice(long.lastIndexOf('xref\n0')).match(/\d{10} 00000 n/g).map(x => Number(x.slice(0, 10)));
  offsets.forEach((at, n) => assert.ok(long.startsWith((n + 1) + ' 0 obj', at)));
});

test('marks WhatsApp headings only when asked', () => {
  const aisles = Shopping.build([{ title: 'A', shopping: ['2 eggs'], factor: 1 }]);
  assert.equal(Shopping.toText(aisles), 'Dairy and eggs\n- Eggs: 2');
  assert.equal(Shopping.toText(aisles, '*'), '*Dairy and eggs*\n- Eggs: 2');
});

test('reads the wordings recipe sites use', () => {
  assert.deepEqual(read('900ml chicken or vegetable stock'), [['Chicken stock', 'tins', 900, 'ml']]);
  assert.deepEqual(read('1 tbsp olive or rapeseed oil')[0].slice(0, 2), ['Olive oil', 'sauces']);
  assert.deepEqual(read('180ml cream or coconut milk'), [['Cream', 'dairy', 180, 'ml']]);
  assert.deepEqual(read('1 to 1½ pounds chicken thighs'), [['Chicken thighs', 'meat', 681, 'g']]);
  assert.deepEqual(read('2–3 tbsp olive oil'), [['Olive oil', 'sauces', 9, 'tsp']]);
  assert.deepEqual(read('1.2 litres vegetable stock'), [['Vegetable stock', 'tins', 1200, 'ml']]);
  assert.deepEqual(read('2 heaped tablespoons crunchy peanut butter'), [['Peanut butter', 'tins', 6, 'tsp']]);
  assert.deepEqual(read('1 garlic bulb'), [['Garlic', 'veg', 10, 'clove']]);
  assert.deepEqual(read('Juice of 2 limes'), [['Limes', 'veg', 2, '']]);
  assert.deepEqual(read('Zest and juice of 1 lemon'), [['Lemons', 'veg', 1, '']]);
  assert.deepEqual(read('60ml lemon juice').map(p => [p[0], Math.round(p[2] * 10) / 10]), [['Lemons', 1.3]]);
  assert.deepEqual(read('Lemon juice, to taste'), [['Lemons', 'veg', null, '']]);
  assert.deepEqual(read('Salt and pepper, to taste').map(p => p[0]), ['Salt', 'Black pepper']);
  assert.deepEqual(read('1/2 tsp pepper')[0].slice(0, 2), ['Black pepper', 'spices']);
  assert.deepEqual(read('2 red peppers, sliced')[0].slice(0, 2), ['Peppers', 'veg']);
  assert.deepEqual(read('Coriander, mint and basil, to serve').map(p => p[0]), ['Coriander', 'Mint', 'Basil']);
  for (const [line, name] of [['4 green onions', 'Spring onions'], ['2 tbsp rice vinegar', 'Rice vinegar'], ['1 tsp garlic powder', 'Garlic powder'], ['2 cups beef broth', 'Beef stock'],
    ['400g butter beans', 'Butter beans'], ['2 x 145g tins tuna in olive oil', 'Tuna'], ['2 tbsp tomato purée', 'Tomato paste']]) assert.equal(read(line)[0][0], name, line);
  assert.equal(Shopping.parseLine('1 red chilli, optional')[0].optional, true);
});

test('shows part cups, and says when some of an ingredient has no amount', () => {
  const aisles = Shopping.build([
    { title: 'A', shopping: ['1/4 cup soy sauce', '1 1/2 cups orzo', 'Rice, to serve'], factor: 1 },
    { title: 'B', shopping: ['300g rice'], factor: 1 }
  ]);
  assert.equal(find(aisles, 'Soy sauce').amount, '0.25 cups');
  assert.equal(find(aisles, 'Orzo').amount, '1.5 cups');
  assert.equal(find(aisles, 'Rice').amount, '300 g + some');
});

test('main ingredients: mince counts as its meat, a spoon of egg white does not count as eggs', () => {
  assert.deepEqual(Shopping.mainsOf(['500g pork mince', '1 tbsp egg white', '200g rice']), ['pork', 'rice']);
  assert.deepEqual(Shopping.mainsOf(['2 eggs', 'Salt and pepper, to taste']), ['eggs']);
});

test('every ingredient in the real recipes has a Dutch search at AH', () => {
  const dishes = JSON.parse(readFileSync(new URL('../data/recipes.json', import.meta.url), 'utf8'));
  const names = new Set(Object.values(dishes).flatMap(d => d.shopping).flatMap(Shopping.parseLine).map(p => p.name));
  const english = n => Shopping.ahSearch(n) === 'https://www.ah.nl/zoeken?query=' + encodeURIComponent(n);
  const same = ['Broccoli', 'Oregano', 'Chorizo', 'Ham', 'Mascarpone', 'Feta', 'Halloumi', 'Cheddar', 'Burrata', 'Ciabatta', 'Couscous', 'Orzo', 'Pasta', 'Spaghetti'];
  assert.deepEqual([...names].filter(english).filter(n => n.toLowerCase() !== decodeURIComponent(Shopping.ahSearch(n).split('=')[1]) && !same.includes(n)), []);
  assert.equal(Shopping.ahSearch('Tinned plum tomatoes'), 'https://www.ah.nl/zoeken?query=gepelde%20tomaten');
  assert.equal(Shopping.ahSearch('Dragon fruit'), 'https://www.ah.nl/zoeken?query=Dragon%20fruit');
});

test('Crisp searches for the same Dutch name', () => {
  assert.equal(Shopping.crispSearch('Tinned plum tomatoes'), 'https://crisp.nl/app/search?query=gepelde%20tomaten');
  assert.equal(Shopping.crispSearch('Dragon fruit'), 'https://crisp.nl/app/search?query=Dragon%20fruit');
});

test('reads servings written in words', () => {
  assert.equal(Shopping.servesOf({ serves: 'about 8' }), 8);
  assert.equal(Shopping.servesOf({ serves: '4 as a side, 2 as a main' }), 4);
  assert.equal(Shopping.servesOf({ serves: 6 }), 6);
  assert.equal(Shopping.servesOf({}), 4);
});
