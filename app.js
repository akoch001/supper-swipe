(function () {
  const GROUPS = {
    chicken: 'chicken', turkey: 'chicken',
    beef: 'meat', steak: 'meat', mince: 'meat', lamb: 'meat',
    pork: 'pork', bacon: 'pork', sausages: 'pork', chorizo: 'pork', ham: 'pork', 'parma ham': 'pork',
    salmon: 'fish', cod: 'fish', tuna: 'fish', prawns: 'fish', hake: 'fish', haddock: 'fish', scallops: 'fish'
  };
  // [field, full name, short name for the card]
  const SCORES = [['ease', 'Ease', 'Ease'], ['speed', 'Speed', 'Speed'], ['love', 'How much we like it', 'We like it']];
  const WHATSAPP_LINK_LIMIT = 6000;

  // The plate on each dish: emoji for the foods its name mentions, then for its main ingredients.
  const NAME_EMOJI = [
    ['chicken|turkey', '🍗'], ['prawn|shrimp', '🦐'], ['salmon|hake|haddock|cod\\b|tuna|fish', '🐟'], ['scallop|mussel|oyster', '🦪'],
    ['beef|steak|ragout|ragu|mince', '🥩'], ['bacon|ham\\b|pancetta', '🥓'], ['lamb|pork', '🍖'], ['sausage|chorizo', '🌭'],
    ['aubergine|eggplant', '🍆'], ['carrot', '🥕'], ['cauliflower|broccoli', '🥦'], ['pepper', '🫑'], ['tomato', '🍅'], ['potato', '🥔'],
    ['mango', '🥭'], ['coconut', '🥥'], ['lemon|lime', '🍋'], ['peanut|satay|cashew|almond', '🥜'], ['noodle|pad thai|ramen', '🍜'],
    ['rice|kedgeree|risotto|couscous', '🍚'], ['orzo|pasta|lasagne|spaghetti', '🍝'], ['tortellini|dumpling|gyoza', '🥟'],
    ['halloumi|feta|cheese|parmesan', '🧀'], ['eggs?\\b', '🥚'], ['lentil|bean|chickpea', '🫘'], ['yogurt', '🥛'], ['salad', '🥗'],
    ['tiramis|cake', '🍰'], ['champagne', '🥂'], ['honey', '🍯'], ['rosemary|sage\\b|herb|basil', '🌿'], ['ginger|garlic', '🧄'],
    ['mushroom', '🍄'], ['leek|spinach', '🥬'], ['taco|fajita|tortilla|wrap', '🌮'], ['burger', '🍔'], ['pizza', '🍕'], ['pie\\b', '🥧'],
    ['shawarma|kebab|souvlaki', '🥙'], ['curry|masala', '🍛'], ['soup|stew', '🍲']
  ].map(([words, emoji]) => [new RegExp('(?:^|[^a-z])(?:' + words + ')'), emoji]);
  const FOOD_EMOJI = {
    chicken: '🍗', turkey: '🍗', beef: '🥩', mince: '🥩', steak: '🥩', lamb: '🍖', pork: '🍖', 'pork mince': '🍖', bacon: '🥓', 'parma ham': '🥓', ham: '🥓',
    sausages: '🌭', chorizo: '🌭', salmon: '🐟', hake: '🐟', haddock: '🐟', cod: '🐟', tuna: '🐟', prawns: '🦐', scallops: '🦪',
    aubergines: '🍆', cauliflower: '🥦', broccoli: '🥦', carrots: '🥕', leeks: '🥬', spinach: '🥬', 'pak choi': '🥬', 'bean sprouts': '🌱', mangoes: '🥭',
    peaches: '🍑', potatoes: '🥔', peppers: '🫑', tomatoes: '🍅', 'stir-fry vegetables': '🥦', mushrooms: '🍄', courgettes: '🥒', cucumber: '🥒',
    avocados: '🥑', corn: '🌽', apples: '🍎', pineapple: '🍍', salad: '🥗', eggs: '🥚', feta: '🧀', halloumi: '🧀', parmesan: '🧀', cheddar: '🧀',
    'gruyère': '🧀', burrata: '🧀', cheese: '🧀', mascarpone: '🧀', 'greek yogurt': '🥛', rice: '🍚', noodles: '🍜', couscous: '🍚', orzo: '🍝',
    lasagne: '🍝', tortellini: '🥟', pasta: '🍝', spaghetti: '🍝', 'sun-dried tomatoes': '🍅', 'coconut milk': '🥥', olives: '🫒', cashews: '🥜',
    almonds: '🥜', 'peanut butter': '🥜', peanuts: '🥜', 'crispy onions': '🧅', prunes: '🍇', lentils: '🫘', chickpeas: '🫘', beans: '🫘',
    edamame: '🫘', 'candied jalapeños': '🌶️', lemons: '🍋', limes: '🍋', oranges: '🍊', garlic: '🧄', onions: '🧅', 'red onions': '🧅',
    shallots: '🧅', 'spring onions': '🧅', 'red chillies': '🌶️', butter: '🧈', bread: '🥖', ciabatta: '🥖', tortillas: '🌮', ladyfingers: '🍪',
    honey: '🍯', 'white wine': '🥂', 'red wine': '🍷', champagne: '🥂', 'dry sherry': '🍷', coffee: '☕', 'dark chocolate': '🍫', 'cocoa powder': '🍫',
    basil: '🌿', coriander: '🌿', parsley: '🌿', mint: '🌿', sage: '🌿', rosemary: '🌿', thyme: '🌿', 'mixed herbs': '🌿', 'thai basil': '🌿', chives: '🌿'
  };
  const LEADS = ['🍗', '🦐', '🐟', '🦪', '🥩', '🥓', '🍖', '🌭'];
  const AISLE_EMOJI = { veg: '🥦', herbs: '🌿', meat: '🍗', fish: '🐟', dairy: '🧀', bakery: '🥖', dry: '🍝', tins: '🥫', frozen: '🧊', sauces: '🫒', spices: '🧂', drinks: '🍷', other: '🛒' };

  const $ = id => document.getElementById(id);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canAnimate = !reduced && typeof Element.prototype.animate === 'function';

  const recipes = new Map();
  let saving = 0, lastLoaded = '';
  // Which group this phone is in. The link says (/?g=ludo-eva) and the phone remembers it, for when it opens
  // without one. Phones from before groups were all Adam's or Laura's. The cookie carries it to the server.
  const GROUP_KEY = 'supper-swipe-group', FIRST_GROUP = 'adam-laura', GROUP_NAME = /^[a-z-]{1,40}$/;
  const remembered = key => { try { return JSON.parse(localStorage.getItem(key)); } catch (e) { return null; } };
  const linked = new URLSearchParams(location.search).get('g');
  let group = [linked, remembered(GROUP_KEY)].find(g => GROUP_NAME.test(g || '')) ||
    (['adam', 'laura'].includes(remembered('supper-swipe-who')) ? FIRST_GROUP : null);
  const joinGroup = g => {
    try { localStorage.setItem(GROUP_KEY, JSON.stringify(g)); } catch (e) { /* the link still works each time it is opened */ }
    document.cookie = 'supper-group=' + g + '; path=/; max-age=31536000; samesite=lax';
  };
  if (group) joinGroup(group);
  // Each group keeps its own lists on the phone, so opening another group's link doesn't mix them. Adam and Laura's keep their old names.
  const keyed = (key, g = group) => (g === FIRST_GROUP ? key : key + '@' + g);
  const SHORTLIST_KEY = keyed('supper-swipe-shortlist');
  let shortlist = [];
  try { shortlist = JSON.parse(localStorage.getItem(SHORTLIST_KEY)) || []; } catch (e) { shortlist = []; }
  const saveShortlist = () => {
    try { localStorage.setItem(SHORTLIST_KEY, JSON.stringify(shortlist)); } catch (e) { /* the list still works until the page closes */ }
  };
  const SERVINGS_KEY = keyed('supper-swipe-servings'), TICKS_KEY = keyed('supper-swipe-to-buy');
  const readStored = (key, fallback) => {
    try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch (e) { return fallback; }
  };
  const store = (key, value) => {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* kept until the page closes */ }
  };
  const servings = readStored(SERVINGS_KEY, {});
  // The shopping list is made from the shortlist or from the matches. Each keeps its own ticks and basket marks.
  let shopFrom = 'mine';
  const ticksKey = () => (shopFrom === 'matches' ? TICKS_KEY + '-matches' : TICKS_KEY);
  let ticks = readStored(TICKS_KEY, { list: '', names: [] });
  const SHOP_KEY = 'supper-swipe-shop';
  let shop = readStored(SHOP_KEY, 'ah');
  let queue = [], passed = [];
  let mode = 'all', easyOnly = false, lexiOnly = false, allShow = 'all';
  const have = new Set();
  let openId = null, editId = null, tab = 'swipe', shopOpen = false, loaded = false, failed = '', dragging = false;
  // Who this phone belongs to, and what each person in the group has swiped right on. A dish any two like is a match.
  // The group's people come from the server with the dishes.
  const WHO_KEY = keyed('supper-swipe-who'), SEEN_KEY = keyed('supper-swipe-seen-matches');
  let PEOPLE = {};
  // AI reads this month, as the server counts them: { limit: 5, used: { adam: 2, laura: 0 } }.
  let reads = null;
  const stored = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch (e) { return fallback; } };
  let who = stored(WHO_KEY, null), seenMatches = stored(SEEN_KEY, []), likes = {}, likeSaves = 0, shortView = 'mine', ahConnected = false;
  let badgeCount = shortlist.length, flying = false, closing = false, dragY = 0, sending = false, writes = 0, formRun = 0;
  const pending = new Map();

  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const list = v => Array.isArray(v) ? v : [];
  const ic = name => '<svg class="ic" aria-hidden="true"><use href="#i-' + name + '"/></svg>';
  const mainCache = new WeakMap();
  const mains = r => {
    const lines = list(r.shopping);
    if (!mainCache.has(lines)) mainCache.set(lines, Shopping.mainsOf(lines));
    return mainCache.get(lines);
  };
  const terms = r => mains(r).concat(list(r.tags));
  const groupOf = r => {
    for (const c of mains(r)) if (GROUPS[c]) return GROUPS[c];
    return list(r.tags).includes('dessert') ? 'other' : 'veg';
  };
  const colourOf = r => (r.tried ? groupOf(r) : 'to-try');
  // The three ingredients a card names, leading with the ones the dish is called after.
  const headline = r => {
    const title = String(r.title || '').toLowerCase(), named = m => title.includes(m.replace(/(es|s)$/, ''));
    return mains(r).slice().sort((a, b) => named(b) - named(a)).slice(0, 3);
  };
  // A dish saved from a site that would not share its recipe: a link and nothing else.
  const needsRecipe = r => !list(r.shopping).length && !list(r.steps).length && /^https?:\/\//.test(r.sourceUrl || '');
  // A few of the emoji are recent. A phone that can't draw one gets its stand-in, or goes without.
  const NEWER = { '🫑': '🌶️', '🫒': '', '🫘': '🥜' };
  const drawn = new Map();
  function canDraw(emoji) {
    if (!drawn.has(emoji)) {
      let colour = true;
      try {
        const ctx = Object.assign(document.createElement('canvas'), { width: 24, height: 24 }).getContext('2d', { willReadFrequently: true });
        ctx.font = '18px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
        ctx.textBaseline = 'top';
        ctx.fillText(emoji, 2, 2);
        const px = ctx.getImageData(0, 0, 24, 24).data;
        colour = false;
        for (let i = 0; i < px.length && !colour; i += 4) colour = px[i + 3] > 40 && (Math.abs(px[i] - px[i + 1]) > 24 || Math.abs(px[i + 1] - px[i + 2]) > 24);
      } catch (e) { /* no canvas: assume it can */ }
      drawn.set(emoji, colour);
    }
    return drawn.get(emoji);
  }
  const usable = emoji => (emoji in NEWER && !canDraw(emoji) ? NEWER[emoji] : emoji);
  const plateCache = new WeakMap();
  // Up to three emoji for a dish, biggest first.
  function plate(r) {
    const lines = list(r.shopping), dessert = list(r.tags).includes('dessert');
    const title = String(r.title || '').toLowerCase(), key = title + (dessert ? '|d' : '');
    let byTitle = plateCache.get(lines);
    if (!byTitle) plateCache.set(lines, byTitle = new Map());
    if (!byTitle.has(key)) {
      const named = NAME_EMOJI.map(([words, emoji]) => [title.search(words), emoji]).filter(x => x[0] >= 0).sort((a, b) => a[0] - b[0]).map(x => x[1]);
      const fromMains = mains(r).map(m => FOOD_EMOJI[m]);
      const fromRest = lines.flatMap(Shopping.parseLine).map(p => FOOD_EMOJI[p.name.toLowerCase()]);
      const found = [...new Set(named.concat(dessert ? fromRest.concat(fromMains) : fromMains.concat(fromRest)).filter(Boolean).map(usable).filter(Boolean))].slice(0, 3);
      const lead = found.findIndex(e => LEADS.includes(e));
      if (lead > 0) found.unshift(found.splice(lead, 1)[0]);
      byTitle.set(key, found.length ? found : ['🍽️']);
    }
    return byTitle.get(key);
  }
  const art = r => r.photo ? '<div class="art photo" aria-hidden="true"><img src="' + esc(r.photo) + '" alt=""></div>' : '<div class="art" aria-hidden="true"><div class="plate"></div>' + plate(r).map((e, i) => '<span class="sticker s' + (i + 1) + '">' + e + '</span>').join('') + '</div>';
  const variant = id => 'v' + ([...String(id)].reduce((n, c) => n + c.charCodeAt(0), 0) % 3);
  const matches = r => {
    if (easyOnly && !((r.ease || 0) >= 3)) return false;
    if (lexiOnly && !r.lexi) return false;
    if (list(r.tags).includes('dessert') && !(mode === 'have' && have.has('dessert'))) return false;
    return mode === 'all' || !have.size || [...have].some(t => terms(r).includes(t));
  };
  const shuffle = a => {
    const out = a.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  };
  const today = () => {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  };
  const lastHad = r => {
    if (!r.lastHad) return 'Not cooked yet';
    const days = Math.round((new Date(today() + 'T00:00') - new Date(r.lastHad + 'T00:00')) / 864e5);
    if (days <= 0) return 'Had today';
    if (days === 1) return 'Had yesterday';
    return 'Last had ' + days + ' days ago';
  };
  const dots = (n, name) => '<span class="dots" role="img" aria-label="' + name + ': ' + (n || 0) + ' out of 5">' + [1, 2, 3, 4, 5].map(i => '<i class="' + (i <= n ? 'on' : '') + '"></i>').join('') + '</span>';

  // For screen readers only: things that are already plain to see.
  const say = msg => { $('live').textContent = msg; };
  function toast(msg) {
    const t = $('toast');
    t.textContent = msg;
    t.classList.remove('on');
    void t.offsetWidth;
    t.classList.add('on');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => t.classList.remove('on'), 2600);
  }
  const buzz = ms => {
    try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) { /* no haptics on this phone */ }
  };

  // Every third card is something new to try, for as long as there are any left.
  function deal(ids) {
    const fresh = shuffle(ids.filter(id => !recipes.get(id).tried));
    const known = shuffle(ids.filter(id => recipes.get(id).tried));
    const out = [];
    while (fresh.length || known.length) {
      const wantFresh = (out.length + 1) % 3 === 0;
      out.push((wantFresh && fresh.length) || !known.length ? fresh.shift() : known.shift());
    }
    return out;
  }
  function rebuildDeck() {
    queue = deal([...recipes.keys()].filter(id => matches(recipes.get(id)) && !shortlist.includes(id)));
    passed = [];
  }
  function syncDeck() {
    shortlist = shortlist.filter(id => recipes.has(id));
    queue = queue.filter(id => recipes.has(id) && matches(recipes.get(id)) && !shortlist.includes(id));
    passed = passed.filter(id => recipes.has(id) && matches(recipes.get(id)));
    for (const id of recipes.keys()) {
      if (matches(recipes.get(id)) && !queue.includes(id) && !passed.includes(id) && !shortlist.includes(id)) queue.push(id);
    }
  }

  function cardHTML(id) {
    const r = recipes.get(id), title = String(r.title || '');
    const size = title.length > 50 ? ' class="xlong"' : title.length > 34 ? ' class="long"' : '';
    const badges = (r.tried ? '' : '<span class="badge new">' + ic('sparkle') + 'Try something new</span>') + (r.lexi ? '<span class="badge">Kid friendly</span>' : '');
    const kicker = headline(r).join(' · ');
    return '<article class="card ' + colourOf(r) + ' ' + variant(id) + '" data-id="' + esc(id) + '">' + art(r) +
      '<span class="stamp yes" aria-hidden="true">Shortlist</span><span class="stamp no" aria-hidden="true">Not tonight</span>' +
      '<div class="card-top">' + badges + '</div>' +
      '<div class="card-body">' +
      (kicker ? '<p class="kicker">' + esc(kicker) + '</p>' : '') +
      '<h2' + size + '>' + esc(title) + '</h2>' +
      (r.blurb ? '<p class="blurb">' + esc(r.blurb) + '</p>' : '') +
      '<div class="meta">' + (r.minutes ? '<span>' + ic('clock') + esc(r.minutes) + ' min</span>' : '') + (r.handsOn ? '<span>' + esc(r.handsOn) + ' hands-on</span>' : '') + '<span>' + esc(needsRecipe(r) ? 'Recipe on the original site' : lastHad(r)) + '</span></div>' +
      '<div class="scores">' + SCORES.map(s => '<div class="score"><b>' + s[2] + '</b>' + dots(r[s[0]] || 0, s[1]) + '</div>').join('') + '</div>' +
      '</div></article>';
  }
  const emptyHTML = (emoji, title, text, buttons, spin) => '<div class="empty"><div class="empty-art' + (spin ? ' spin' : '') + '" aria-hidden="true"><span>' + emoji + '</span></div><h2>' + title + '</h2><p>' + text + '</p>' + (buttons || '') + '</div>';

  function renderStack() {
    if (dragging) return;
    const stack = $('stack');
    let empty = '';
    if (!loaded && !failed) empty = emptyHTML('🍳', 'Shuffling the deck', 'Fetching your dishes.', '', true);
    else if (failed) empty = emptyHTML('📡', 'Your dishes are out of reach', esc(failed), '<button type="button" class="primary" data-act="retry">Try again</button>');
    else if (!recipes.size) empty = emptyHTML('🍽️', 'No dishes yet', 'Add your first favourite and it will appear here as a card.', '<button type="button" class="primary" data-act="add">' + ic('plus') + 'Add a dish</button>');
    else if (![...recipes.values()].some(matches)) empty = emptyHTML('🔍', 'Nothing fits all of that', 'Change a filter to see more dishes.');
    else if (!queue.length && shortlist.length) {
      const more = passed.some(id => !shortlist.includes(id));
      empty = emptyHTML('🎉', 'Time to choose', 'You have ' + shortlist.length + ' on your shortlist.', '<button type="button" class="primary" data-act="list">See your shortlist</button>' + (more ? '<button type="button" class="quiet" data-act="again">Swipe the rest again</button>' : ''));
    }
    else if (!queue.length) empty = emptyHTML('🤷', 'That was the whole deck', 'Nothing grabbed you? Shuffle and go again.', '<button type="button" class="primary" data-act="again">Go again</button>');
    stack.classList.remove('settle', 'advance');
    stack.style.setProperty('--p', '0');
    if (empty) stack.innerHTML = empty;
    else {
      stack.innerHTML = queue.slice(0, 3).reverse().map(cardHTML).join('');
      bindTop(stack.lastElementChild);
    }
    $('noBtn').disabled = $('yesBtn').disabled = !queue.length;
    $('backBtn').disabled = !passed.length;
  }

  function renderFilter() {
    $('modeAll').setAttribute('aria-pressed', String(mode === 'all'));
    $('modeHave').setAttribute('aria-pressed', String(mode === 'have'));
    const chips = $('chips');
    chips.hidden = mode === 'all';
    const freq = new Map();
    recipes.forEach(r => terms(r).forEach(t => freq.set(t, (freq.get(t) || 0) + 1)));
    const sorted = [...freq.keys()].sort((a, b) => freq.get(b) - freq.get(a) || a.localeCompare(b));
    chips.innerHTML = sorted.map(t => '<button type="button" class="chip" data-term="' + esc(t) + '" aria-pressed="' + have.has(t) + '">' + esc(t) + '</button>').join('');
    const n = [...recipes.values()].filter(matches).length;
    let label = '';
    if (loaded) {
      if (mode === 'have' && !have.size) label = 'Tap what you have. Dishes using any of it stay in.';
      else if (mode === 'have') label = n + ' of ' + recipes.size + ' dishes use ' + [...have].join(' or ');
      else label = n + (n === 1 ? ' dish' : ' dishes') + ' in the deck';
    }
    $('count').textContent = label;
    $('easyBtn').setAttribute('aria-pressed', String(easyOnly));
    document.querySelectorAll('[data-lexi]').forEach(b => b.setAttribute('aria-pressed', String(lexiOnly)));
  }

  const rateRows = (valueOf, attr) => SCORES.map(s => '<div class="rate-row"><span>' + s[2] + '</span><div class="pips">' +
    [1, 2, 3, 4, 5].map(i => '<button type="button" ' + attr + '="' + s[0] + '" data-val="' + i + '" class="' + (i <= valueOf(s[0]) ? 'on' : '') + '" aria-label="' + s[1] + ' ' + i + ' out of 5">' + i + '</button>').join('') +
    '</div></div>').join('');

  // While cooking, a tap on an ingredient or step greys it out, and another tap brings it back. Kept per
  // phone and per dish, so a locked phone or a reload doesn't lose your place, and forgotten after a day.
  const TICKS_COOKING_KEY = keyed('supper-swipe-cooking'), TICKS_LAST = 18 * 3600000;
  let cooking = {};
  try { cooking = JSON.parse(localStorage.getItem(TICKS_COOKING_KEY)) || {}; } catch (e) { cooking = {}; }
  Object.keys(cooking).forEach(id => { if (!(Date.now() - cooking[id].at < TICKS_LAST)) delete cooking[id]; });
  const ticked = id => (cooking[id] ? cooking[id].done : []);
  function toggleTick(id, line) {
    const done = ticked(id).includes(line) ? ticked(id).filter(x => x !== line) : ticked(id).concat(line);
    if (done.length) cooking[id] = { at: Date.now(), done };
    else delete cooking[id];
    try { localStorage.setItem(TICKS_COOKING_KEY, JSON.stringify(cooking)); } catch (e) { /* still ticked until the page closes */ }
    return done.includes(line);
  }
  const tickLine = (id, line, inner) => {
    const on = ticked(id).includes(line);
    return '<li role="checkbox" tabindex="0" aria-checked="' + on + '" data-tick="' + line + '"' + (on ? ' class="done"' : '') + '>' + inner + '</li>';
  };

  // Cooking mode: after "We're cooking this tonight" the dish's page turns into a kitchen view. The screen
  // stays on, the steps are big and tick off, and every time in the method ("roast for 30 to 40 minutes")
  // becomes a timer you can start. Kept on the phone, so a reload or a locked phone keeps it all.
  const COOK_KEY = keyed('supper-swipe-cook-session'), COOK_LASTS = 8 * 3600000;
  let cook = readStored(COOK_KEY, null);
  if (!cook || !(Date.now() - cook.at < COOK_LASTS)) cook = null;
  const saveCook = () => { try { localStorage.setItem(COOK_KEY, JSON.stringify(cook)); } catch (e) { /* works until the page closes */ } };
  const cookingNow = id => !!cook && cook.id === id;
  // "30 to 40 minutes", "1 hour", "1½ hours", "5-10 mins". The timer is set to the shorter time, so you check early.
  const TIME = /(\d+(?:[.,]\d+)?|½)(\s*½)?(?:\s*(?:to|-|–|or)\s*\d+(?:[.,]\d+)?)?\s*(hours?|hrs?|minutes?|mins?)\b/gi;
  // A timer is named after the cooking word nearest before its time in that sentence, so "Pierce the
  // aubergines and steam them for about 30 minutes" gives "Steam", and the step number tells two apart.
  const VERBS = /\b(fry|cook|simmer|bake|roast|boil|steam|grill|griddle|chill|leave|rest|marinate|soak|soften|sweat|brown|toast|poach|braise|stew|drain|cool|rise|prove|blanch|microwave|sear|saut[eé]|reduce|cover|heat|warm|melt|whisk|stir|mix|blend|knead|char|caramelise|caramelize|infuse|steep|freeze|set|bubble|crisp|wilt|thicken)(?:s|es|ed|d|ing)?\b/gi;
  function nameBefore(text) {
    const sentence = text.split(/[.;!?]\s/).pop(), verbs = [...sentence.matchAll(VERBS)];
    const verb = verbs.length ? verbs[verbs.length - 1][1].toLowerCase() : '';
    return verb ? verb[0].toUpperCase() + verb.slice(1) : 'Timer';
  }
  function timesIn(step) {
    const found = [];
    for (const m of String(step).matchAll(TIME)) {
      const n = m[1] === '½' ? .5 : parseFloat(m[1].replace(',', '.')) + (m[2] ? .5 : 0);
      const minutes = Math.round(/^h/i.test(m[3]) ? n * 60 : n);
      if (minutes >= 1 && minutes <= 720) found.push({ minutes, name: nameBefore(String(step).slice(0, m.index)) });
    }
    return found;
  }
  const clock = ms => {
    const t = Math.max(0, Math.ceil(ms / 1000)), h = Math.floor(t / 3600), m = Math.floor(t / 60) % 60, sec = t % 60;
    return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(sec).padStart(2, '0');
  };
  const minutesText = n => (n % 60 === 0 && n >= 60 ? n / 60 + (n === 60 ? ' hour' : ' hours') : n + ' min');

  let audio = null, ticker = null, wakeLock = null;
  function ring(name) {
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      [0, .45, .9, 1.8, 2.25, 2.7].forEach(at => {
        const o = audio.createOscillator(), g = audio.createGain(), t = audio.currentTime + at;
        o.frequency.value = 880;
        g.gain.setValueAtTime(.0001, t);
        g.gain.exponentialRampToValueAtTime(.4, t + .02);
        g.gain.exponentialRampToValueAtTime(.0001, t + .35);
        o.connect(g).connect(audio.destination);
        o.start(t);
        o.stop(t + .4);
      });
    } catch (e) { /* no sound on this phone, the buzz and the message still come */ }
    if (navigator.vibrate) navigator.vibrate([400, 200, 400, 200, 400]);
    toast('⏰ ' + name + ': time is up');
  }
  function tickTimers() {
    if (!cook) return;
    const now = Date.now();
    cook.timers.forEach(t => {
      if (!t.rang && t.ends <= now) {
        t.rang = true;
        saveCook();
        ring(t.name);
      }
    });
    document.querySelectorAll('[data-left]').forEach(el => {
      const t = cook.timers.find(x => x.key === el.dataset.left);
      if (!t) return;
      el.textContent = t.rang ? 'Done' : clock(t.ends - now);
      el.closest('.timer').classList.toggle('rang', !!t.rang);
    });
    if (!cook.timers.some(t => !t.rang)) { clearInterval(ticker); ticker = null; }
  }
  const runTicker = () => { if (!ticker && cook && cook.timers.some(t => !t.rang)) ticker = setInterval(tickTimers, 1000); };
  async function keepScreenOn() {
    const want = !!cook && openId === cook.id && document.visibilityState === 'visible';
    try {
      if (want && !wakeLock && navigator.wakeLock) {
        wakeLock = await navigator.wakeLock.request('screen');
        wakeLock.addEventListener('release', () => { wakeLock = null; });
      } else if (!want && wakeLock) {
        const lock = wakeLock;
        wakeLock = null;
        await lock.release();
      }
    } catch (e) { /* the phone said no, for example in battery saver */ }
  }
  document.addEventListener('visibilitychange', () => { keepScreenOn(); tickTimers(); });
  runTicker();

  function cookingHtml(r, id) {
    const now = Date.now();
    const bar = '<div class="cook-bar"><div class="cook-top"><button type="button" class="round" data-act="close" aria-label="Back">' + ic('back') + '</button>' +
      '<div class="cook-title"><p class="kicker">Cooking' + (cook.by ? ' · ' + esc(cook.by) : '') + '</p><h2>' + esc(r.title) + '</h2></div></div>' +
      (cook.timers.length ? '<div class="timers" role="status">' + cook.timers.map(t => '<div class="timer' + (t.rang ? ' rang' : '') + '"><span>' + esc(t.name) + '</span><b data-left="' + esc(t.key) + '">' + (t.rang ? 'Done' : clock(t.ends - now)) + '</b>' +
        '<button type="button" data-stop="' + esc(t.key) + '" aria-label="Stop the ' + esc(t.name) + ' timer">' + ic('x') + '</button></div>').join('') + '</div>' : '') +
      '</div>';
    const steps = list(r.steps).map((x, i) => {
      const chips = timesIn(x).map((t, j) => {
        const key = 's' + i + 't' + j, on = cook.timers.some(k => k.key === key);
        return '<button type="button" class="timer-chip" data-timer="' + key + '" data-minutes="' + t.minutes + '"' + (on ? ' disabled' : '') + '>' + ic('clock') + (on ? 'Timer on' : minutesText(t.minutes)) + '</button>';
      }).join('');
      return tickLine(id, 's' + i, '<span>' + esc(x) + (chips ? '<span class="chips">' + chips + '</span>' : '') + '</span>');
    }).join('');
    return '<div class="sheet-in cooking">' + bar + '<div class="sheet-body">' +
      '<p class="tick-hint">' + (navigator.wakeLock ? 'The screen stays on while this is open. ' : '') + 'Tap a line to tick it off, and a time to start a timer.</p>' +
      (list(r.shopping).length ? '<section><h3>Ingredients</h3><ul class="ingredients">' + list(r.shopping).map((x, i) => tickLine(id, 'i' + i, esc(x))).join('') + '</ul></section>' : '') +
      (steps ? '<section><h3>Method</h3><ol class="steps">' + steps + '</ol></section>' : '<p class="note">This dish has no method saved. Tap Back, then Edit to add one.</p>') +
      (r.note ? '<p class="note">' + esc(r.note) + '</p>' : '') +
      '</div>' +
      '<div class="cta-bar"><button type="button" class="ghost" data-act="poster">' + ic('share') + 'Tell someone</button>' +
      '<button type="button" class="primary" data-act="finish">Done cooking</button></div></div>';
  }

  function renderRecipe() {
    const box = $('recipe');
    const r = openId && recipes.get(openId);
    box.hidden = !r;
    if (!r) return;
    keepScreenOn();
    if (cookingNow(openId)) { box.innerHTML = cookingHtml(r, openId); return; }
    const on = shortlist.includes(openId), kicker = headline(r).join(' · ');
    const src = /^https?:\/\//.test(r.sourceUrl || '') ? '<a href="' + esc(r.sourceUrl) + '" target="_blank" rel="noopener">Original recipe' + (r.source ? ' from ' + esc(r.source) : '') + '</a>' : esc(r.source ? 'From: ' + r.source : '');
    const facts = [r.minutes ? ic('clock') + esc(r.minutes) + ' min' : '', r.serves ? 'Serves ' + esc(r.serves) : '', esc(lastHad(r))].filter(Boolean);
    const takes = [
      r.kit ? 'Washing up: ' + r.kit : '',
      list(r.shopping).length ? list(r.shopping).length + ' ingredients' : '',
      r.handsOn ? r.handsOn + ' minutes hands-on' : '',
      list(r.hard).length ? 'Hard to find: ' + list(r.hard).join(', ') : ''
    ].filter(Boolean);
    box.innerHTML = '<div class="sheet-in">' +
      '<header class="hero ' + colourOf(r) + ' ' + variant(openId) + '">' + art(r) +
        '<div class="hero-bar"><button type="button" data-act="close" aria-label="Back">' + ic('back') + '</button><button type="button" data-act="edit">' + ic('pencil') + 'Edit</button></div>' +
        '<div class="hero-text">' +
          (r.tried ? '' : '<p class="kicker">Try something new</p>') +
          (kicker ? '<p class="kicker">' + esc(kicker) + '</p>' : '') +
          '<h2>' + esc(r.title) + '</h2>' +
          '<div class="meta">' + facts.map(x => '<span>' + x + '</span>').join('') + '</div>' +
        '</div>' +
      '</header>' +
      '<div class="sheet-body">' +
      (r.blurb ? '<p class="lede">' + esc(r.blurb) + '</p>' : '') +
      '<div class="rate">' +
        '<div class="rate-row"><span>Kid friendly?</span><div class="seg">' +
        '<button type="button" data-flag="lexi" data-val="1" aria-pressed="' + !!r.lexi + '">Yes</button>' +
        '<button type="button" data-flag="lexi" data-val="0" aria-pressed="' + !r.lexi + '">No</button></div></div>' +
        '<div class="rate-row"><span>Made it before?</span><div class="seg">' +
        '<button type="button" data-flag="tried" data-val="1" aria-pressed="' + !!r.tried + '">Tried and tested</button>' +
        '<button type="button" data-flag="tried" data-val="0" aria-pressed="' + !r.tried + '">To try</button></div></div></div>' +
      '<section><h3>Rate it</h3><div class="rate">' + rateRows(s => r[s] || 0, 'data-rate') + '</div></section>' +
      (r.note ? '<p class="note">' + esc(r.note) + '</p>' : '') +
      (needsRecipe(r) ? '<p class="note">This recipe has not been copied in yet. Use the link below to see it, or tap Edit to add it.</p>' : '') +
      (takes.length ? '<section><h3>What it takes</h3><ul class="takes">' + takes.map(x => '<li>' + esc(x) + '</li>').join('') + '</ul></section>' : '') +
      (list(r.shopping).length || list(r.steps).length ? '<p class="tick-hint">Cooking? Tap an ingredient or step to tick it off, and tap again to bring it back.</p>' : '') +
      (list(r.shopping).length ? '<section><h3>Ingredients</h3><ul class="ingredients">' + list(r.shopping).map((x, i) => tickLine(openId, 'i' + i, esc(x))).join('') + '</ul></section>' : '') +
      (list(r.steps).length ? '<section><h3>Method</h3><ol class="steps">' + list(r.steps).map((x, i) => tickLine(openId, 's' + i, '<span>' + esc(x) + '</span>')).join('') + '</ol></section>' : '') +
      (src ? '<p class="source">' + src + '</p>' : '') +
      '</div>' +
      '<div class="cta-bar"><button type="button" class="ghost" data-toggle="' + esc(openId) + '" aria-pressed="' + on + '">' + ic('heart') + (on ? 'On shortlist' : 'Shortlist') + '</button>' +
      '<button type="button" class="primary" data-act="cook">We\'re cooking this tonight</button></div>' +
      '</div>';
  }

  const factsOf = r => [r.tried ? '' : 'To try', r.lexi ? 'Kid friendly' : '', r.minutes ? r.minutes + ' min' : '', r.ease ? 'Ease ' + r.ease : '', r.love ? 'Liked ' + r.love + '/5' : ''].filter(Boolean).join(' · ');
  const peopleFor = id => servings[id] || Shopping.servesOf(recipes.get(id));
  const rowOpen = (id, r, heart) => '<button type="button" class="pick-open" data-open="' + esc(id) + '"><span class="tile" aria-hidden="true">' + (r.photo ? '<img src="' + esc(r.photo.replace('.jpg', '-thumb.jpg')) + '" alt="" loading="lazy">' : '<span>' + plate(r)[0] + '</span>') + (heart ? '<i class="tile-match">♥</i>' : '') + '</span>' +
    '<span class="pick-text"><strong>' + esc(r.title) + (heart ? '<span class="vh">, a match</span>' : '') + '</strong><span>' + esc(factsOf(r)) + '</span></span></button>';
  const peopleRow = id => '<div class="people"><span>Cooking for</span><span class="stepper"><button type="button" data-people="' + esc(id) + '" data-change="-1" aria-label="Fewer people">' + ic('minus') + '</button><b>' + peopleFor(id) + '</b><button type="button" data-people="' + esc(id) + '" data-change="1" aria-label="More people">' + ic('plus') + '</button></span></div>';

  function renderAll() {
    const words = $('search').value.toLowerCase().split(/\s+/).filter(Boolean);
    document.querySelectorAll('[data-show]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.show === allShow)));
    const found = [...recipes.entries()].filter(([, r]) => {
      if (allShow === 'tried' && !r.tried) return false;
      if (allShow === 'try' && r.tried) return false;
      if (lexiOnly && !r.lexi) return false;
      const text = [r.title, r.blurb].concat(list(r.tags), list(r.shopping)).join(' ').toLowerCase();
      return words.every(w => text.includes(w));
    }).sort((a, b) => a[1].title.localeCompare(b[1].title));
    $('allCount').textContent = loaded ? found.length + (found.length === 1 ? ' dish' : ' dishes') : '';
    $('allList').innerHTML = found.length ? found.map(([id, r]) => {
      const on = shortlist.includes(id);
      return '<div class="pick ' + colourOf(r) + '">' + rowOpen(id, r) +
        '<button type="button" class="pick-toggle" data-toggle="' + esc(id) + '" aria-pressed="' + on + '" aria-label="' + esc(r.title) + ': on the shortlist">' + ic(on ? 'check' : 'plus') + '</button></div>';
    }).join('') : (loaded ? '<p class="empty-note"><span class="empty-emoji" aria-hidden="true">🔍</span>No dishes match that.</p>' : '');
  }

  const otherName = () => Object.keys(PEOPLE).filter(p => p !== who).map(p => PEOPLE[p]).join(' and ');
  const likedBy = person => likes[person] || [];
  const isMatch = id => Object.keys(PEOPLE).filter(p => likedBy(p).includes(id)).length >= 2;
  const matchIds = () => [...new Set(Object.keys(PEOPLE).flatMap(likedBy))].filter(id => isMatch(id) && recipes.has(id));
  async function sendLike(person, id, method) {
    const path = '/likes/' + person + '/' + encodeURIComponent(id);
    likeSaves++;
    try {
      await api(path, method).catch(async () => {
        await new Promise(done => setTimeout(done, 3000));
        return api(path, method);
      });
    } catch (e) {
      toast('Could not save that for ' + otherName() + ' to see. Check your connection.');
    } finally {
      likeSaves--;
      writes++;
    }
  }
  function like(id, quiet) {
    if (!who || likedBy(who).includes(id)) return;
    likes[who] = likedBy(who).concat(id);
    sendLike(who, id, 'PUT');
    if (!quiet && isMatch(id)) setTimeout(announceMatches, 500);
  }
  // A match stays until it is cooked or removed, unless this is undoing the swipe that made it.
  function unlike(id, evenIfMatched) {
    if (!who || !likedBy(who).includes(id) || (isMatch(id) && !evenIfMatched)) return;
    likes[who] = likes[who].filter(x => x !== id);
    sendLike(who, id, 'DELETE');
  }
  function endMatch(id) {
    Object.keys(PEOPLE).forEach(person => {
      if (!likedBy(person).includes(id)) return;
      likes[person] = likes[person].filter(x => x !== id);
      sendLike(person, id, 'DELETE');
    });
  }
  function announceMatches() {
    if (!who || !loaded || !$('tonight').hidden || !$('who').hidden || openId || shopOpen || !$('adder').hidden) return;
    const now = matchIds(), fresh = now.filter(id => !seenMatches.includes(id));
    seenMatches = now;
    store(SEEN_KEY, seenMatches);
    if (fresh.length) showMatch(fresh[0], fresh.length - 1);
    renderBadge();
  }
  // With its group known, the phone offers that group's people. Without one, it offers everyone, by group.
  async function showWho() {
    let groups = { [group]: PEOPLE };
    if (!group) {
      try {
        const res = await fetch('/api/dishes/groups', { signal: AbortSignal.timeout(10000) });
        if (!res.ok) throw new Error('Request failed');
        groups = await res.json();
      } catch (e) {
        failed = 'They could not be loaded. Check your connection and reopen the page.';
        render();
        return;
      }
    }
    $('whoPick').innerHTML = Object.entries(groups).map(([g, people]) => '<div class="who-group">' +
      Object.entries(people).map(([key, name]) => '<button type="button" class="primary" data-who="' + esc(key) + '" data-group="' + esc(g) + '">' + esc(name) + '</button>').join('') +
      '</div>').join('');
    $('who').hidden = false;
    $('app').inert = true;
    $('who').querySelector('button').focus({ preventScroll: true });
  }

  function renderBadge() {
    const badge = $('shortBadge'), n = shortlist.length, matched = matchIds().length;
    badge.textContent = n;
    badge.hidden = !n;
    $('matchBadge').textContent = '♥ ' + matched;
    $('matchBadge').hidden = !matched;
    $('shortTab').setAttribute('aria-label', (n ? 'Shortlist, ' + n + (n === 1 ? ' dish' : ' dishes') : 'Shortlist') + (matched ? ', ' + matched + (matched === 1 ? ' match' : ' matches') : ''));
    if (n > badgeCount && !flying) bumpBadge();
    badgeCount = n;
  }
  function bumpBadge() {
    const badge = $('shortBadge');
    badge.classList.remove('bump');
    void badge.offsetWidth;
    badge.classList.add('bump');
  }

  function renderShortlist() {
    renderBadge();
    const matched = matchIds();
    const views = '<div class="seg"><button type="button" data-view="mine" aria-pressed="' + (shortView === 'mine') + '">Shortlist</button><button type="button" data-view="matches" aria-pressed="' + (shortView === 'matches') + '">Matches' + (matched.length ? ' (' + matched.length + ')' : '') + '</button></div>';
    if (shortView === 'matches') {
      $('panelShort').innerHTML = '<h2 class="panel-title">Your matches</h2>' + views + (matched.length
        ? '<p class="panel-note">You and ' + esc(otherName()) + ' both swiped right on these. Create a shopping list for all of them, or add one to your shortlist.</p>' +
          '<div class="picks">' + matched.map(id => {
            const r = recipes.get(id), on = shortlist.includes(id);
            return '<div class="pick ' + colourOf(r) + '">' + rowOpen(id, r) +
              '<button type="button" class="pick-toggle" data-toggle="' + esc(id) + '" aria-pressed="' + on + '" aria-label="' + esc(r.title) + ': on the shortlist">' + ic(on ? 'check' : 'plus') + '</button>' +
              '<button type="button" class="pick-remove" data-unmatch="' + esc(id) + '" aria-label="Remove ' + esc(r.title) + ' from your matches">' + ic('x') + '</button>' + peopleRow(id) + '</div>';
          }).join('') + '</div>' +
          '<div class="list-actions"><button type="button" class="primary" data-act="shop" data-from="matches">' + ic('bag') + 'Create shopping list</button></div>'
        : '<p class="empty-note"><span class="empty-emoji" aria-hidden="true">💞</span>No matches yet. When you and ' + esc(otherName()) + ' both swipe right on a dish, it lands here.</p>') +
        '<button type="button" class="quiet" data-change-who>This phone is ' + esc(PEOPLE[who] || 'nobody yet') + '. Change</button>';
      return;
    }
    $('panelShort').innerHTML = '<h2 class="panel-title">Your shortlist</h2>' + views + (shortlist.length
      ? '<p class="panel-note">Pick tonight\'s dinner, or plan a few nights and create one shopping list.</p>' +
        '<div class="picks">' + shortlist.map(id => {
          const r = recipes.get(id);
          if (!r) return '';
          return '<div class="pick ' + colourOf(r) + '">' + rowOpen(id, r, matched.includes(id)) +
            '<button type="button" class="pick-remove" data-toggle="' + esc(id) + '" aria-label="Remove ' + esc(r.title) + ' from the shortlist">' + ic('x') + '</button>' + peopleRow(id) + '</div>';
        }).join('') + '</div>' +
        '<button type="button" class="quiet" data-act="clear">Clear shortlist</button>' +
        '<div class="list-actions"><button type="button" class="primary" data-act="shop">' + ic('bag') + 'Create shopping list</button></div>'
      : '<p class="empty-note"><span class="empty-emoji" aria-hidden="true">💭</span>Nothing here yet. Swipe right on a dish, or add one from All dishes.</p>');
  }

  function shoppingList() {
    const dishes = (shopFrom === 'matches' ? matchIds() : shortlist).filter(id => recipes.has(id)).map(id => {
      const r = recipes.get(id);
      return { id, title: r.title, shopping: list(r.shopping), factor: peopleFor(id) / Shopping.servesOf(r) };
    });
    return { dishes, aisles: Shopping.build(dishes) };
  }

  function renderShop() {
    const box = $('shop');
    box.hidden = !shopOpen;
    if (!shopOpen) return;
    const { dishes, aisles } = shoppingList();
    const listId = dishes.map(d => d.id + ':' + peopleFor(d.id)).sort().join(',');
    if (ticks.list !== listId) {
      const names = aisles.flatMap(a => a.items.map(i => i.name));
      ticks = { list: listId, names: [], basket: list(ticks.basket).filter(n => names.includes(n)) };
      store(ticksKey(), ticks);
    }
    box.innerHTML = '<div class="sheet-in">' +
      '<div class="sheet-bar"><button type="button" class="round" data-act="close" aria-label="Back">' + ic('back') + '</button><h2>Shopping list</h2></div>' +
      '<div class="sheet-body">' +
      '<p class="sub">For ' + (shopFrom === 'matches' ? 'your ' + dishes.length + (dishes.length === 1 ? ' match: ' : ' matches: ') : dishes.length + (dishes.length === 1 ? ' dish: ' : ' dishes: ')) + esc(dishes.map(d => d.title).join(', ')) + '</p>' +
      '<p class="note">Amounts are added up from the recipes, so round up to what the shop sells. Tick what you need, or select all and untick what you already have. Only ticked items are sent. If nothing is ticked, the whole list goes. Tap ' + (shop === 'crisp' ? 'Crisp on a line to find it at Crisp' : 'AH on a line to find it at Albert Heijn') + ', which also marks it as in your basket. Tap the basket to change that.</p>' +
      '<div class="rate-row"><span>Shop at</span><div class="seg"><button type="button" data-shop="ah" aria-pressed="' + (shop === 'ah') + '">Albert Heijn</button><button type="button" data-shop="crisp" aria-pressed="' + (shop === 'crisp') + '">Crisp</button></div></div>' +
      '<div class="progress"><div class="count-row"><p class="count" id="shopCount" aria-live="polite"></p><button type="button" class="chip" id="allBtn" data-act="all"></button></div>' +
      '<div class="bar" id="shopBar" aria-hidden="true"><i></i></div></div>' +
      (ahConnected ? '<button type="button" class="ghost" data-act="ah">' + ic('bag') + 'Send to AH list</button>' : '') +
      aisles.map(a => '<section class="aisle"><h3><span aria-hidden="true">' + (AISLE_EMOJI[a.key] || '🛒') + '</span>' + esc(a.label) + '</h3>' + a.items.map(i =>
        '<label class="buy' + (inBasket(i.name) ? ' in' : '') + '"><input type="checkbox" data-tick="' + esc(i.name) + '"' + (ticks.names.includes(i.name) ? ' checked' : '') + '>' +
        '<span class="buy-text"><span class="buy-line"><span>' + esc(i.name) + (i.optional ? ' (optional)' : '') + '</span><span class="buy-amount">' + esc(i.amount === 'some' ? '' : i.amount) + '</span></span>' +
        '<span class="buy-uses">' + esc(i.uses.map(u => u.dish + ': ' + u.amount + (u.optional ? ', optional' : '')).join('; ')) + '</span><span class="buy-in">In basket</span></span>' +
        '<a class="ah-link" data-find="' + esc(i.name) + '" href="' + esc(shop === 'crisp' ? Shopping.crispSearch(i.name) : Shopping.ahSearch(i.name)) + '" target="_blank" rel="noopener" aria-label="Find ' + esc(i.name) + ' at ' + (shop === 'crisp' ? 'Crisp' : 'AH') + '">' + (shop === 'crisp' ? 'Crisp' : 'AH') + '</a>' +
        '<button type="button" class="basket" data-basket="' + esc(i.name) + '" aria-pressed="' + inBasket(i.name) + '" aria-label="' + esc(i.name) + ' is in the basket">' + ic('bag') + '</button></label>').join('') + '</section>').join('') +
      '<button type="button" class="quiet" id="basketClear" data-act="basket-clear">Empty the basket marks</button>' +
      (ahConnected ? '<button type="button" class="quiet" data-act="ah-off">Disconnect AH</button>' : '') +
      '</div>' +
      '<div class="send-bar"><button type="button" class="primary" data-act="whatsapp">' + ic('chat') + 'WhatsApp</button>' +
      '<button type="button" class="ghost" data-act="pdf" aria-label="Download PDF">' + ic('download') + 'PDF</button>' +
      '<button type="button" class="ghost" data-act="share" aria-label="Share or copy">' + ic('share') + 'Share</button></div>' +
      '</div>';
    renderShopCount();
  }
  const shopNames = () => shoppingList().aisles.flatMap(a => a.items.map(i => i.name));
  const inBasket = name => list(ticks.basket).includes(name);
  function setBasket(name, on) {
    ticks.basket = list(ticks.basket).filter(n => n !== name).concat(on ? [name] : []);
    store(ticksKey(), ticks);
    const b = [...$('shop').querySelectorAll('[data-basket]')].find(x => x.dataset.basket === name);
    b.setAttribute('aria-pressed', on);
    b.closest('.buy').classList.toggle('in', on);
    renderShopCount();
  }
  function renderShopCount() {
    const names = shopNames(), n = names.filter(x => ticks.names.includes(x)).length;
    const held = names.filter(inBasket).length;
    $('shopCount').textContent = n + ' of ' + names.length + ' ticked, ' + held + ' in basket';
    $('basketClear').hidden = !held;
    $('shopBar').style.setProperty('--done', names.length ? (n / names.length).toFixed(3) : '0');
    $('allBtn').textContent = names.length && n === names.length ? 'Clear all' : 'Select all';
  }
  // What gets sent: the ticked items, or the whole list if nothing is ticked.
  function listToSend() {
    const { dishes, aisles } = shoppingList();
    const ticked = aisles.map(a => ({ ...a, items: a.items.filter(i => ticks.names.includes(i.name)) })).filter(a => a.items.length);
    return { aisles: ticked.length ? ticked : aisles, forDishes: 'For: ' + dishes.map(d => d.title).join(', ') };
  }
  const listText = mark => {
    const { aisles, forDishes } = listToSend();
    return 'Shopping list\n' + forDishes + '\n\n' + Shopping.toText(aisles, mark);
  };
  async function downloadPdf() {
    const { aisles, forDishes } = listToSend();
    const file = new File([Shopping.toPdf(aisles, 'Shopping list', forDishes)], 'shopping-list.pdf', { type: 'application/pdf' });
    // An iPhone home-screen app can't save a download, so offer its share sheet, which has Save to Files.
    if (navigator.standalone && navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: 'Shopping list' });
      } catch (err) {
        if (err && err.name !== 'AbortError') toast('The PDF could not be shared on this phone.');
      }
      return;
    }
    const link = document.createElement('a');
    link.href = URL.createObjectURL(file);
    link.download = file.name;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(link.href), 60000);
  }
  function sendToWhatsApp() {
    const text = listText('*');
    const url = 'https://wa.me/?text=' + encodeURIComponent(text);
    if (url.length <= WHATSAPP_LINK_LIMIT) { open(url, '_blank', 'noopener'); return; }
    navigator.clipboard.writeText(text).then(() => toast('Too long for a link, so it is copied. Paste it into the chat.'), () => toast('That could not be copied on this phone.'));
    open('https://wa.me/', '_blank', 'noopener');
  }

  function render() { renderFilter(); renderStack(); renderAll(); renderShortlist(); renderRecipe(); renderShop(); }

  function toggleShortlist(id, source) {
    const on = shortlist.includes(id);
    if (!on && source) {
      const box = source.getBoundingClientRect();
      burst(box.left + box.width / 2, box.top + box.height / 2, plate(recipes.get(id)), 6);
      buzz(10);
    }
    shortlist = on ? shortlist.filter(x => x !== id) : shortlist.concat(id);
    if (on) unlike(id);
    else like(id);
    passed = passed.filter(x => x !== id);
    saveShortlist();
    syncDeck();
    render();
    toast(recipes.get(id).title + (on ? ' is off your shortlist' : ' is on your shortlist'));
  }

  // Little celebrations. All of it is skipped for people who ask their phone for less motion.
  const at = (x, y) => 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px) translate(-50%,-50%)';
  function burst(x, y, emoji, count) {
    if (!canAnimate) return;
    for (let i = 0; i < count; i++) {
      const el = document.createElement('span');
      el.textContent = emoji[i % emoji.length];
      $('fx').append(el);
      const angle = Math.random() * Math.PI * 2, far = 50 + Math.random() * 110;
      const x1 = x + Math.cos(angle) * far, y1 = y + Math.sin(angle) * far - 80, spin = (Math.random() - .5) * 240;
      el.animate([
        { transform: at(x, y) + ' scale(.3)', opacity: 1 },
        { transform: at(x1, y1) + ' scale(1.15) rotate(' + spin * .6 + 'deg)', opacity: 1, offset: .45, easing: 'ease-in' },
        { transform: at(x1 + (x1 - x) * .25, y1 + 150) + ' scale(.8) rotate(' + spin + 'deg)', opacity: 0 }
      ], { duration: 850 + Math.random() * 350, easing: 'cubic-bezier(.15, .75, .3, 1)', fill: 'forwards' }).onfinish = () => el.remove();
    }
  }
  function celebrate(card) {
    buzz(12);
    const r = recipes.get(card.dataset.id);
    if (!canAnimate || !r) return;
    const box = card.getBoundingClientRect(), x = box.left + box.width / 2, y = box.top + box.height * .32;
    burst(x, y, plate(r).concat('✨'), 10);
    const to = $('shortTab').querySelector('.tab-ico').getBoundingClientRect(), tx = to.left + to.width / 2, ty = to.top + to.height / 2;
    const token = document.createElement('span');
    token.textContent = plate(r)[0];
    $('fx').append(token);
    flying = true;
    const land = () => {
      if (!flying) return;
      flying = false;
      token.remove();
      bumpBadge();
    };
    token.animate([
      { transform: at(x, y) + ' scale(1.7)', opacity: 1 },
      { transform: at((x + tx) / 2 + 36, Math.min(y, ty) - 40) + ' scale(1.3)', opacity: 1, offset: .5 },
      { transform: at(tx, ty) + ' scale(.5)', opacity: .9 }
    ], { duration: 620, easing: 'cubic-bezier(.4, 0, .6, 1)', fill: 'forwards' }).onfinish = land;
    setTimeout(land, 900);
  }

  // The moment a dinner is chosen: its card as a full-screen poster, made to be screenshotted or sent on.
  function tonightText(r) {
    const now = new Date();
    const ready = r.minutes && r.minutes <= 240 ? new Date(now.getTime() + r.minutes * 60000) : null;
    return {
      day: now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }),
      by: ready ? 'On the table by ' + ready.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : ''
    };
  }
  function showTonight(id) {
    const r = recipes.get(id), box = $('tonight'), { day, by } = tonightText(r);
    box.className = 'tonight ' + colourOf(r) + ' ' + variant(id);
    box.dataset.id = id;
    box.innerHTML = art(r) + '<p class="tonight-brand" aria-hidden="true">Supper Swipe</p>' +
      '<div class="tonight-text"><p class="kicker">Tonight · ' + esc(day) + '</p><h2' + (String(r.title).length > 34 ? ' class="long"' : '') + '>' + esc(r.title) + '</h2>' + (by ? '<p class="tonight-by">' + esc(by) + '</p>' : '') + '</div>' +
      '<div class="tonight-actions"><button type="button" class="soft" data-act="tell">' + ic('share') + 'Tell someone</button><button type="button" data-act="done">Done</button></div>';
    box.hidden = false;
    $('recipe').inert = true;
    if (canAnimate) {
      box.getAnimations().forEach(a => a.cancel());
      box.animate([{ opacity: 0, transform: 'scale(1.08)' }, { opacity: 1, transform: 'none' }], { duration: 320, easing: 'cubic-bezier(.2, .85, .25, 1)' });
      setTimeout(() => { if (!box.hidden) burst(innerWidth / 2, innerHeight * .42, plate(r).concat('✨', '🎉'), 16); }, 380);
    }
    buzz([14, 60, 20]);
    box.querySelector('[data-act="done"]').focus({ preventScroll: true });
  }
  function showMatch(id, more) {
    const r = recipes.get(id), box = $('tonight');
    box.className = 'tonight ' + colourOf(r) + ' ' + variant(id);
    box.dataset.id = id;
    box.innerHTML = art(r) + '<p class="tonight-brand" aria-hidden="true">Supper Swipe</p>' +
      '<div class="tonight-text"><p class="kicker">It\'s a match</p><h2' + (String(r.title).length > 34 ? ' class="long"' : '') + '>' + esc(r.title) + '</h2>' +
      '<p class="tonight-by">You and ' + esc(otherName()) + ' both want this' + (more ? ', plus ' + more + ' more' : '') + '</p></div>' +
      '<div class="tonight-actions"><button type="button" class="soft" data-act="matches">See matches</button><button type="button" data-act="done">Keep swiping</button></div>';
    box.hidden = false;
    $('app').inert = true;
    if (canAnimate) {
      box.animate([{ opacity: 0, transform: 'scale(1.08)' }, { opacity: 1, transform: 'none' }], { duration: 320, easing: 'cubic-bezier(.2, .85, .25, 1)' });
      setTimeout(() => { if (!box.hidden) burst(innerWidth / 2, innerHeight * .42, plate(r).concat('💞', '🎉'), 18); }, 380);
    }
    buzz([14, 60, 20, 60, 30]);
    box.querySelector('[data-act="done"]').focus({ preventScroll: true });
  }
  function hideTonight() {
    const box = $('tonight');
    if (box.hidden) return;
    box.hidden = true;
    $('app').inert = !!(openId || shopOpen || !$('adder').hidden);
    $('recipe').inert = !$('adder').hidden;
    const back = $('recipe').querySelector('[data-act="close"]');
    if (back && openId) back.focus({ preventScroll: true });
  }
  $('tonight').addEventListener('click', async e => {
    const b = e.target.closest('button');
    if (b && b.dataset.act === 'matches') {
      hideTonight();
      shortView = 'matches';
      setTab('short');
      renderShortlist();
      return;
    }
    if (!b || b.dataset.act !== 'tell') { hideTonight(); return; }
    const r = recipes.get($('tonight').dataset.id);
    if (!r) return;
    const text = 'Tonight: ' + r.title + ' ' + plate(r)[0] + (tonightText(r).by ? '\n' + tonightText(r).by : '');
    if (navigator.share) {
      try {
        await navigator.share({ text });
        return;
      } catch (err) {
        if (err && err.name === 'AbortError') return;
      }
    }
    open('https://wa.me/?text=' + encodeURIComponent(text), '_blank', 'noopener');
  });

  // Sheets grow out of whatever was tapped, or rise from the bottom.
  function showSheet(box, source) {
    if (!canAnimate) return;
    box.getAnimations().forEach(a => a.cancel());
    const from = source && source.isConnected ? source.getBoundingClientRect() : null;
    const first = from && from.width
      ? { transform: 'translate(' + from.left.toFixed(1) + 'px,' + from.top.toFixed(1) + 'px) scale(' + (from.width / innerWidth).toFixed(3) + ')', opacity: 0 }
      : { transform: 'translateY(40px)', opacity: 0 };
    box.animate([first, { transform: 'none', opacity: 1 }], { duration: from ? 380 : 300, easing: 'cubic-bezier(.2, .85, .25, 1)' });
  }
  function closeSheet(box) {
    if (closing) return;
    if (!canAnimate) { history.back(); return; }
    closing = true;
    const done = () => {
      if (!closing) return;
      closing = false;
      history.back();
    };
    box.animate([{ transform: 'none', opacity: 1 }, { transform: 'translateY(32px)', opacity: 0 }], { duration: 170, easing: 'ease-in', fill: 'forwards' }).onfinish = done;
    setTimeout(done, 400);
  }
  const topSheet = () => (!$('adder').hidden ? $('adder') : shopOpen ? $('shop') : openId ? $('recipe') : null);

  // Every sheet is a browser history entry, so the phone's back gesture closes it instead of leaving the app.
  function applyNav(state, source) {
    const s = state || {};
    const was = { recipe: openId, shop: shopOpen, add: !$('adder').hidden };
    openId = s.recipe || null;
    editId = s.edit || null;
    tab = s.tab || 'swipe';
    $('formTitle').textContent = editId ? 'Edit dish' : 'Add a dish';
    $('saveBtn').textContent = editId ? 'Save changes' : 'Save dish';
    $('getRecipe').hidden = !!editId;
    $('linkNote').hidden = $('getFile').hidden = !!editId;
    if (editId) $('readsLeft').hidden = true;
    shopOpen = !!s.shop;
    const from = s.shop === 'matches' ? 'matches' : 'mine';
    if (shopOpen && from !== shopFrom) {
      shopFrom = from;
      ticks = readStored(ticksKey(), { list: '', names: [] });
    }
    $('adder').hidden = !s.add;
    $('panelSwipe').hidden = tab !== 'swipe';
    $('panelAll').hidden = tab !== 'all';
    $('panelShort').hidden = tab !== 'short';
    document.querySelectorAll('.tabs button').forEach(b => {
      if (b.dataset.tab === tab) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
    });
    renderRecipe();
    renderShop();
    // Only the top layer can be reached by keyboard or screen reader.
    $('app').inert = !!(openId || shopOpen || s.add);
    $('recipe').inert = !!s.add;
    const opened = s.add && !was.add ? $('adder') : shopOpen && !was.shop ? $('shop') : openId && openId !== was.recipe ? $('recipe') : null;
    for (const box of [$('recipe'), $('shop'), $('adder')]) if (box.hidden && box.getAnimations) box.getAnimations().forEach(a => a.cancel());
    if (opened) {
      opened.scrollTop = 0;
      showSheet(opened, source);
      const first = opened.querySelector('[data-act="close"], #addClose');
      if (first && opened !== $('adder')) first.focus({ preventScroll: true });
    } else if (!topSheet() && (was.recipe || was.shop || was.add)) {
      const back = (was.recipe && document.querySelector('.panel:not([hidden]) [data-open="' + CSS.escape(was.recipe) + '"]')) || document.querySelector('.tabs [aria-current]');
      if (back) back.focus({ preventScroll: true });
    }
  }
  function go(state, source) {
    history.pushState(state, '');
    applyNav(state, source);
  }
  const openRecipe = (id, source) => go({ tab, recipe: id }, source);
  const setTab = t => {
    if (t !== tab) {
      go({ tab: t });
      scrollTo(0, 0);
    }
  };

  // Dragging the top card: it follows the finger, the stamps fade in and the next card rises to meet it.
  function setDrag(card, dx, dy, width) {
    const show = Math.min(1, Math.abs(dx) / 90);
    dragY = dy;
    card.style.transform = 'translate(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px) rotate(' + ((dx / width) * 15 * (card.dataset.low ? -1 : 1)).toFixed(2) + 'deg)';
    $('stack').style.setProperty('--p', Math.min(1, Math.abs(dx) / (width * .5)).toFixed(3));
    card.querySelector('.art').style.setProperty('--dx', (dx / width).toFixed(3));
    card.style.setProperty('--gx', (-1.5 + Math.min(1, Math.abs(dx) / width) * 3).toFixed(3));
    const yes = card.querySelector('.stamp.yes'), no = card.querySelector('.stamp.no');
    yes.style.opacity = dx > 0 ? show : 0;
    no.style.opacity = dx < 0 ? show : 0;
    yes.style.scale = no.style.scale = (1.4 - .4 * show).toFixed(3);
  }
  // The swiped card finishes its exit on a layer above the page, so the next card is ready at once.
  function flyOut(card, dir) {
    if (!canAnimate) return;
    const box = $('stack').getBoundingClientRect();
    const from = card.style.transform || 'translate(0px, 0px)';
    const left = box.left + card.offsetLeft, top = box.top + card.offsetTop, width = card.offsetWidth, height = card.offsetHeight;
    $('fx').append(card);
    Object.assign(card.style, { position: 'fixed', inset: 'auto', left: left + 'px', top: top + 'px', width: width + 'px', height: height + 'px', transition: 'none' });
    const done = () => card.remove();
    card.animate([{ transform: from }, { transform: 'translate(' + dir * (innerWidth + width * .5) + 'px,' + dragY.toFixed(1) + 'px) rotate(' + dir * 24 + 'deg)' }],
      { duration: 320, easing: 'cubic-bezier(.45, 0, .8, .4)', fill: 'forwards' }).onfinish = done;
    setTimeout(done, 800);
  }
  function settle(card) {
    const stack = $('stack');
    dragY = 0;
    stack.classList.add('settle');
    stack.style.setProperty('--p', '0');
    card.style.transition = reduced ? 'none' : 'transform .5s cubic-bezier(.34, 1.56, .64, 1)';
    card.style.transform = '';
    card.querySelector('.art').style.setProperty('--dx', '0');
    card.style.removeProperty('--gx');
    card.querySelectorAll('.stamp').forEach(s => { s.style.opacity = 0; });
  }

  // Swipes and cooking are counted here and sent every so often, so swiping never waits on the network.
  // Likes, matches and AI reads are counted on the server.
  const unsent = { swipes: 0, cooked: 0, dishes: {} };
  let sendTimer = null;
  function sendUsage(leaving) {
    clearTimeout(sendTimer);
    sendTimer = null;
    if (!who || !(unsent.swipes || unsent.cooked)) return;
    const counts = { swipes: unsent.swipes, cooked: unsent.cooked }, dishes = unsent.dishes;
    unsent.swipes = unsent.cooked = 0;
    unsent.dishes = {};
    // keepalive lets it finish even as the phone puts the page away.
    fetch('/api/dishes/usage', { method: 'POST', keepalive: true, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ who, counts, dishes }) })
      .then(res => { if (!res.ok) throw new Error(); })
      .catch(() => {
        unsent.swipes += counts.swipes;
        unsent.cooked += counts.cooked;
        Object.entries(dishes).forEach(([id, c]) => {
          const now = unsent.dishes[id] || (unsent.dishes[id] = { right: 0, left: 0 });
          now.right += c.right;
          now.left += c.left;
        });
        if (!leaving && !sendTimer) sendTimer = setTimeout(sendUsage, 60000);
      });
  }
  function count(kind) {
    unsent[kind]++;
    if (!sendTimer) sendTimer = setTimeout(sendUsage, kind === 'cooked' ? 2000 : 20000);
  }

  function fling(dir) {
    if (dragging || !queue.length) return;
    const stack = $('stack'), card = stack.lastElementChild;
    const risen = Math.min(1, Number(stack.style.getPropertyValue('--p')) || 0);
    if (card && card.classList.contains('card')) {
      const yes = card.querySelector('.stamp.yes'), no = card.querySelector('.stamp.no');
      yes.style.opacity = dir > 0 ? 1 : 0;
      no.style.opacity = dir < 0 ? 1 : 0;
      yes.style.scale = no.style.scale = '1';
      if (dir > 0) celebrate(card);
      flyOut(card, dir);
    }
    dragY = 0;
    const id = queue.shift();
    passed.push(id);
    count('swipes');
    const seen = unsent.dishes[id] || (unsent.dishes[id] = { right: 0, left: 0 });
    seen[dir > 0 ? 'right' : 'left']++;
    if (dir > 0 && !shortlist.includes(id)) {
      shortlist.push(id);
      saveShortlist();
      like(id);
    }
    if (recipes.has(id)) say(recipes.get(id).title + (dir > 0 ? ' is on your shortlist' : ': not tonight'));
    render();
    // The cards underneath carry on rising from wherever the drag left them.
    if (canAnimate) {
      stack.style.setProperty('--from', risen.toFixed(3));
      stack.classList.add('advance');
    }
    if (dir > 0 && !queue.length) setTab('short');
  }

  function bindTop(card) {
    if (!card || !card.classList.contains('card')) return;
    let startX = 0, startY = 0, dx = 0, width = 1, moved = false, active = false, trail = [];
    card.addEventListener('pointerdown', e => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      const box = card.getBoundingClientRect();
      active = true; dragging = true; moved = false; dx = 0;
      startX = e.clientX; startY = e.clientY; width = box.width || 1;
      trail = [[e.timeStamp, e.clientX]];
      card.dataset.low = e.clientY > box.top + box.height * .6 ? '1' : '';
      try { card.setPointerCapture(e.pointerId); } catch (err) { /* the drag still works without capture */ }
      card.style.transition = 'none';
      $('stack').classList.remove('settle', 'advance');
    });
    card.addEventListener('pointermove', e => {
      if (!active) return;
      dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (Math.abs(dx) + Math.abs(dy) > 8) moved = true;
      trail.push([e.timeStamp, e.clientX]);
      if (trail.length > 6) trail.shift();
      setDrag(card, dx, dy * .3, width);
    });
    const finish = cancelled => {
      if (!active) return;
      active = false; dragging = false;
      const first = trail[0], last = trail[trail.length - 1];
      const speed = last[0] > first[0] ? (last[1] - first[1]) / (last[0] - first[0]) : 0;
      const far = Math.abs(dx) > width * .28;
      const flick = Math.abs(speed) > .55 && Math.abs(dx) > 28 && Math.sign(speed) === Math.sign(dx);
      if (!cancelled && (far || flick)) { fling(dx > 0 ? 1 : -1); return; }
      settle(card);
    };
    card.addEventListener('pointerup', () => finish(false));
    card.addEventListener('pointercancel', () => finish(true));
    // A tap opens the recipe on its click, once the touch is over, so the same tap cannot also press a button on the sheet.
    card.addEventListener('click', () => { if (!moved && card.isConnected && card.parentNode === $('stack')) openRecipe(card.dataset.id, card); });
  }

  async function api(path, method, body, ms) {
    const res = await fetch('/api/dishes' + path, {
      method: method || 'GET',
      headers: body ? { 'content-type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(ms || 10000)
    });
    // The site's password has lapsed: reload to show its prompt, unless that would lose a form being typed.
    if (res.status === 401 && $('adder').hidden) location.reload();
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  }

  // Shows the change at once, then saves it. Saves to one dish go one after another, so none can undo another.
  async function write(id, fields, okMsg) {
    const dish = recipes.get(id);
    const before = Object.fromEntries(Object.keys(fields).map(k => [k, dish[k]]));
    Object.assign(dish, fields);
    syncDeck();
    render();
    saving++;
    writes++;
    const sent = (pending.get(id) || Promise.resolve()).then(() => api('/' + id, 'PATCH', fields));
    pending.set(id, sent.catch(() => {}));
    try {
      await sent;
      if (okMsg) toast(okMsg);
      return true;
    } catch (e) {
      Object.assign(dish, before);
      syncDeck();
      render();
      toast('That did not save. Check your connection and try again.');
      return false;
    } finally {
      saving--;
    }
  }

  // "How was it?": the next time a phone opens the app after a dish was chosen (at least three hours
  // later), it asks for a rating, which also marks it cooked. Whoever answers first answers for both.
  const ASKED_KEY = keyed('supper-swipe-asked');
  let historyAt = 0, asking = null;
  const asked = readStored(ASKED_KEY, []), notNow = new Set();
  async function askHowItWas() {
    if (!who || !loaded || asking || !$('tonight').hidden || !$('who').hidden || openId || shopOpen || !$('adder').hidden) return;
    if (Date.now() - historyAt < 20 * 60000) return;
    historyAt = Date.now();
    let events;
    try { ({ events } = await api('/history')); } catch (e) { return; }
    const weekAgo = new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10);
    const open = events.find(e => e.kind === 'chosen' && e.day >= weekAgo && recipes.has(e.dish) &&
      Date.now() - new Date(e.at).getTime() > 3 * 3600000 && !asked.includes(e.key) && !notNow.has(e.key) &&
      !events.some(c => c.kind === 'cooked' && c.dish === e.dish && c.day >= e.day));
    if (!open || openId || !$('tonight').hidden) return;
    asking = open;
    const r = recipes.get(open.dish);
    $('howTitle').textContent = 'How was the ' + r.title + '?';
    $('howWhen').textContent = (open.who && PEOPLE[open.who] ? (open.who === who ? 'You' : PEOPLE[open.who]) + ' chose it ' : 'Chosen ') + (open.day === today() ? 'today' : 'on ' + new Date(open.day + 'T12:00').toLocaleDateString('en-GB', { weekday: 'long' })) + '.';
    $('how').hidden = false;
    $('app').inert = true;
    $('how').querySelector('[data-stars="5"]').focus({ preventScroll: true });
  }
  function doneAsking() {
    $('how').hidden = true;
    $('app').inert = !!(openId || shopOpen || !$('adder').hidden);
    asking = null;
  }
  $('how').addEventListener('click', async e => {
    const b = e.target.closest('button');
    if (!b || !asking) return;
    const ev = asking;
    if (b.dataset.stars) {
      const n = Number(b.dataset.stars);
      asked.push(ev.key);
      store(ASKED_KEY, asked.slice(-50));
      doneAsking();
      write(ev.dish, { love: n }, 'Saved: ' + n + ' out of 5');
      api('/history', 'POST', { kind: 'cooked', id: ev.dish, who, rating: n }).catch(() => toast('That did not save. Check your connection.'));
    } else if (b.dataset.act === 'didnt') {
      asked.push(ev.key);
      store(ASKED_KEY, asked.slice(-50));
      doneAsking();
      try {
        const { lastHad } = await api('/history/' + ev.key.slice('history/'.length), 'DELETE');
        const d = recipes.get(ev.dish);
        if (d) { d.lastHad = lastHad; render(); }
        toast('Taken off your history');
      } catch (err) { toast('That did not save. Check your connection.'); }
    } else {
      notNow.add(ev.key);
      doneAsking();
    }
  });

  async function load() {
    const seen = writes;
    try {
      const answer = await api('');
      const { dishes } = answer, fresh = JSON.stringify(answer);
      // An answer that set off before a save finished would put the old values back on screen.
      if (saving || likeSaves || seen !== writes) return;
      if (fresh === lastLoaded) { announceMatches(); askHowItWas(); return; }
      lastLoaded = fresh;
      likes = answer.likes;
      PEOPLE = answer.people;
      if (who && !Object.hasOwn(PEOPLE, who)) who = null;
      if (!who && $('who').hidden) showWho();
      ahConnected = answer.ah;
      reads = answer.reads || null;
      showReadsLeft();
      const first = !loaded;
      recipes.clear();
      Object.entries(dishes).forEach(([id, d]) => recipes.set(id, d));
      loaded = true;
      failed = '';
      if (first) rebuildDeck();
      syncDeck();
      render();
      announceMatches();
      setTimeout(askHowItWas, 1200);
    } catch (e) {
      // A link to a group that isn't there: forget it and ask who this is instead.
      if (e.message === 'No such group') {
        try { localStorage.removeItem(GROUP_KEY); } catch (err) { /* nothing was kept */ }
        document.cookie = 'supper-group=; path=/; max-age=0';
        location.replace('/');
        return;
      }
      if (!loaded) {
        failed = 'They could not be loaded. Check your connection and reopen the page.';
        render();
      }
    }
  }

  function setMode(m) {
    mode = m;
    rebuildDeck();
    render();
  }

  $('modeAll').addEventListener('click', () => setMode('all'));
  $('modeHave').addEventListener('click', () => setMode('have'));
  $('chips').addEventListener('click', e => {
    const b = e.target.closest('[data-term]');
    if (!b) return;
    const t = b.dataset.term;
    have.has(t) ? have.delete(t) : have.add(t);
    rebuildDeck();
    render();
  });
  $('easyBtn').addEventListener('click', () => {
    easyOnly = !easyOnly;
    rebuildDeck();
    render();
  });
  document.querySelectorAll('[data-lexi]').forEach(b => b.addEventListener('click', () => {
    lexiOnly = !lexiOnly;
    rebuildDeck();
    render();
  }));
  $('showSeg').addEventListener('click', e => {
    const b = e.target.closest('[data-show]');
    if (!b) return;
    allShow = b.dataset.show;
    renderAll();
  });
  $('noBtn').addEventListener('click', () => fling(-1));
  $('yesBtn').addEventListener('click', () => fling(1));
  $('backBtn').addEventListener('click', () => {
    if (dragging || !passed.length) return;
    const id = passed.pop();
    const side = shortlist.includes(id) ? 1 : -1;
    if (side > 0) unlike(id, true);
    queue.unshift(id);
    shortlist = shortlist.filter(x => x !== id);
    saveShortlist();
    render();
    const card = $('stack').lastElementChild;
    if (canAnimate && card && card.classList.contains('card')) {
      card.animate([{ transform: 'translate(' + side * 120 + '%, 0) rotate(' + side * 20 + 'deg)' }, { transform: 'none' }], { duration: 380, easing: 'cubic-bezier(.34, 1.4, .64, 1)' });
    }
  });
  $('stack').addEventListener('click', e => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    if (b.dataset.act === 'again') { queue = deal(passed.filter(id => !shortlist.includes(id))); passed = []; renderStack(); }
    if (b.dataset.act === 'list') setTab('short');
    if (b.dataset.act === 'add') openAdder();
    if (b.dataset.act === 'retry') { failed = ''; render(); load(); }
  });
  // Ticks change only the line tapped, so the page doesn't redraw or jump while you cook.
  const tick = li => {
    const on = toggleTick(openId, li.dataset.tick);
    li.classList.toggle('done', on);
    li.setAttribute('aria-checked', String(on));
  };
  $('recipe').addEventListener('keydown', e => {
    const li = e.target.closest && e.target.closest('[data-tick]');
    if (li && openId && !e.target.closest('a, button') && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); tick(li); }
  });
  $('recipe').addEventListener('click', e => {
    const li = e.target.closest('[data-tick]');
    if (li && openId && !e.target.closest('a, button') && !String(getSelection()).trim()) { tick(li); return; }
    const b = e.target.closest('button');
    if (!b || !openId) return;
    if (b.dataset.act === 'close') { closeSheet($('recipe')); return; }
    if (b.dataset.act === 'edit') { openEditor(openId); return; }
    if (b.dataset.act === 'cook') {
      const id = openId;
      if (isMatch(id)) endMatch(id);
      else unlike(id);
      shortlist = shortlist.filter(x => x !== id);
      saveShortlist();
      write(id, { lastHad: today(), tried: true });
      count('cooked');
      cook = { id, at: Date.now(), by: tonightText(recipes.get(id)).by, timers: [] };
      if (who) api('/history', 'POST', { kind: 'chosen', id, who }).then(() => { historyAt = 0; }).catch(() => { /* the cooking still works */ });
      saveCook();
      renderRecipe();
      $('recipe').scrollTop = 0;
      buzz([14, 60, 20]);
      return;
    }
    // A tick on a timer's line shouldn't also tick the line, so timers are handled before ticks (see below).
    if (b.dataset.timer && cookingNow(openId)) {
      const [stepAt, timeAt] = b.dataset.timer.slice(1).split('t').map(Number);
      const found = timesIn(list(recipes.get(openId).steps)[stepAt])[timeAt];
      cook.timers = cook.timers.filter(t => t.key !== b.dataset.timer).concat({ key: b.dataset.timer, name: (found ? found.name : 'Timer') + ' · step ' + (stepAt + 1), ends: Date.now() + Number(b.dataset.minutes) * 60000 });
      saveCook();
      try { audio = audio || new (window.AudioContext || window.webkitAudioContext)(); audio.resume(); } catch (err) { /* sound is a bonus */ }
      renderRecipe();
      runTicker();
      toast(minutesText(Number(b.dataset.minutes)) + ' timer started');
      return;
    }
    if (b.dataset.stop && cook) {
      cook.timers = cook.timers.filter(t => t.key !== b.dataset.stop);
      saveCook();
      renderRecipe();
      return;
    }
    if (b.dataset.act === 'poster') { showTonight(openId); return; }
    if (b.dataset.act === 'finish') {
      const id = openId;
      cook = null;
      saveCook();
      delete cooking[id];
      try { localStorage.setItem(TICKS_COOKING_KEY, JSON.stringify(cooking)); } catch (err) { /* nothing to forget */ }
      renderRecipe();
      showTonight(id);
      return;
    }
    if (b.dataset.flag) {
      const on = b.dataset.val === '1';
      const said = b.dataset.flag === 'lexi' ? (on ? 'Marked kid friendly' : 'No longer marked kid friendly') : (on ? 'Marked tried and tested' : 'Marked to try');
      write(openId, { [b.dataset.flag]: on }, said);
      return;
    }
    if (b.dataset.toggle) { toggleShortlist(b.dataset.toggle, b); return; }
    if (b.dataset.rate) {
      const key = b.dataset.rate, val = Number(b.dataset.val);
      const name = SCORES.find(s => s[0] === key)[1];
      buzz(8);
      write(openId, { [key]: val }, name + ' saved as ' + val);
      $('recipe').querySelectorAll('[data-rate="' + key + '"].on').forEach((pip, i) => {
        pip.style.animationDelay = i * 35 + 'ms';
        pip.classList.add('pop');
      });
    }
  });
  document.querySelector('.tabs').addEventListener('click', e => {
    const b = e.target.closest('[data-tab]');
    if (b) setTab(b.dataset.tab);
  });
  $('search').addEventListener('input', renderAll);
  $('allList').addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.open) openRecipe(b.dataset.open, b.closest('.pick'));
    if (b.dataset.toggle) toggleShortlist(b.dataset.toggle, b);
  });
  $('panelShort').addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.open) openRecipe(b.dataset.open, b.closest('.pick'));
    if (b.dataset.toggle) toggleShortlist(b.dataset.toggle);
    if (b.dataset.view) {
      shortView = b.dataset.view;
      renderShortlist();
    }
    if (b.dataset.unmatch) {
      const id = b.dataset.unmatch;
      endMatch(id);
      shortlist = shortlist.filter(x => x !== id);
      saveShortlist();
      syncDeck();
      render();
      toast(recipes.get(id).title + ' is off your matches');
    }
    if ('changeWho' in b.dataset) showWho();
    if (b.dataset.people) {
      const id = b.dataset.people;
      servings[id] = Math.min(30, Math.max(1, peopleFor(id) + Number(b.dataset.change)));
      store(SERVINGS_KEY, servings);
      renderShortlist();
    }
    if (b.dataset.act === 'shop') go({ tab, shop: b.dataset.from === 'matches' ? 'matches' : true });
    if (b.dataset.act === 'clear') {
      shortlist.forEach(id => unlike(id));
      shortlist = [];
      passed = [];
      saveShortlist();
      rebuildDeck();
      render();
      toast('Shortlist cleared');
    }
  });
  $('shop').addEventListener('click', async e => {
    // Marks where you got to on a long list. This can't see the shop's real basket, so the button is there to correct it.
    const opened = e.target.closest('[data-find]');
    if (opened) {
      setBasket(opened.dataset.find, true);
      return;
    }
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.shop) {
      shop = b.dataset.shop;
      store(SHOP_KEY, shop);
      renderShop();
    }
    if (b.dataset.basket) setBasket(b.dataset.basket, !inBasket(b.dataset.basket));
    if (b.dataset.act === 'basket-clear') {
      ticks.basket = [];
      store(ticksKey(), ticks);
      renderShop();
    }
    if (b.dataset.act === 'close') closeSheet($('shop'));
    if (b.dataset.act === 'all') {
      const names = shopNames();
      ticks.names = names.every(n => ticks.names.includes(n)) ? [] : names;
      store(ticksKey(), ticks);
      renderShop();
    }
    if (b.dataset.act === 'ah') {
      const rows = shoppingList().aisles.flatMap(a => a.items), ticked = rows.filter(i => ticks.names.includes(i.name));
      const items = (ticked.length ? ticked : rows).map(i => Shopping.dutchName(i.name) + (i.amount === 'some' ? '' : ' (' + i.amount + ')'));
      b.disabled = true;
      try {
        await api('/ah/send', 'POST', { items }, 20000);
        toast('Sent ' + items.length + (items.length === 1 ? ' item' : ' items') + ' to your AH list');
      } catch (err) {
        toast(err.message === 'login' ? 'The AH login has run out. Log in again on your computer.' : 'AH did not take that. Try again, or use the AH links.');
      }
      b.disabled = false;
    }
    if (b.dataset.act === 'ah-off') {
      await api('/ah', 'DELETE').then(() => {
        ahConnected = false;
        renderShop();
        toast('AH is disconnected');
      }, () => toast('That did not work. Try again.'));
    }
    if (b.dataset.act === 'whatsapp') sendToWhatsApp();
    if (b.dataset.act === 'pdf') downloadPdf();
    if (b.dataset.act === 'share') {
      const text = listText();
      if (navigator.share) {
        try {
          await navigator.share({ title: 'Shopping list', text });
          return;
        } catch (err) {
          if (err && err.name === 'AbortError') return;
        }
      }
      try {
        await navigator.clipboard.writeText(text);
        toast('Shopping list copied');
      } catch (err) {
        toast('That could not be copied on this phone.');
      }
    }
  });
  $('shop').addEventListener('change', e => {
    const name = e.target.dataset.tick;
    if (!name) return;
    ticks.names = e.target.checked ? ticks.names.concat(name) : ticks.names.filter(n => n !== name);
    store(ticksKey(), ticks);
    renderShopCount();
  });
  addEventListener('popstate', e => {
    hideTonight();
    applyNav(e.state);
  });
  const formScores = { ease: 0, speed: 0, love: 0 };
  let importedSource = '';
  // undefined: leave the dish's photo alone. null: remove it. Otherwise the new photo, sent when the dish is saved.
  let formPhoto;
  function showFormPhoto(src) {
    $('photoPreview').hidden = $('photoRemove').hidden = !src;
    if (src) $('photoPreview').src = src;
    else $('photoPreview').removeAttribute('src');
    $('photoPick').textContent = src ? 'Change photo' : 'Add a photo';
  }
  const PHOTO_WIDTH = 800, THUMB_SIZE = 120;
  function photoCanvas(source, x, y, w, h, width, height) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(source, x, y, w, h, 0, 0, width, height);
    return canvas.toDataURL('image/jpeg', .74);
  }
  // Every photo goes through here, whichever way it arrived: a card-sized one, and a small square for the lists.
  function useFormPhoto(source, box) {
    const { x, y, w, h } = box || { x: 0, y: 0, w: source.width, h: source.height };
    const scale = Math.min(1, PHOTO_WIDTH / w), side = Math.min(w, h);
    const big = photoCanvas(source, x, y, w, h, Math.round(w * scale), Math.round(h * scale));
    const thumb = photoCanvas(source, x + (w - side) / 2, y + (h - side) / 2, side, side, THUMB_SIZE, THUMB_SIZE);
    formPhoto = { big: big.split(',')[1], thumb: thumb.split(',')[1] };
    showFormPhoto(big);
  }
  // A dish is saved first, so its photo has an id to go under. Keeps the dish even if the photo fails.
  async function saveFormPhoto(id) {
    if (formPhoto === undefined) return true;
    try {
      const photo = formPhoto ? (await api('/photos/' + id, 'PUT', formPhoto, 30000)).photo : '';
      if (!formPhoto) await api('/photos/' + id, 'DELETE');
      writes++;
      recipes.get(id).photo = photo;
      return true;
    } catch (err) {
      return false;
    }
  }
  const renderFormRate = () => { $('formRate').innerHTML = rateRows(s => formScores[s], 'data-form-rate'); };
  function fillForm(d) {
    $('f-link').value = d.sourceUrl || '';
    $('f-title').value = d.title || '';
    $('f-shop').value = list(d.shopping).join('\n');
    $('f-steps').value = list(d.steps).join('\n');
    $('f-tried').checked = !!d.tried;
    $('f-lexi').checked = !!d.lexi;
    $('f-blurb').value = d.blurb || '';
    $('f-minutes').value = d.minutes || '';
    $('f-hands').value = d.handsOn || '';
    $('f-serves').value = d.serves == null ? '' : d.serves;
    $('f-kit').value = d.kit || '';
    $('f-tags').value = list(d.tags).join(', ');
    $('f-note').value = d.note || '';
    SCORES.forEach(s => { formScores[s[0]] = d[s[0]] || 0; });
    renderFormRate();
    importedSource = '';
    formPhoto = undefined;
    showFormPhoto(d.photo);
    formRun++;
  }
  const readsLeft = () => (reads && who ? Math.max(0, reads.limit - (reads.used[who] || 0)) : null);
  function showReadsLeft() {
    const left = readsLeft();
    $('readsLeft').hidden = left === null || !!editId;
    if (left !== null) $('readsLeft').textContent = left ? left + ' of ' + reads.limit + ' AI reads left this month. Links with recipe data on the page are free.'
      : "You've used your " + reads.limit + ' AI reads this month. Links with recipe data on the page still work.';
  }
  const usedUpNote = () => "You've used your " + (reads ? reads.limit : 5) + ' AI reads this month. Type the recipe in instead, or try again next month.';
  function openAdder() {
    fillForm({});
    $('moreDetails').open = false;
    $('linkNote').textContent = 'Paste a link or pick a PDF or photo, and the recipe fills in below for you to check. Or just type it in.';
    go({ tab, add: true });
    showReadsLeft();
    $('f-link').focus({ preventScroll: true });
  }
  function openEditor(id) {
    fillForm(recipes.get(id));
    $('moreDetails').open = true;
    go({ tab, recipe: id, add: true, edit: id });
  }
  // People share messages such as "Check out this recipe: https://...", so take just the link.
  function linkIn(value) {
    const m = /https?:\/\/[^\s<>"]+/.exec(value);
    if (!m) return '';
    try {
      const url = new URL(m[0].replace(/[.,;:!?)]+$/, ''));
      [...url.searchParams.keys()].filter(k => /^(utm_|playsinline$)/.test(k)).forEach(k => url.searchParams.delete(k));
      return url.href;
    } catch (e) {
      return '';
    }
  }
  function fillFromRecipe(recipe) {
    $('f-title').value = recipe.title;
    $('f-shop').value = list(recipe.shopping).join('\n');
    $('f-steps').value = list(recipe.steps).join('\n');
    $('f-blurb').value = recipe.blurb || '';
    $('f-minutes').value = recipe.minutes || '';
    $('f-serves').value = recipe.serves || '';
    $('f-hands').value = recipe.handsOn || '';
    $('f-kit').value = recipe.kit || '';
    $('f-tags').value = list(recipe.tags).join(', ');
    importedSource = recipe.source || '';
    $('linkNote').textContent = 'Got it. Check it below, change anything you like, then save.';
  }
  // Only ever fills an empty spot, so it can't replace a photo someone chose. A dish simply goes without if this fails.
  async function photoFromLink(recipe, run) {
    if (!recipe.photoUrl || !$('photoPreview').hidden) return;
    try {
      const res = await fetch('/api/dishes/fetch-photo', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ url: recipe.photoUrl }), signal: AbortSignal.timeout(15000) });
      if (!res.ok) return;
      const image = await createImageBitmap(await res.blob());
      if (run === formRun) useFormPhoto(image);
    } catch (err) { /* no photo, then */ }
  }
  const PDF_JS = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/';
  // Where the pictures sit on a PDF page. PDFs say this by moving a drawing position around, so follow it.
  async function picturesOn(pdfjs, page, viewport) {
    const { OPS, Util } = pdfjs, { fnArray, argsArray } = await page.getOperatorList(), stack = [], found = [];
    let at = [1, 0, 0, 1, 0, 0];
    const IMAGES = [OPS.paintImageXObject, OPS.paintInlineImageXObject, OPS.paintImageXObjectRepeat];
    fnArray.forEach((op, i) => {
      if (op === OPS.save) stack.push(at);
      else if (op === OPS.restore) at = stack.pop() || at;
      else if (op === OPS.transform) at = Util.transform(at, argsArray[i]);
      else if (op === OPS.paintFormXObjectBegin) {
        stack.push(at);
        if (argsArray[i][0]) at = Util.transform(at, argsArray[i][0]);
      } else if (op === OPS.paintFormXObjectEnd) at = stack.pop() || at;
      else if (IMAGES.includes(op)) {
        const [x0, y0, x1, y1] = viewport.convertToViewportRectangle([at[4], at[5], at[4] + at[0] + at[2], at[5] + at[1] + at[3]]);
        found.push({ x: Math.min(x0, x1), y: Math.min(y0, y1), w: Math.abs(x1 - x0), h: Math.abs(y1 - y0) });
      }
    });
    return found;
  }
  // The model's box is close, not exact. If it lands on a real picture in the PDF, use that picture's own edges.
  function snapToPicture(box, pictures, canvas) {
    const overlap = p => Math.max(0, Math.min(box.x + box.w, p.x + p.w) - Math.max(box.x, p.x)) * Math.max(0, Math.min(box.y + box.h, p.y + p.h) - Math.max(box.y, p.y));
    // A picture far bigger than the box may be cropped by the PDF, which this can't see, and a page-sized one is a scan.
    const notAScan = pictures.filter(p => p.w * p.h < canvas.width * canvas.height * .8 && p.w * p.h < box.w * box.h * 1.6);
    const best = notAScan.reduce((a, p) => (!a || overlap(p) > overlap(a) ? p : a), null);
    return best && overlap(best) > box.w * box.h * .4 ? best : box;
  }
  const boxOn = (recipe, width, height) => {
    const [left, top, right, bottom] = list(recipe.photoBox);
    const fine = [left, top, right, bottom].every(n => Number.isFinite(n) && n >= 0 && n <= 1) && (right - left) * (bottom - top) > .04;
    return fine ? { x: left * width, y: top * height, w: (right - left) * width, h: (bottom - top) * height } : null;
  };
  // The file is still here on the page, so the photo is cut from it here. The model only says where it is.
  async function photoFromFile(recipe, file, run) {
    if (!recipe.photoPage || !$('photoPreview').hidden) return;
    try {
      if (file.type !== 'application/pdf') {
        const image = await createImageBitmap(file), box = boxOn(recipe, image.width, image.height);
        if (box && run === formRun) useFormPhoto(image, box);
        return;
      }
      const pdfjs = await import(PDF_JS + 'pdf.min.mjs');
      pdfjs.GlobalWorkerOptions.workerSrc = PDF_JS + 'pdf.worker.min.mjs';
      const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
      const page = await pdf.getPage(recipe.photoPage);
      const start = page.getViewport({ scale: 1 }), viewport = page.getViewport({ scale: 1600 / start.width });
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(viewport.width);
      canvas.height = Math.round(viewport.height);
      await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
      const box = boxOn(recipe, canvas.width, canvas.height);
      if (box && run === formRun) useFormPhoto(canvas, snapToPicture(box, await picturesOn(pdfjs, page, viewport), canvas));
      pdf.destroy();
    } catch (err) { /* no photo, then */ }
  }
  // No one can say how far along the model is, so the bar just creeps towards the end until the answer arrives.
  const busyReading = on => {
    $('getRecipe').disabled = $('getFile').disabled = on;
    const bar = $('readBar');
    bar.hidden = !on;
    bar.classList.remove('go');
    if (on) {
      void bar.offsetWidth;
      bar.classList.add('go');
    }
  };
  // Hands the work to the AI reader, then asks every two seconds how it went. Returns null if the form moved on.
  async function readWithAI(payload, run) {
    if (readsLeft() === 0) throw new Error('used-up');
    let id;
    try {
      ({ id } = await api('/read', 'POST', { ...payload, who }, 90000));
    } catch (err) {
      if (err.message.startsWith("You've used")) { if (reads && who) reads.used[who] = reads.limit; showReadsLeft(); throw new Error('used-up'); }
      throw err;
    }
    const started = await fetch('/api/read-recipe', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id }) });
    if (!started.ok) throw new Error('Could not start reading');
    // The server counts it now that it has started, so show one fewer without waiting for the next load.
    if (reads && who) reads.used[who] = (reads.used[who] || 0) + 1;
    showReadsLeft();
    for (let i = 0; i < 90; i++) {
      await new Promise(done => setTimeout(done, 2000));
      if (run !== formRun) return null;
      const job = await api('/read/' + id).catch(() => null); // a dropped connection is not a failed reading
      if (job && job.status === 'done') return job.recipe;
      if (job && job.status !== 'reading') throw new Error(job.status);
    }
    throw new Error('Took too long');
  }
  $('getRecipe').addEventListener('click', async () => {
    const url = linkIn($('f-link').value);
    if (!url) { $('linkNote').textContent = 'Paste a full link first, starting with https://'; return; }
    $('f-link').value = url;
    busyReading(true);
    $('linkNote').textContent = 'Reading the recipe.';
    const run = formRun;
    try {
      let recipe;
      try {
        recipe = (await api('/import', 'POST', { url })).recipe;
      } catch (err) {
        // The form may have been closed and reopened for another dish while the site was answering.
        if (run !== formRun) return;
        $('linkNote').textContent = 'That page needs the AI reader. This can take a minute.';
        recipe = await readWithAI({ url }, run);
      }
      if (run === formRun && recipe) {
        fillFromRecipe(recipe);
        await photoFromLink(recipe, run);
      }
    } catch (err) {
      if (run === formRun) $('linkNote').textContent = err.message === 'used-up' ? usedUpNote() : 'That site would not share its recipe. Type in the name and whatever you want to keep. The link is saved with it.';
    } finally {
      busyReading(false);
    }
  });
  const MAX_FILE_BYTES = 4000000, MAX_PHOTO_SIDE = 2000;
  const asBase64 = file => new Promise((done, fail) => {
    const reader = new FileReader();
    reader.onload = () => done(String(reader.result).split(',')[1]);
    reader.onerror = () => fail(reader.error);
    reader.readAsDataURL(file);
  });
  // Phone photos are far bigger than a recipe needs.
  async function shrinkPhoto(file) {
    const image = await createImageBitmap(file);
    const scale = Math.min(1, MAX_PHOTO_SIDE / Math.max(image.width, image.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(image.width * scale);
    canvas.height = Math.round(image.height * scale);
    canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', .85).split(',')[1];
  }
  $('getFile').addEventListener('click', () => $('f-file').click());
  $('f-file').addEventListener('change', async e => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    const isPdf = file.type === 'application/pdf';
    if (isPdf && file.size > MAX_FILE_BYTES) { $('linkNote').textContent = 'That PDF is over 4 MB, too big to read here. A photo of the recipe would work.'; return; }
    busyReading(true);
    $('linkNote').textContent = 'Reading the recipe with AI. This can take a minute.';
    const run = formRun;
    try {
      const recipe = await readWithAI(isPdf ? { type: file.type, data: await asBase64(file) } : { type: 'image/jpeg', data: await shrinkPhoto(file) }, run);
      if (run === formRun && recipe) {
        fillFromRecipe(recipe);
        await photoFromFile(recipe, file, run);
      }
    } catch (err) {
      if (run !== formRun) return;
      $('linkNote').textContent = err.message === 'used-up' ? usedUpNote() : err.message === 'none' ? 'No recipe found in that file. Type in whatever you want to keep.'
        : err.message === 'AI reading is not switched on' ? 'AI reading is not switched on yet.' : 'That file could not be read. Try again, or type it in.';
    } finally {
      busyReading(false);
    }
  });
  $('photoPick').addEventListener('click', () => $('f-photo').click());
  $('f-photo').addEventListener('change', async e => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    try {
      useFormPhoto(await createImageBitmap(file));
    } catch (err) {
      toast('That photo could not be read. Try a different one.');
    }
  });
  $('photoRemove').addEventListener('click', () => {
    formPhoto = null;
    showFormPhoto('');
  });
  $('formRate').addEventListener('click', e => {
    const b = e.target.closest('[data-form-rate]');
    if (!b) return;
    const key = b.dataset.formRate, val = Number(b.dataset.val);
    formScores[key] = formScores[key] === val ? 0 : val;
    renderFormRate();
  });
  $('addBtn').addEventListener('click', openAdder);
  $('addClose').addEventListener('click', () => closeSheet($('adder')));
  const csv = v => v.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  // A first guess from what we know, using the same scoring as the saved dishes. Pans aren't known yet.
  const startingEase = (hands, count) => (hands || count ? Math.max(1, 5 - (hands > 40 ? 2 : hands > 20 ? 1 : 0) - (count > 10 ? 1 : 0)) : 0);
  const startingSpeed = m => (!m ? 0 : m <= 20 ? 5 : m <= 30 ? 4 : m <= 45 ? 3 : m <= 75 ? 2 : 1);
  const lines = v => v.split('\n').map(s => s.trim()).filter(Boolean);
  $('addForm').addEventListener('submit', async e => {
    e.preventDefault();
    const title = $('f-title').value.trim();
    if (!title || sending) return;
    const fields = {
      title, blurb: $('f-blurb').value.trim(), minutes: Number($('f-minutes').value) || null,
      handsOn: Number($('f-hands').value) || null, serves: $('f-serves').value.trim(), kit: $('f-kit').value.trim(),
      sourceUrl: linkIn($('f-link').value), tags: csv($('f-tags').value), note: $('f-note').value.trim(),
      shopping: lines($('f-shop').value), steps: lines($('f-steps').value),
      tried: $('f-tried').checked, lexi: $('f-lexi').checked, ...formScores
    };
    sending = true;
    $('saveBtn').disabled = true;
    try {
      if (editId) {
        // Only what changed is sent, so the rest of the dish keeps following data/recipes.json. The form stays open if the save fails.
        const id = editId, dish = recipes.get(id);
        const plain = v => (v == null || v === '' || v === false || v === 0 ? null : Array.isArray(v) ? (v.length ? v.map(String) : null) : typeof v === 'boolean' ? v : String(v));
        const changed = Object.fromEntries(Object.entries(fields).filter(([k, v]) => JSON.stringify(plain(v)) !== JSON.stringify(plain(dish[k]))));
        const saved = !Object.keys(changed).length || await write(id, changed, 'Saved.');
        if (!saved) return;
        if (!await saveFormPhoto(id)) toast('Saved, but the photo did not. Try it again.');
        render();
        if (editId === id && !$('adder').hidden) history.back();
        return;
      }
      if (!fields.ease) fields.ease = startingEase(fields.handsOn, fields.shopping.length);
      if (!fields.speed) fields.speed = startingSpeed(fields.minutes);
      const { id, dish } = await api('', 'POST', { ...fields, source: importedSource });
      writes++;
      recipes.set(id, dish);
      const photoSaved = await saveFormPhoto(id);
      syncDeck();
      render();
      if (history.state && history.state.add && !history.state.edit) history.back();
      toast(photoSaved ? title + ' is in the deck.' : title + ' is in the deck, but the photo did not save.');
    } catch (err) {
      toast('That did not save. Try again.');
    } finally {
      sending = false;
      $('saveBtn').disabled = false;
    }
  });
  addEventListener('keydown', e => {
    if (!$('tonight').hidden) {
      if (e.key === 'Escape') hideTonight();
      return;
    }
    const sheet = topSheet();
    if (sheet) {
      if (e.key === 'Escape') closeSheet(sheet);
      return;
    }
    if (tab !== 'swipe' || e.target.matches('input, textarea')) return;
    if (e.key === 'ArrowLeft') fling(-1);
    if (e.key === 'ArrowRight') fling(1);
  });

  history.replaceState(null, '');
  applyNav(null);
  render();

  if (group) load();
  $('who').addEventListener('click', e => {
    const b = e.target.closest('[data-who]');
    if (!b) return;
    // Picking someone in another group moves the phone to that group, which starts the page afresh.
    if (b.dataset.group !== group) {
      joinGroup(b.dataset.group);
      store(keyed('supper-swipe-who', b.dataset.group), b.dataset.who);
      location.replace('/?g=' + encodeURIComponent(b.dataset.group));
      return;
    }
    who = b.dataset.who;
    store(WHO_KEY, who);
    $('who').hidden = true;
    $('app').inert = !!(openId || shopOpen || !$('adder').hidden);
    shortlist.forEach(id => like(id, true));
    render();
    announceMatches();
  });
  if (!group) showWho();
  // The AH login helper hands its code over here, in the browser that holds the site password.
  const ahCode = /^#ah-code=([^&]+)/.exec(location.hash);
  if (ahCode) {
    history.replaceState(history.state, '', location.pathname);
    api('/ah/connect', 'POST', { code: decodeURIComponent(ahCode[1]) }).then(() => {
      ahConnected = true;
      renderShop();
      toast('AH is connected');
    }, () => {
      toast('AH could not be connected. Run the login again.');
      load();
    });
  }
  setInterval(() => { if (group && !document.hidden) load(); }, 60000);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) sendUsage(true);
    else if (group) load();
  });
  addEventListener('pagehide', () => sendUsage(true));
})();
