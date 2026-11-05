// Prints how every recipe line is read, to check the aisles and amounts by eye.
import { readFileSync, writeFileSync } from 'node:fs';
import '../shopping.js';

const dishes = JSON.parse(readFileSync(new URL('../data/recipes.json', import.meta.url), 'utf8'));
const out = [];
for (const dish of Object.values(dishes)) {
  for (const line of dish.shopping) {
    const read = Shopping.parseLine(line).map(p => `${p.name} [${p.aisle}] ${p.qty === null ? '-' : Math.round(p.qty * 100) / 100} ${p.unit}`);
    out.push(`${line}  =>  ${read.join(' | ')}`);
  }
}
writeFileSync(process.argv[2], [...new Set(out)].sort().join('\n') + '\n', 'utf8');
