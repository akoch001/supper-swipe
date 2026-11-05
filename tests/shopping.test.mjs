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

test('reads servings written in words', () => {
  assert.equal(Shopping.servesOf({ serves: 'about 8' }), 8);
  assert.equal(Shopping.servesOf({ serves: '4 as a side, 2 as a main' }), 4);
  assert.equal(Shopping.servesOf({ serves: 6 }), 6);
  assert.equal(Shopping.servesOf({}), 4);
});
