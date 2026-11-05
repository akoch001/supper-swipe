(function () {
  const GROUPS = {
    chicken: 'chicken', turkey: 'chicken',
    beef: 'meat', steak: 'meat', mince: 'meat', lamb: 'meat',
    pork: 'pork', bacon: 'pork', sausages: 'pork', chorizo: 'pork', ham: 'pork', 'parma ham': 'pork',
    salmon: 'fish', cod: 'fish', tuna: 'fish', prawns: 'fish', hake: 'fish', haddock: 'fish', scallops: 'fish'
  };
  const SCORES = [['ease', 'Ease'], ['speed', 'Speed'], ['love', 'How much we like it']];
  const $ = id => document.getElementById(id);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const recipes = new Map();
  let saving = 0, lastLoaded = '';
  const SHORTLIST_KEY = 'supper-swipe-shortlist';
  let shortlist = [];
  try { shortlist = JSON.parse(localStorage.getItem(SHORTLIST_KEY)) || []; } catch (e) { shortlist = []; }
  const saveShortlist = () => {
    try { localStorage.setItem(SHORTLIST_KEY, JSON.stringify(shortlist)); } catch (e) { /* the list still works until the page closes */ }
  };
  const SERVINGS_KEY = 'supper-swipe-servings', TICKS_KEY = 'supper-swipe-ticks';
  const readStored = (key, fallback) => {
    try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch (e) { return fallback; }
  };
  const store = (key, value) => {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* kept until the page closes */ }
  };
  const servings = readStored(SERVINGS_KEY, {});
  let ticks = readStored(TICKS_KEY, { list: '', names: [] });
  let queue = [], passed = [];
  let mode = 'all', easyOnly = false, lexiOnly = false, allShow = 'all';
  const have = new Set();
  let openId = null, editId = null, tab = 'swipe', shopOpen = false, loaded = false, failed = '', dragging = false, busy = false;

  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const list = v => Array.isArray(v) ? v : [];
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
  const matches = r => {
    if (easyOnly && !((r.ease || 0) >= 3)) return false;
    if (lexiOnly && !r.lexi) return false;
    if (list(r.tags).includes('dessert') && !(mode === 'have' && have.has('dessert'))) return false;
    return mode === 'all' || [...have].every(t => terms(r).includes(t));
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
  const dots = n => '<span class="dots" aria-label="' + (n || 0) + ' out of 5">' + [1, 2, 3, 4, 5].map(i => '<i class="' + (i <= n ? 'on' : '') + '"></i>').join('') + '</span>';

  function toast(msg) {
    const t = $('toast');
    t.textContent = msg; t.hidden = false;
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => { t.hidden = true; }, 2600);
  }

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
    const r = recipes.get(id);
    return '<article class="card ' + colourOf(r) + '" data-id="' + esc(id) + '">' +
      '<span class="stamp yes">Shortlist</span><span class="stamp no">Not tonight</span>' +
      '<div class="eyebrow"><span>' + esc(r.tried ? mains(r).slice(0, 3).join(' · ') : 'Try something new') + '</span>' + (r.lexi ? '<span class="badge">Lexi proof</span>' : '') + (r.sample ? '<span class="badge">Sample</span>' : '') + '</div>' +
      '<h2>' + esc(r.title) + '</h2>' +
      (r.blurb ? '<p class="blurb">' + esc(r.blurb) + '</p>' : '') +
      '<div class="meta">' + (r.minutes ? '<span>' + esc(r.minutes) + ' min total</span>' : '') + (r.handsOn ? '<span>' + esc(r.handsOn) + ' min hands-on</span>' : '') + '<span>' + esc(r.needsRecipe ? 'Recipe on the original site' : lastHad(r)) + '</span></div>' +
      '<div class="scores">' + SCORES.map(s => '<div class="score"><span>' + s[1] + '</span>' + dots(r[s[0]] || 0) + '</div>').join('') + '</div>' +
      '</article>';
  }

  function renderStack() {
    if (dragging || busy) return;
    const stack = $('stack');
    let empty = '';
    if (!loaded && !failed) empty = '<div class="empty"><h2>Shuffling the deck</h2><p>Fetching your dishes.</p></div>';
    else if (failed) empty = '<div class="empty"><h2>Your dishes are out of reach</h2><p>' + esc(failed) + '</p></div>';
    else if (!recipes.size) empty = '<div class="empty"><h2>No dishes yet</h2><p>Add your first favourite and it will appear here as a card.</p><button type="button" class="primary" data-act="add">Add a dish</button></div>';
    else if (!queue.length && shortlist.length) {
      const more = passed.some(id => !shortlist.includes(id));
      empty = '<div class="empty"><h2>Time to choose</h2><p>You have ' + shortlist.length + ' on your shortlist.</p><button type="button" class="primary" data-act="list">See your shortlist</button>' + (more ? '<button type="button" class="ghost" data-act="again">Swipe the rest again</button>' : '') + '</div>';
    }
    else if (!queue.length && !passed.length) empty = '<div class="empty"><h2>Nothing fits all of that</h2><p>Turn a filter off to see more dishes.</p></div>';
    else if (!queue.length) empty = '<div class="empty"><h2>That was the whole deck</h2><p>Nothing grabbed you? Shuffle and go again.</p><button type="button" class="primary" data-act="again">Go again</button></div>';
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
      if (mode === 'have' && !have.size) label = 'Tap what you have. Dishes must use everything you tap.';
      else if (mode === 'have') label = n + ' of ' + recipes.size + ' dishes use ' + [...have].join(' and ');
      else label = n + (n === 1 ? ' dish' : ' dishes') + ' in the deck';
    }
    $('count').textContent = label;
    $('easyBtn').setAttribute('aria-pressed', String(easyOnly));
    document.querySelectorAll('[data-lexi]').forEach(b => b.setAttribute('aria-pressed', String(lexiOnly)));
  }

  const rateRows = (valueOf, attr) => SCORES.map(s => '<div class="rate-row"><span>' + s[1] + '</span><div class="pips">' +
    [1, 2, 3, 4, 5].map(i => '<button type="button" ' + attr + '="' + s[0] + '" data-val="' + i + '" class="' + (i <= valueOf(s[0]) ? 'on' : '') + '" aria-label="' + s[1] + ' ' + i + ' out of 5">' + i + '</button>').join('') +
    '</div></div>').join('');

  function renderRecipe() {
    const box = $('recipe');
    const r = openId && recipes.get(openId);
    box.hidden = !r;
    if (!r) return;
    const src = /^https?:\/\//.test(r.sourceUrl || '') ? '<a href="' + esc(r.sourceUrl) + '" target="_blank" rel="noopener">Original recipe' + (r.source ? ' from ' + esc(r.source) : '') + '</a>' : esc(r.source ? 'From: ' + r.source : '');
    const takes = [
      r.kit ? 'Washing up: ' + r.kit : '',
      list(r.shopping).length ? list(r.shopping).length + ' ingredients' : '',
      r.handsOn ? r.handsOn + ' minutes hands-on' : '',
      list(r.hard).length ? 'Hard to find: ' + list(r.hard).join(', ') : ''
    ].filter(Boolean);
    box.innerHTML = '<div class="sheet-in">' +
      '<div class="sheet-actions"><button type="button" class="ghost" data-act="close">Back</button><button type="button" class="ghost" data-act="edit">Edit</button></div>' +
      '<div><h2>' + esc(r.title) + '</h2><p class="sub">' +
        [r.sample ? 'Sample dish' : '', r.minutes ? r.minutes + ' min' : '', r.serves ? 'Serves ' + r.serves : '', lastHad(r)].filter(Boolean).map(esc).join(' · ') + '</p></div>' +
      '<div class="status"><div class="seg">' +
        '<button type="button" data-flag="tried" data-val="1" aria-pressed="' + !!r.tried + '">Tried and tested</button>' +
        '<button type="button" data-flag="tried" data-val="0" aria-pressed="' + !r.tried + '">To try</button></div>' +
        '<button type="button" class="chip" data-flag="lexi" data-val="' + (r.lexi ? 0 : 1) + '" aria-pressed="' + !!r.lexi + '">Lexi proof</button></div>' +
      '<section><h3>Rate it</h3><div class="rate">' + rateRows(s => r[s] || 0, 'data-rate') + '</div></section>' +
      (r.note ? '<p class="note">' + esc(r.note) + '</p>' : '') +
      (r.needsRecipe ? '<p class="note">This recipe has not been copied in yet. Use the link below to see it.</p>' : '') +
      (takes.length ? '<section><h3>What it takes</h3><ul>' + takes.map(x => '<li>' + esc(x) + '</li>').join('') + '</ul></section>' : '') +
      (list(r.shopping).length ? '<section><h3>Ingredients</h3><ul>' + list(r.shopping).map(x => '<li>' + esc(x) + '</li>').join('') + '</ul></section>' : '') +
      (list(r.steps).length ? '<section><h3>Method</h3><ol>' + list(r.steps).map(x => '<li>' + esc(x) + '</li>').join('') + '</ol></section>' : '') +
      (src ? '<p>' + src + '</p>' : '') +
      '<div class="sheet-actions"><button type="button" class="primary" data-act="cook">We\'re cooking this tonight</button>' +
      '<button type="button" class="ghost" data-toggle="' + esc(openId) + '">' + (shortlist.includes(openId) ? 'Remove from shortlist' : 'Add to shortlist') + '</button></div>' +
      '</div>';
  }

  const factsOf = r => [r.tried ? '' : 'To try', r.lexi ? 'Lexi proof' : '', r.minutes ? r.minutes + ' min' : '', r.ease ? 'Ease ' + r.ease : '', r.love ? 'Liked ' + r.love + '/5' : ''].filter(Boolean).join(' · ');
  const peopleFor = id => servings[id] || Shopping.servesOf(recipes.get(id));

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
      return '<div class="pick ' + colourOf(r) + '"><button type="button" class="pick-open" data-open="' + esc(id) + '"><strong>' + esc(r.title) + '</strong><span>' + esc(factsOf(r)) + '</span></button>' +
        '<button type="button" class="pick-toggle" data-toggle="' + esc(id) + '" aria-pressed="' + on + '">' + (on ? 'On shortlist' : 'Add to shortlist') + '</button></div>';
    }).join('') : (loaded ? '<p class="empty-note">No dishes match that.</p>' : '');
  }

  function renderShortlist() {
    $('shortTab').textContent = shortlist.length ? 'Shortlist (' + shortlist.length + ')' : 'Shortlist';
    $('panelShort').innerHTML = '<h2 class="panel-title">Your shortlist</h2>' + (shortlist.length
      ? '<p class="panel-note">Pick tonight\'s dinner, or plan a few nights and create one shopping list.</p>' +
        '<div class="picks">' + shortlist.map(id => {
          const r = recipes.get(id);
          if (!r) return '';
          const n = peopleFor(id);
          return '<div class="pick ' + colourOf(r) + '"><button type="button" class="pick-open" data-open="' + esc(id) + '"><strong>' + esc(r.title) + '</strong><span>' + esc(factsOf(r)) + '</span></button>' +
            '<button type="button" class="pick-remove" data-toggle="' + esc(id) + '" aria-label="Remove ' + esc(r.title) + ' from the shortlist">Remove</button>' +
            '<div class="people"><span>Cooking for</span><span class="stepper"><button type="button" data-people="' + esc(id) + '" data-change="-1" aria-label="Fewer people">−</button><span>' + n + '</span><button type="button" data-people="' + esc(id) + '" data-change="1" aria-label="More people">+</button></span></div></div>';
        }).join('') + '</div>' +
        '<div class="sheet-actions"><button type="button" class="primary" data-act="shop">Create shopping list</button><button type="button" class="ghost" data-act="clear">Clear shortlist</button></div>'
      : '<p class="empty-note">Nothing here yet. Swipe right on a dish, or add one from All dishes.</p>');
  }

  function shoppingList() {
    const dishes = shortlist.filter(id => recipes.has(id)).map(id => {
      const r = recipes.get(id);
      return { title: r.title, shopping: list(r.shopping), factor: peopleFor(id) / Shopping.servesOf(r) };
    });
    return { dishes, aisles: Shopping.build(dishes) };
  }

  function renderShop() {
    const box = $('shop');
    box.hidden = !shopOpen;
    if (!shopOpen) return;
    const { dishes, aisles } = shoppingList();
    const listId = shortlist.map(id => id + ':' + peopleFor(id)).sort().join(',');
    if (ticks.list !== listId) {
      ticks = { list: listId, names: [] };
      store(TICKS_KEY, ticks);
    }
    box.innerHTML = '<div class="sheet-in">' +
      '<div class="sheet-actions"><button type="button" class="ghost" data-act="close">Back</button><button type="button" class="primary" data-act="share">Share list</button></div>' +
      '<div><h2>Shopping list</h2><p class="sub">For ' + dishes.length + (dishes.length === 1 ? ' dish: ' : ' dishes: ') + esc(dishes.map(d => d.title).join(', ')) + '</p></div>' +
      '<p class="note">Amounts are added up from the recipes, so round up to what the shop sells. Cupboard staples are listed too, so tick off what you already have.</p>' +
      aisles.map(a => '<section class="aisle"><h3>' + esc(a.label) + '</h3>' + a.items.map(i =>
        '<label class="buy"><input type="checkbox" data-tick="' + esc(i.name) + '"' + (ticks.names.includes(i.name) ? ' checked' : '') + '>' +
        '<span class="buy-text"><span class="buy-line"><span>' + esc(i.name) + (i.optional ? ' (optional)' : '') + '</span><span class="buy-amount">' + esc(i.amount === 'some' ? '' : i.amount) + '</span></span>' +
        '<span class="buy-uses">' + esc(i.uses.map(u => u.dish + ': ' + u.amount + (u.optional ? ', optional' : '')).join('; ')) + '</span></span></label>').join('') + '</section>').join('') +
      '</div>';
  }

  function render() { renderFilter(); renderStack(); renderAll(); renderShortlist(); renderRecipe(); renderShop(); }

  function toggleShortlist(id) {
    const on = shortlist.includes(id);
    shortlist = on ? shortlist.filter(x => x !== id) : shortlist.concat(id);
    passed = passed.filter(x => x !== id);
    saveShortlist();
    syncDeck();
    render();
    toast(recipes.get(id).title + (on ? ' is off your shortlist' : ' is on your shortlist'));
  }

  // Every sheet is a browser history entry, so the phone's back gesture closes it instead of leaving the app.
  function applyNav(state) {
    const s = state || {};
    openId = s.recipe || null;
    editId = s.edit || null;
    tab = s.tab || 'swipe';
    $('formTitle').textContent = editId ? 'Edit dish' : 'Add a dish';
    $('saveBtn').textContent = editId ? 'Save changes' : 'Save dish';
    $('getRecipe').hidden = !!editId;
    $('linkNote').hidden = !!editId;
    shopOpen = !!s.shop;
    $('adder').hidden = !s.add;
    $('panelSwipe').hidden = tab !== 'swipe';
    $('panelAll').hidden = tab !== 'all';
    $('panelShort').hidden = tab !== 'short';
    document.querySelectorAll('.tabs button').forEach(b => {
      if (b.dataset.tab === tab) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
    });
    renderRecipe();
    renderShop();
    if (openId) $('recipe').scrollTop = 0;
    if (shopOpen) $('shop').scrollTop = 0;
  }
  function go(state) {
    history.pushState(state, '');
    applyNav(state);
  }
  const openRecipe = id => go({ tab, recipe: id });
  const setTab = t => {
    if (t !== tab) {
      go({ tab: t });
      scrollTo(0, 0);
    }
  };

  function setStamps(card, dx) {
    card.querySelector('.stamp.yes').style.opacity = Math.max(0, Math.min(1, dx / 90));
    card.querySelector('.stamp.no').style.opacity = Math.max(0, Math.min(1, -dx / 90));
  }

  function fling(dir) {
    if (busy || !queue.length) return;
    const card = $('stack').lastElementChild;
    busy = true;
    const ms = reduced ? 0 : 240;
    if (card && card.classList.contains('card')) {
      setStamps(card, dir * 90);
      card.style.transition = 'transform ' + ms + 'ms ease-in';
      card.style.transform = 'translateX(' + dir * (innerWidth + 240) + 'px) rotate(' + dir * 18 + 'deg)';
    }
    setTimeout(() => {
      busy = false;
      const id = queue.shift();
      passed.push(id);
      if (dir > 0 && !shortlist.includes(id)) {
        shortlist.push(id);
        saveShortlist();
        toast(recipes.get(id).title + ' is on your shortlist');
      }
      render();
      if (dir > 0 && !queue.length) setTab('short');
    }, ms);
  }

  function bindTop(card) {
    if (!card || !card.classList.contains('card')) return;
    let startX = 0, startY = 0, dx = 0, moved = false, active = false;
    card.addEventListener('pointerdown', e => {
      if (busy) return;
      active = true; dragging = true; moved = false; dx = 0;
      startX = e.clientX; startY = e.clientY;
      card.setPointerCapture(e.pointerId);
      card.style.transition = 'none';
    });
    card.addEventListener('pointermove', e => {
      if (!active) return;
      dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (Math.abs(dx) + Math.abs(dy) > 8) moved = true;
      card.style.transform = 'translate(' + dx + 'px,' + dy * .25 + 'px) rotate(' + dx / 18 + 'deg)';
      setStamps(card, dx);
    });
    const finish = cancelled => {
      if (!active) return;
      active = false; dragging = false;
      if (!cancelled && Math.abs(dx) > 90) return fling(dx > 0 ? 1 : -1);
      if (!cancelled && !moved) { openRecipe(card.dataset.id); return; }
      card.style.transition = reduced ? 'none' : 'transform 200ms ease-out';
      card.style.transform = '';
      setStamps(card, 0);
    };
    card.addEventListener('pointerup', () => finish(false));
    card.addEventListener('pointercancel', () => finish(true));
  }

  async function api(path, method, body) {
    const res = await fetch('/api/dishes' + path, {
      method: method || 'GET',
      headers: body ? { 'content-type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(10000)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  }

  async function write(id, fields, okMsg) {
    const dish = recipes.get(id);
    const before = Object.fromEntries(Object.keys(fields).map(k => [k, dish[k]]));
    Object.assign(dish, fields);
    syncDeck();
    render();
    saving++;
    try {
      await api('/' + id, 'PATCH', fields);
      if (okMsg) toast(okMsg);
    } catch (e) {
      Object.assign(dish, before);
      syncDeck();
      render();
      toast('That did not save. Check your connection and try again.');
    } finally {
      saving--;
    }
  }

  async function load() {
    try {
      const { dishes } = await api('');
      const fresh = JSON.stringify(dishes);
      if (saving || fresh === lastLoaded) return;
      lastLoaded = fresh;
      const first = !loaded;
      recipes.clear();
      Object.entries(dishes).forEach(([id, d]) => recipes.set(id, d));
      loaded = true;
      failed = '';
      if (first) rebuildDeck(); else syncDeck();
      render();
    } catch (e) {
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
    if (busy || !passed.length) return;
    const id = passed.pop();
    queue.unshift(id);
    shortlist = shortlist.filter(x => x !== id);
    saveShortlist();
    renderStack();
  });
  $('stack').addEventListener('click', e => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    if (b.dataset.act === 'again') { queue = deal(passed.filter(id => !shortlist.includes(id))); passed = []; renderStack(); }
    if (b.dataset.act === 'list') setTab('short');
    if (b.dataset.act === 'add') openAdder();
  });
  $('recipe').addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b || !openId) return;
    if (b.dataset.act === 'close') { history.back(); return; }
    if (b.dataset.act === 'edit') { openEditor(openId); return; }
    if (b.dataset.act === 'cook') {
      shortlist = shortlist.filter(id => id !== openId);
      saveShortlist();
      write(openId, { lastHad: today(), tried: true }, 'Saved. Enjoy dinner.');
      return;
    }
    if (b.dataset.flag) {
      const on = b.dataset.val === '1';
      const said = b.dataset.flag === 'lexi' ? (on ? 'Marked Lexi proof' : 'No longer marked Lexi proof') : (on ? 'Marked tried and tested' : 'Marked to try');
      write(openId, { [b.dataset.flag]: on }, said);
      return;
    }
    if (b.dataset.toggle) { toggleShortlist(b.dataset.toggle); return; }
    if (b.dataset.rate) {
      const key = b.dataset.rate, val = Number(b.dataset.val);
      const name = SCORES.find(s => s[0] === key)[1];
      write(openId, { [key]: val }, name + ' saved as ' + val);
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
    if (b.dataset.open) openRecipe(b.dataset.open);
    if (b.dataset.toggle) toggleShortlist(b.dataset.toggle);
  });
  $('panelShort').addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.open) openRecipe(b.dataset.open);
    if (b.dataset.toggle) toggleShortlist(b.dataset.toggle);
    if (b.dataset.people) {
      const id = b.dataset.people;
      servings[id] = Math.min(30, Math.max(1, peopleFor(id) + Number(b.dataset.change)));
      store(SERVINGS_KEY, servings);
      renderShortlist();
    }
    if (b.dataset.act === 'shop') go({ tab, shop: true });
    if (b.dataset.act === 'clear') {
      shortlist = [];
      passed = [];
      saveShortlist();
      rebuildDeck();
      render();
      toast('Shortlist cleared');
    }
  });
  $('shop').addEventListener('click', async e => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.act === 'close') history.back();
    if (b.dataset.act === 'share') {
      const text = 'Shopping list\n\n' + Shopping.toText(shoppingList().aisles);
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
    store(TICKS_KEY, ticks);
  });
  addEventListener('popstate', e => applyNav(e.state));
  const formScores = { ease: 0, speed: 0, love: 0 };
  let importedSource = '';
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
    $('adder').scrollTop = 0;
  }
  function openAdder() {
    fillForm({});
    $('moreDetails').open = false;
    $('linkNote').textContent = 'Paste a link and the recipe fills in below for you to check. No link? Just type it in.';
    go({ tab, add: true });
    $('f-link').focus();
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
  $('getRecipe').addEventListener('click', async () => {
    const url = linkIn($('f-link').value);
    if (!url) { $('linkNote').textContent = 'Paste a full link first, starting with https://'; return; }
    $('f-link').value = url;
    $('getRecipe').disabled = true;
    $('linkNote').textContent = 'Reading the recipe.';
    try {
      const { recipe } = await api('/import', 'POST', { url });
      $('f-title').value = recipe.title;
      $('f-shop').value = list(recipe.shopping).join('\n');
      $('f-steps').value = list(recipe.steps).join('\n');
      $('f-blurb').value = recipe.blurb || '';
      $('f-minutes').value = recipe.minutes || '';
      $('f-serves').value = recipe.serves || '';
      importedSource = recipe.source || '';
      $('linkNote').textContent = 'Got it. Check it below, change anything you like, then save.';
    } catch (err) {
      $('linkNote').textContent = 'That site would not share its recipe. Type in the name and whatever you want to keep. The link is saved with it.';
    } finally {
      $('getRecipe').disabled = false;
    }
  });
  $('formRate').addEventListener('click', e => {
    const b = e.target.closest('[data-form-rate]');
    if (!b) return;
    const key = b.dataset.formRate, val = Number(b.dataset.val);
    formScores[key] = formScores[key] === val ? 0 : val;
    renderFormRate();
  });
  $('addBtn').addEventListener('click', openAdder);
  $('addClose').addEventListener('click', () => history.back());
  const csv = v => v.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  // A first guess from what we know, using the same scoring as the saved dishes. Pans aren't known yet.
  const startingEase = (hands, count) => (hands || count ? Math.max(1, 5 - (hands > 40 ? 2 : hands > 20 ? 1 : 0) - (count > 10 ? 1 : 0)) : 0);
  const startingSpeed = m => (!m ? 0 : m <= 20 ? 5 : m <= 30 ? 4 : m <= 45 ? 3 : m <= 75 ? 2 : 1);
  const lines = v => v.split('\n').map(s => s.trim()).filter(Boolean);
  $('addForm').addEventListener('submit', async e => {
    e.preventDefault();
    const title = $('f-title').value.trim();
    if (!title) return;
    const fields = {
      title, blurb: $('f-blurb').value.trim(), minutes: Number($('f-minutes').value) || null,
      handsOn: Number($('f-hands').value) || null, serves: $('f-serves').value.trim(), kit: $('f-kit').value.trim(),
      sourceUrl: linkIn($('f-link').value), tags: csv($('f-tags').value), note: $('f-note').value.trim(),
      shopping: lines($('f-shop').value), steps: lines($('f-steps').value),
      tried: $('f-tried').checked, lexi: $('f-lexi').checked, ...formScores
    };
    if (editId) {
      const id = editId;
      history.back();
      write(id, fields, 'Saved.');
      return;
    }
    if (!fields.ease) fields.ease = startingEase(fields.handsOn, fields.shopping.length);
    if (!fields.speed) fields.speed = startingSpeed(fields.minutes);
    try {
      const { id, dish } = await api('', 'POST', { ...fields, source: importedSource });
      recipes.set(id, dish);
      syncDeck();
      render();
      history.back();
      toast(title + ' is in the deck.');
    } catch (err) {
      toast('That did not save. Try again.');
    }
  });
  addEventListener('keydown', e => {
    if (openId || shopOpen || !$('adder').hidden) {
      if (e.key === 'Escape') history.back();
      return;
    }
    if (tab !== 'swipe' || e.target.matches('input, textarea')) return;
    if (e.key === 'ArrowLeft') fling(-1);
    if (e.key === 'ArrowRight') fling(1);
  });

  history.replaceState(null, '');
  applyNav(null);
  render();

  load();
  setInterval(() => { if (!document.hidden) load(); }, 60000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) load(); });
})();
