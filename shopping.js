// Turns recipe ingredient lines into one shopping list, added up and sorted by supermarket aisle.
(function () {
  const AISLES = [
    ['veg', 'Vegetables and fruit'],
    ['herbs', 'Fresh herbs'],
    ['meat', 'Meat and poultry'],
    ['fish', 'Fish'],
    ['dairy', 'Dairy and eggs'],
    ['bakery', 'Bread and bakery'],
    ['dry', 'Pasta, rice and noodles'],
    ['tins', 'Tins, jars and packets'],
    ['frozen', 'Frozen'],
    ['sauces', 'Oils, sauces and vinegars'],
    ['spices', 'Spices, seasoning and baking'],
    ['drinks', 'Wine and spirits'],
    ['other', 'Everything else']
  ];

  const FOODS = {
    veg: {
      aubergine: 'Aubergines', cauliflower: 'Cauliflower', carrot: 'Carrots', celery: 'Celery', leek: 'Leeks', onion: 'Onions',
      'red onion': 'Red onions', 'yellow onion': 'Onions', 'spring onion': 'Spring onions', shallot: 'Shallots', garlic: 'Garlic', ginger: 'Ginger',
      spinach: 'Spinach', broccoli: 'Broccoli', 'pak choi': 'Pak choi', 'bean sprout': 'Bean sprouts', mango: 'Mangoes', peach: 'Peaches',
      lemon: 'Lemons', 'lemon juice': 'Lemon juice', lime: 'Limes', 'lime juice': 'Lime juice', orange: 'Oranges', potato: 'Potatoes', pepper: 'Peppers',
      'red pepper': 'Peppers', 'red chilli': 'Red chillies', 'cherry tomato': 'Cherry tomatoes', tomato: 'Tomatoes',
      'stir-fry vegetable': 'Stir-fry vegetables', salad: 'Salad', 'green salad': 'Salad', mushroom: 'Mushrooms', courgette: 'Courgettes',
      cucumber: 'Cucumber', avocado: 'Avocados', zucchini: 'Courgettes', 'bell pepper': 'Peppers', 'orange pepper': 'Peppers', 'yellow pepper': 'Peppers',
      'green pepper': 'Peppers', scallion: 'Spring onions', chilli: 'Red chillies', lettuce: 'Salad', 'salad green': 'Salad', radish: 'Radishes', corn: 'Corn', apple: 'Apples', 'green onion': 'Spring onions', 'sweet potato': 'Sweet potatoes', 'green bean': 'Green beans', 'sugar snap': 'Sugar snap peas'
    },
    herbs: {
      basil: 'Basil', 'thai basil': 'Thai basil', coriander: 'Coriander', parsley: 'Parsley', mint: 'Mint', sage: 'Sage',
      rosemary: 'Rosemary', thyme: 'Thyme', oregano: 'Oregano', 'fresh herbs': 'Mixed herbs', 'soft herbs': 'Mixed herbs', cilantro: 'Coriander', chive: 'Chives', 'lime leaf': 'Lime leaves', 'lime leaves': 'Lime leaves'
    },
    meat: {
      chicken: 'Chicken', 'whole chicken': 'Whole chicken', 'chicken breast': 'Chicken breasts', 'chicken thigh': 'Chicken thighs',
      'chicken thigh mince': 'Chicken thigh mince', bacon: 'Bacon', 'streaky bacon': 'Bacon', 'parma ham': 'Parma ham', ham: 'Ham',
      beef: 'Beef', mince: 'Mince', 'beef mince': 'Beef mince', pork: 'Pork', 'pork mince': 'Pork mince', lamb: 'Lamb', sausage: 'Sausages',
      chorizo: 'Chorizo', turkey: 'Turkey', steak: 'Steak'
    },
    fish: {
      salmon: 'Salmon', hake: 'Hake', haddock: 'Haddock', 'smoked haddock': 'Smoked haddock', prawn: 'Prawns', shrimp: 'Prawns',
      scallop: 'Scallops', cod: 'Cod', tuna: 'Tuna'
    },
    dairy: {
      butter: 'Butter', 'crème fraîche': 'Crème fraîche', cream: 'Cream', mascarpone: 'Mascarpone', milk: 'Milk', egg: 'Eggs', 'egg yolk': 'Eggs',
      'egg white': 'Eggs', feta: 'Feta', halloumi: 'Halloumi', parmesan: 'Parmesan', cheddar: 'Cheddar', 'gruyère': 'Gruyère', burrata: 'Burrata',
      yogurt: 'Greek yogurt', cheese: 'Cheese', 'feta cheese': 'Feta', 'parmesan cheese': 'Parmesan', 'cheddar cheese': 'Cheddar'
    },
    bakery: {
      tortilla: 'Tortillas', bread: 'Bread', ciabatta: 'Ciabatta', 'ciabatta breadcrumb': 'Ciabatta', breadcrumb: 'Breadcrumbs', ladyfinger: 'Ladyfingers', 'garlic bread': 'Garlic bread'
    },
    dry: {
      rice: 'Rice', 'brown rice': 'Brown rice', noodle: 'Noodles', 'rice noodle': 'Rice noodles', 'vermicelli rice noodle': 'Vermicelli rice noodles',
      'egg noodle': 'Egg noodles', couscous: 'Couscous', 'cous cous': 'Couscous', orzo: 'Orzo', lasagne: 'Lasagne sheets', tortellini: 'Cheese tortellini', pasta: 'Pasta', spaghetti: 'Spaghetti'
    },
    tins: {
      'chopped tomato': 'Tinned chopped tomatoes', 'plum tomato': 'Tinned plum tomatoes', 'roasted red pepper': 'Jarred roasted red peppers',
      'sun-dried tomato': 'Sun-dried tomatoes', 'tomato paste': 'Tomato paste', 'coconut milk': 'Coconut milk', 'pineapple ring': 'Tinned pineapple rings',
      olive: 'Olives', caper: 'Capers', 'chicken stock': 'Chicken stock', 'chicken broth': 'Chicken stock', 'beef stock': 'Beef stock', 'vegetable stock': 'Vegetable stock', cashew: 'Cashews', almond: 'Almonds', 'peanut butter': 'Peanut butter',
      'crispy onion': 'Crispy onions', prune: 'Prunes', peanut: 'Peanuts', coffee: 'Coffee', lentil: 'Lentils', 'puy lentil': 'Puy lentils',
      chickpea: 'Chickpeas', bean: 'Beans', 'candied jalapeño': 'Candied jalapeños', 'tomato purée': 'Tomato paste', 'tomato puree': 'Tomato paste', 'beef broth': 'Beef stock', 'vegetable broth': 'Vegetable stock', 'butter bean': 'Butter beans'
    },
    frozen: { edamame: 'Edamame beans' },
    sauces: {
      oil: 'Cooking oil', 'olive oil': 'Olive oil', 'sesame oil': 'Sesame oil', 'soy sauce': 'Soy sauce', tamari: 'Tamari', 'fish sauce': 'Fish sauce',
      'oyster sauce': 'Oyster sauce', 'teriyaki sauce': 'Teriyaki sauce', 'sambal oelek': 'Sambal oelek', 'curry paste': 'Curry paste',
      'thai curry paste': 'Thai curry paste', 'tamarind paste': 'Tamarind paste', 'balsamic vinegar': 'Balsamic vinegar', 'red wine vinegar': 'Red wine vinegar',
      'white vinegar': 'White vinegar', 'hot sauce': 'Hot sauce', 'mango chutney': 'Mango chutney', honey: 'Honey', mustard: 'Mustard', 'wholegrain mustard': 'Wholegrain mustard', 'rice vinegar': 'Rice vinegar', 'rice wine vinegar': 'Rice vinegar', 'white wine vinegar': 'White wine vinegar', 'cider vinegar': 'Cider vinegar', 'apple cider vinegar': 'Cider vinegar', 'sherry vinegar': 'Sherry vinegar', 'avocado oil': 'Cooking oil', 'chilli oil': 'Chilli oil', 'tomato ketchup': 'Tomato ketchup', 'chilli sauce': 'Chilli sauce'
    },
    spices: {
      salt: 'Salt', 'black pepper': 'Black pepper', 'chilli flake': 'Chilli flakes', 'smoked paprika': 'Smoked paprika', 'ground cumin': 'Ground cumin',
      'cumin seed': 'Cumin seeds', turmeric: 'Turmeric', 'coriander seed': 'Coriander seeds', 'ground coriander': 'Ground coriander', 'carom seed': 'Carom seeds',
      'curry powder': 'Curry powder', 'kashmiri chilli powder': 'Kashmiri chilli powder', 'garlic granule': 'Garlic granules', 'fennel seed': 'Fennel seeds',
      'dried oregano': 'Dried oregano', 'bay leaf': 'Bay leaves', 'bay leaves': 'Bay leaves', 'dried red chilli': 'Dried chillies', sugar: 'Sugar',
      'brown sugar': 'Brown sugar', cornflour: 'Cornflour', flour: 'Plain flour', 'cardamom pod': 'Cardamom pods', "piment d'espelette": "Piment d'espelette",
      paprika: 'Paprika', 'cayenne pepper': 'Cayenne pepper', 'italian seasoning': 'Italian seasoning', 'ground cinnamon': 'Ground cinnamon', cinnamon: 'Ground cinnamon',
      'sesame seed': 'Sesame seeds', 'cocoa powder': 'Cocoa powder', 'dark chocolate': 'Dark chocolate', 'garlic powder': 'Garlic powder', 'onion powder': 'Onion powder', 'chilli powder': 'Chilli powder', 'red pepper flake': 'Chilli flakes', 'ground ginger': 'Ground ginger'
    },
    drinks: {
      'white wine': 'White wine', 'red wine': 'Red wine', 'rice wine': 'Rice wine', sherry: 'Dry sherry', champagne: 'Champagne', vodka: 'Vodka', rum: 'Rum'
    }
  };

  const KEYWORDS = [];
  for (const aisle of Object.keys(FOODS)) {
    for (const [word, name] of Object.entries(FOODS[aisle])) {
      KEYWORDS.push({ word, name, aisle, pattern: new RegExp('(?:^|[^\\p{L}])' + word + '(?:s|es)?(?![\\p{L}])', 'u') });
    }
  }
  KEYWORDS.sort((a, b) => b.word.length - a.word.length);

  const FRACTIONS = { '½': 0.5, '¼': 0.25, '¾': 0.75, '⅓': 1 / 3, '⅔': 2 / 3 };
  const UNIT = 'kg|g|grams?|l|litres?|liters?|ml|lbs?|pounds?|oz|ounces?|cups?|tablespoons?|teaspoons?|tbsp|tsp|cm|tins?|cans?|jars?|packs?|bunch(?:es)?|heads?|bulbs?|handfuls?|pinch(?:es)?|strips?|sprigs?|rashers?';
  const AMOUNT = new RegExp('^(\\d+(?:\\.\\d+)?)?\\s*([½¼¾⅓⅔])?(?:\\s*(?:to|-)\\s*(\\d+(?:\\.\\d+)?))?(?:\\s*(' + UNIT + ')(?![\\p{L}]))?\\s*(?:of\\s+)?', 'u');

  function cleanUnit(qty, unit) {
    if (!unit) return { qty, unit: '' };
    if (unit === 'kg') return { qty: qty * 1000, unit: 'g' };
    if (/^grams?$/.test(unit)) return { qty, unit: 'g' };
    if (/^(lbs?|pounds?)$/.test(unit)) return { qty: qty * 454, unit: 'g' };
    if (/^(oz|ounces?)$/.test(unit)) return { qty: qty * 28, unit: 'g' };
    if (/^cups?$/.test(unit)) return { qty, unit: 'cup' };
    if (/^tablespoons?$/.test(unit)) return { qty: qty * 3, unit: 'tsp' };
    if (/^teaspoons?$/.test(unit)) return { qty, unit: 'tsp' };
    if (unit === 'l' || /^lit/.test(unit)) return { qty: qty * 1000, unit: 'ml' };
    if (unit === 'tbsp') return { qty: qty * 3, unit: 'tsp' };
    if (/^(tin|can)s?$/.test(unit)) return { qty, unit: 'tin' };
    if (/^jars?$/.test(unit)) return { qty, unit: 'jar' };
    if (/^packs?$/.test(unit)) return { qty, unit: 'pack' };
    if (/^bunch/.test(unit)) return { qty, unit: 'bunch' };
    if (/^heads?$|^bulbs?$/.test(unit)) return { qty, unit: 'head' };
    if (/^handful/.test(unit)) return { qty, unit: 'handful' };
    if (/^pinch/.test(unit)) return { qty, unit: 'pinch' };
    if (/^strip/.test(unit)) return { qty, unit: 'strip' };
    if (/^sprig/.test(unit)) return { qty, unit: 'sprig' };
    if (/^rasher/.test(unit)) return { qty, unit: 'rasher' };
    return { qty, unit };
  }

  function readAmount(text) {
    const multiple = /^(\d+)\s*x\s*(\d+(?:\.\d+)?)\s*(kg|g|l|ml)\b\s*(.*)$/.exec(text);
    if (multiple) return { ...cleanUnit(Number(multiple[1]) * Number(multiple[2]), multiple[3]), rest: multiple[4] };
    const words = /^(?:small |large )?(handful|pinch)(?:es)? of (.*)$/.exec(text);
    if (words) return { ...cleanUnit(1, words[1]), rest: words[2] };
    const m = AMOUNT.exec(text);
    if (m[1] || m[2]) {
      const low = Number(m[1] || 0) + (m[2] ? FRACTIONS[m[2]] : 0);
      const qty = m[3] ? Number(m[3]) : low;
      return { ...cleanUnit(qty, m[4]), rest: text.slice(m[0].length) };
    }
    const about = /\babout (\d+(?:\.\d+)?)\s*(kg|g|l|ml)\b/.exec(text);
    if (about) return { ...cleanUnit(Number(about[1]), about[2]), rest: text };
    return { qty: null, unit: '', rest: text };
  }

  function identify(text) {
    const [first, other] = text.split(',')[0].split(' or ');
    const head = first.split(/ in | with /)[0].trim();
    // "chicken or vegetable stock" is chicken stock: borrow the last word of the alternative.
    const joined = other ? head + ' ' + other.trim().split(' ').pop() : '';
    const found = (joined && KEYWORDS.find(k => k.pattern.test(joined) && !k.pattern.test(head) && !k.pattern.test(other))) ||
      KEYWORDS.find(k => k.pattern.test(head)) || KEYWORDS.find(k => k.pattern.test(text));
    if (found) return { name: found.name, aisle: found.aisle };
    const name = head.replace(/^(a few|a little|some) (sprigs of )?/, '') || text;
    return { name: name.charAt(0).toUpperCase() + name.slice(1), aisle: 'other' };
  }

  // One line can name more than one thing, such as "Handful of basil and coriander".
  function parseLine(raw) {
    const optional = /\boptional\b/i.test(raw);
    const text = raw.toLowerCase().replace(/[–—]/g, '-')
      .replace(/(^|[^\/\d.])(\d+)(?:\s+|-)(\d)\/(\d)/g, (_, before, whole, top, bottom) => before + String(Number(whole) + top / bottom))
      .replace(/(\d)\/(\d)/g, (_, top, bottom) => String(top / bottom))
      .replace(/(\d+)?\s*([½¼¾⅓⅔])/g, (_, whole, part) => (whole === undefined ? ' ' : '') + String(Number(whole || 0) + FRACTIONS[part]))
      .replace(/\([^)]*\)/g, ' ').replace(/,?\s*to serve\s*$/, '').replace(/\s+/g, ' ').trim().replace(/^about /, '')
      .replace(/^([\d.½¼¾⅓⅔]+(?: ?(?:to|-) ?[\d.]+)? )(?:small|large|big|heaped|heaping|level|scant|generous|whole|mixed) (?=(?:tbsp|tsp|tablespoons?|teaspoons?|cups?|bunch(?:es)?|handfuls?|pinch(?:es)?|heads?|bulbs?)(?![\p{L}]))/u, '$1')
      .replace(/^(?:zest|juice)(?: and (?:zest|juice))?(?: of)? (?=[\d½¼¾⅓⅔])/, '');
    if (/^(?:[a-z]+ )*salt (?:and|&) (?:[a-z]+ )*pepper(?:,? to taste)?$/.test(text)) {
      return [{ ...identify('salt'), qty: null, unit: '', optional, raw }, { ...identify('black pepper'), qty: null, unit: '', optional, raw }];
    }
    const amount = readAmount(text);
    const canSplit = amount.qty === null || amount.unit === 'handful';
    const parts = canSplit ? amount.rest.split(',').filter((piece, n) => n === 0 || KEYWORDS.some(k => k.pattern.test(piece))).flatMap(piece => piece.replace(/^ ?and /, '').split(' and ')) : [amount.rest];
    return parts.map(part => {
      let item = identify(part.trim());
      let { qty, unit } = amount;
      if (item.name === 'Peppers' && (unit === 'tsp' || unit === 'pinch' || /\b(?:salt|ground|cracked)\b/.test(text))) item = identify('black pepper');
      if (item.name === 'Garlic') {
        if (unit === 'head' || (unit === '' && qty !== null && /\b(?:bulb|head)s?\b/.test(part))) { qty *= 10; unit = 'clove'; } else if (unit === '' && qty !== null) unit = 'clove';
      }
      if (item.name === 'Coconut milk' && unit === 'tin') { qty *= 400; unit = 'ml'; }
      if (item.name === 'Celery' && unit === '') unit = 'stick';
      if (item.name === 'Eggs' && unit === 'tsp') { qty = 1; unit = ''; }
      if (item.name === 'Oranges' && unit === 'strip') { qty = 1; unit = ''; }
      // One lemon gives about 3 tbsp of juice and one lime about 2 tbsp.
      const spoons = qty === null ? null : unit === 'ml' ? qty / 5 : unit === 'cup' ? qty * 48 : qty;
      if (item.name === 'Lemon juice') return { ...item, name: 'Lemons', qty: spoons === null ? null : spoons / 9, unit: '', optional, raw };
      if (item.name === 'Lime juice') return { ...item, name: 'Limes', qty: spoons === null ? null : spoons / 6, unit: '', optional, raw };
      return { ...item, qty, unit, optional, raw };
    });
  }

  function roundFor(unit, qty) {
    if (unit === 'g' || unit === 'ml') {
      const step = qty < 100 ? 5 : 10;
      return Math.max(step, Math.round(qty / step) * step);
    }
    if (unit === 'tsp' || unit === 'cm') return Math.max(0.5, Math.round(qty * 2) / 2);
    if (unit === 'cup') return Math.max(0.25, Math.ceil(qty * 4 - 1e-9) / 4);
    return Math.ceil(qty - 1e-9);
  }

  function formatAmount(unit, qty) {
    if (qty === null) return '';
    const n = roundFor(unit, qty);
    const plural = (word, count) => count + ' ' + word + (count === 1 ? '' : 's');
    if (unit === 'g') return n >= 1000 ? (n / 1000) + ' kg' : n + ' g';
    if (unit === 'ml') return n >= 1000 ? (n / 1000) + ' l' : n + ' ml';
    if (unit === 'tsp') return n >= 3 ? Math.round((n / 3) * 2) / 2 + ' tbsp' : n + ' tsp';
    if (unit === 'cm') return n + ' cm';
    if (unit === 'bunch') return n + (n === 1 ? ' bunch' : ' bunches');
    if (unit === 'pinch') return n + (n === 1 ? ' pinch' : ' pinches');
    if (unit) return plural(unit, n);
    return String(n);
  }

  // Recipes give a number or wording such as "about 8" or "4 as a side, 2 as a main".
  const servesOf = dish => {
    const m = /\d+/.exec(String(dish.serves == null ? '' : dish.serves));
    return m ? Number(m[0]) : 4;
  };

  // dishes: [{ title, shopping: [lines], factor }], where factor scales the recipe's amounts.
  function build(dishes) {
    const items = new Map();
    for (const dish of dishes) {
      for (const line of dish.shopping || []) {
        for (const part of parseLine(line)) {
          const qty = part.qty === null ? null : part.qty * (dish.factor || 1);
          if (!items.has(part.name)) items.set(part.name, { name: part.name, aisle: part.aisle, totals: new Map(), uses: [], someUnmeasured: false, allOptional: true });
          const item = items.get(part.name);
          if (qty === null) item.someUnmeasured = true;
          else item.totals.set(part.unit, (item.totals.get(part.unit) || 0) + qty);
          if (!part.optional) item.allOptional = false;
          item.uses.push({ dish: dish.title, amount: formatAmount(part.unit, qty) || 'some', optional: part.optional });
        }
      }
    }
    return AISLES.map(([key, label]) => ({
      key,
      label,
      items: [...items.values()].filter(i => i.aisle === key).sort((a, b) => a.name.localeCompare(b.name)).map(i => ({
        name: i.name,
        amount: [...i.totals].map(([unit, qty]) => formatAmount(unit, qty)).concat(i.someUnmeasured && i.totals.size ? 'some' : []).join(' + ') || 'some',
        optional: i.allOptional,
        uses: i.uses
      }))
    })).filter(a => a.items.length);
  }

  // A small A4 PDF in two columns. Built by hand so the site needs no library. The PDF standard fonts cover Western European text.
  const pdfSafe = s => String(s).replace(/[–—]/g, '-').replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[^\x20-\x7e\xa0-\xff]/g, '?').replace(/[\\()]/g, '\\$&');
  function wrapWords(text, width) {
    const out = [];
    let line = '';
    for (const word of text.split(' ')) {
      if (line && (line + ' ' + word).length > width) { out.push(line); line = word; } else line = line ? line + ' ' + word : word;
    }
    return out.concat(line);
  }
  function toPdf(aisles, title, subtitle) {
    const W = 595, H = 842, M = 40, GAP = 24, COL = (W - 2 * M - GAP) / 2, SIZE = 10.5, LINE = 14;
    const pages = [[]];
    const put = (x, y, size, font, s) => pages[pages.length - 1].push('BT /F' + font + ' ' + size + ' Tf ' + x + ' ' + y + ' Td (' + pdfSafe(s) + ') Tj ET');
    let y = H - M - 18, col = 0;
    put(M, y, 20, 2, title);
    y -= 8;
    for (const line of wrapWords(subtitle, 105)) { y -= 13; put(M, y, 9.5, 1, line); }
    y -= 12;
    let top = y;
    const fit = needed => {
      if (y - needed >= M) return;
      if (col === 0) col = 1;
      else { pages.push([]); col = 0; top = H - M; }
      y = top;
    };
    for (const aisle of aisles) {
      const rows = aisle.items.map(i => wrapWords(i.name + (i.amount === 'some' ? '' : ': ' + i.amount) + (i.optional ? ' (optional)' : ''), 44));
      fit(LINE * (1.5 + rows[0].length) + 6);
      y -= LINE + 6;
      put(M + col * (COL + GAP), y, 12, 2, aisle.label);
      y -= 4;
      for (const row of rows) {
        fit(LINE * row.length);
        const x = M + col * (COL + GAP);
        y -= LINE;
        pages[pages.length - 1].push(x + ' ' + (y - 1) + ' 9 9 re S');
        row.forEach((line, n) => {
          if (n) y -= LINE;
          put(x + 15, y, SIZE, 1, line);
        });
      }
    }
    const objects = ['<< /Type /Catalog /Pages 2 0 R >>', '', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>'];
    const kids = [];
    for (const page of pages) {
      const content = '0.6 w\n' + page.join('\n');
      objects.push('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + W + ' ' + H + '] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ' + (objects.length + 2) + ' 0 R >>');
      kids.push(objects.length + ' 0 R');
      objects.push('<< /Length ' + content.length + ' >>\nstream\n' + content + '\nendstream');
    }
    objects[1] = '<< /Type /Pages /Kids [' + kids.join(' ') + '] /Count ' + kids.length + ' >>';
    let file = '%PDF-1.4\n';
    const offsets = objects.map((body, n) => {
      const at = file.length;
      file += (n + 1) + ' 0 obj\n' + body + '\nendobj\n';
      return at;
    });
    const xref = file.length;
    file += 'xref\n0 ' + (objects.length + 1) + '\n0000000000 65535 f \n' + offsets.map(o => String(o).padStart(10, '0') + ' 00000 n \n').join('');
    file += 'trailer\n<< /Size ' + (objects.length + 1) + ' /Root 1 0 R >>\nstartxref\n' + xref + '\n%%EOF\n';
    return Uint8Array.from(file, c => c.charCodeAt(0));
  }

  // headingMark wraps each aisle name, such as * for bold in WhatsApp.
  function toText(aisles, headingMark = '') {
    return aisles.map(a => headingMark + a.label + headingMark + '\n' + a.items.map(i => '- ' + i.name + (i.amount === 'some' ? '' : ': ' + i.amount) + (i.optional ? ' (optional)' : '')).join('\n')).join('\n\n');
  }

  // The ingredients a dish is really about, for the "What we have" filter and its card colour.
  const MAIN_AISLES = ['meat', 'fish', 'veg', 'dry', 'dairy', 'tins', 'frozen'];
  const NOT_MAINS = new Set(['Garlic', 'Ginger', 'Onions', 'Red onions', 'Shallots', 'Spring onions', 'Lemons', 'Limes', 'Oranges', 'Red chillies', 'Celery', 'Butter', 'Milk', 'Cream',
    'Crème fraîche', 'Chicken stock', 'Beef stock', 'Vegetable stock', 'Tomato paste', 'Capers', 'Coffee', 'Salad']);
  const SAME_MAIN = {
    'Chicken breasts': 'chicken', 'Chicken thighs': 'chicken', 'Chicken thigh mince': 'chicken', 'Whole chicken': 'chicken', 'Beef mince': 'beef', 'Pork mince': 'pork', 'Smoked haddock': 'haddock',
    'Brown rice': 'rice', 'Rice noodles': 'noodles', 'Vermicelli rice noodles': 'noodles', 'Egg noodles': 'noodles', 'Puy lentils': 'lentils', 'Cheese tortellini': 'tortellini',
    'Lasagne sheets': 'lasagne', 'Cherry tomatoes': 'tomatoes', 'Tinned chopped tomatoes': 'tomatoes', 'Tinned plum tomatoes': 'tomatoes', 'Jarred roasted red peppers': 'peppers',
    'Edamame beans': 'edamame', 'Tinned pineapple rings': 'pineapple'
  };
  function mainsOf(lines) {
    const spoonOfEgg = p => p.name === 'Eggs' && /\b(?:tsp|tbsp|teaspoons?|tablespoons?)\b/i.test(p.raw);
    const parts = (lines || []).flatMap(parseLine).filter(p => !p.optional && MAIN_AISLES.includes(p.aisle) && !NOT_MAINS.has(p.name) && !spoonOfEgg(p));
    parts.sort((a, b) => MAIN_AISLES.indexOf(a.aisle) - MAIN_AISLES.indexOf(b.aisle));
    return [...new Set(parts.map(p => SAME_MAIN[p.name] || p.name.toLowerCase()))];
  }

  // What to search for at Albert Heijn, whose shelves are in Dutch. A name not listed here is searched for as it is.
  const DUTCH = {
    'Aubergines': 'aubergine', 'Cauliflower': 'bloemkool', 'Carrots': 'wortels', 'Celery': 'bleekselderij', 'Leeks': 'prei',
    'Onions': 'uien', 'Red onions': 'rode ui', 'Spring onions': 'lente-ui', 'Shallots': 'sjalotten', 'Garlic': 'knoflook',
    'Ginger': 'gember', 'Spinach': 'spinazie', 'Broccoli': 'broccoli', 'Pak choi': 'paksoi', 'Bean sprouts': 'taugé',
    'Mangoes': 'mango', 'Peaches': 'perziken', 'Lemons': 'citroenen', 'Lemon juice': 'citroensap', 'Limes': 'limoenen',
    'Lime juice': 'limoensap', 'Oranges': 'sinaasappels', 'Potatoes': 'aardappelen', 'Peppers': 'paprika',
    'Red chillies': 'rode peper', 'Cherry tomatoes': 'cherrytomaten', 'Tomatoes': 'tomaten', 'Stir-fry vegetables': 'roerbakgroente',
    'Salad': 'sla', 'Mushrooms': 'champignons', 'Courgettes': 'courgette', 'Cucumber': 'komkommer', 'Avocados': 'avocado',
    'Radishes': 'radijs', 'Corn': 'mais', 'Apples': 'appels', 'Sweet potatoes': 'zoete aardappel', 'Green beans': 'sperziebonen',
    'Sugar snap peas': 'sugarsnaps', 'Basil': 'basilicum', 'Thai basil': 'thaise basilicum', 'Coriander': 'koriander',
    'Parsley': 'peterselie', 'Mint': 'munt', 'Sage': 'salie', 'Rosemary': 'rozemarijn', 'Thyme': 'tijm', 'Oregano': 'oregano',
    'Mixed herbs': 'verse kruiden', 'Chives': 'bieslook', 'Lime leaves': 'djeroek poeroet', 'Chicken': 'kip',
    'Whole chicken': 'hele kip', 'Chicken breasts': 'kipfilet', 'Chicken thighs': 'kippendijen', 'Chicken thigh mince': 'kipgehakt',
    'Bacon': 'spekjes', 'Parma ham': 'parmaham', 'Ham': 'ham', 'Beef': 'rundvlees', 'Mince': 'gehakt', 'Beef mince': 'rundergehakt',
    'Pork': 'varkensvlees', 'Pork mince': 'varkensgehakt', 'Lamb': 'lamsvlees', 'Sausages': 'worstjes', 'Chorizo': 'chorizo',
    'Turkey': 'kalkoen', 'Steak': 'biefstuk', 'Salmon': 'zalm', 'Hake': 'heek', 'Haddock': 'schelvis',
    'Smoked haddock': 'gerookte schelvis', 'Prawns': 'garnalen', 'Scallops': 'coquilles', 'Cod': 'kabeljauw', 'Tuna': 'tonijn',
    'Butter': 'roomboter', 'Crème fraîche': 'crème fraîche', 'Cream': 'slagroom', 'Mascarpone': 'mascarpone', 'Milk': 'melk',
    'Eggs': 'eieren', 'Feta': 'feta', 'Halloumi': 'halloumi', 'Parmesan': 'parmezaan', 'Cheddar': 'cheddar', 'Gruyère': 'gruyère',
    'Burrata': 'burrata', 'Greek yogurt': 'griekse yoghurt', 'Cheese': 'geraspte kaas', 'Tortillas': 'tortilla wraps',
    'Bread': 'brood', 'Ciabatta': 'ciabatta', 'Breadcrumbs': 'paneermeel', 'Ladyfingers': 'lange vingers',
    'Garlic bread': 'knoflookbrood', 'Rice': 'rijst', 'Brown rice': 'zilvervliesrijst', 'Noodles': 'noedels',
    'Rice noodles': 'rijstnoedels', 'Vermicelli rice noodles': 'rijstvermicelli', 'Egg noodles': 'eiernoedels',
    'Couscous': 'couscous', 'Orzo': 'orzo', 'Lasagne sheets': 'lasagnebladen', 'Cheese tortellini': 'tortellini kaas',
    'Pasta': 'pasta', 'Spaghetti': 'spaghetti', 'Tinned chopped tomatoes': 'tomatenblokjes',
    'Tinned plum tomatoes': 'gepelde tomaten', 'Jarred roasted red peppers': 'geroosterde paprika',
    'Sun-dried tomatoes': 'zongedroogde tomaten', 'Tomato paste': 'tomatenpuree', 'Coconut milk': 'kokosmelk',
    'Tinned pineapple rings': 'ananas schijven', 'Olives': 'olijven', 'Capers': 'kappertjes', 'Chicken stock': 'kippenbouillon',
    'Beef stock': 'runderbouillon', 'Vegetable stock': 'groentebouillon', 'Cashews': 'cashewnoten', 'Almonds': 'amandelen',
    'Peanut butter': 'pindakaas', 'Crispy onions': 'gebakken uitjes', 'Prunes': 'gedroogde pruimen', 'Peanuts': "pinda's",
    'Coffee': 'koffie', 'Lentils': 'linzen', 'Puy lentils': 'puy linzen', 'Chickpeas': 'kikkererwten', 'Beans': 'bonen',
    'Candied jalapeños': 'jalapeños', 'Butter beans': 'boterbonen', 'Edamame beans': 'edamame', 'Cooking oil': 'zonnebloemolie',
    'Olive oil': 'olijfolie', 'Sesame oil': 'sesamolie', 'Soy sauce': 'sojasaus', 'Tamari': 'tamari', 'Fish sauce': 'vissaus',
    'Oyster sauce': 'oestersaus', 'Teriyaki sauce': 'teriyakisaus', 'Sambal oelek': 'sambal oelek', 'Curry paste': 'currypasta',
    'Thai curry paste': 'thaise currypasta', 'Tamarind paste': 'tamarinde', 'Balsamic vinegar': 'balsamicoazijn',
    'Red wine vinegar': 'rode wijnazijn', 'White vinegar': 'witte azijn', 'Hot sauce': 'hete saus', 'Mango chutney': 'mango chutney',
    'Honey': 'honing', 'Mustard': 'mosterd', 'Wholegrain mustard': 'grove mosterd', 'Rice vinegar': 'rijstazijn',
    'White wine vinegar': 'witte wijnazijn', 'Cider vinegar': 'appelazijn', 'Sherry vinegar': 'sherryazijn',
    'Chilli oil': 'chili olie', 'Tomato ketchup': 'tomatenketchup', 'Chilli sauce': 'chilisaus', 'Salt': 'zout',
    'Black pepper': 'zwarte peper', 'Chilli flakes': 'chilivlokken', 'Smoked paprika': 'gerookt paprikapoeder',
    'Ground cumin': 'komijnpoeder', 'Cumin seeds': 'komijnzaad', 'Turmeric': 'kurkuma', 'Coriander seeds': 'korianderzaad',
    'Ground coriander': 'korianderpoeder', 'Carom seeds': 'ajowan', 'Curry powder': 'kerriepoeder',
    'Kashmiri chilli powder': 'chilipoeder', 'Garlic granules': 'knoflookpoeder', 'Fennel seeds': 'venkelzaad',
    'Dried oregano': 'gedroogde oregano', 'Bay leaves': 'laurierblad', 'Dried chillies': 'gedroogde chilipeper', 'Sugar': 'suiker',
    'Brown sugar': 'bruine suiker', 'Cornflour': 'maizena', 'Plain flour': 'bloem', 'Cardamom pods': 'kardemom',
    "Piment d'espelette": "piment d'espelette", 'Paprika': 'paprikapoeder', 'Cayenne pepper': 'cayennepeper',
    'Italian seasoning': 'italiaanse kruiden', 'Ground cinnamon': 'kaneel', 'Sesame seeds': 'sesamzaad',
    'Cocoa powder': 'cacaopoeder', 'Dark chocolate': 'pure chocolade', 'Garlic powder': 'knoflookpoeder',
    'Onion powder': 'uienpoeder', 'Chilli powder': 'chilipoeder', 'Ground ginger': 'gemberpoeder', 'White wine': 'witte wijn',
    'Red wine': 'rode wijn', 'Rice wine': 'rijstwijn', 'Dry sherry': 'droge sherry', 'Champagne': 'champagne', 'Vodka': 'wodka',
    'Rum': 'rum'
  };
  const ahSearch = name => 'https://www.ah.nl/zoeken?query=' + encodeURIComponent(Object.hasOwn(DUTCH, name) ? DUTCH[name] : name);

  globalThis.Shopping = { parseLine, build, toText, toPdf, servesOf, mainsOf, ahSearch };
})();
