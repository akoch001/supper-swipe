(function () {
  const GROUPS = {
    chicken: 'chicken', turkey: 'chicken',
    beef: 'meat', steak: 'meat', mince: 'meat', lamb: 'meat',
    pork: 'pork', bacon: 'pork', sausage: 'pork', chorizo: 'pork', ham: 'pork',
    fish: 'fish', salmon: 'fish', cod: 'fish', tuna: 'fish', prawns: 'fish', shrimp: 'fish', hake: 'fish', haddock: 'fish', scallops: 'fish',
    chickpeas: 'veg', lentils: 'veg', tofu: 'veg', beans: 'veg', vegetables: 'veg', aubergine: 'veg', cauliflower: 'veg', carrots: 'veg', halloumi: 'veg'
  };
  const SCORES = [['ease', 'Ease'], ['speed', 'Speed'], ['love', 'How much we like it']];
  const $ = id => document.getElementById(id);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const recipes = new Map();
  let saving = 0, lastLoaded = '';
  let queue = [], passed = [];
  let mode = 'all', easyOnly = false;
  const have = new Set();
  let openId = null, loaded = false, failed = '', dragging = false, busy = false;

  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const list = v => Array.isArray(v) ? v : [];
  const terms = r => list(r.core).concat(list(r.tags));
  const groupOf = r => {
    for (const c of list(r.core)) if (GROUPS[c]) return GROUPS[c];
    return list(r.tags).includes('vegetarian') ? 'veg' : 'other';
  };
  const matches = r => {
    if (easyOnly && !((r.ease || 0) >= 3)) return false;
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

  function rebuildDeck() {
    queue = shuffle([...recipes.keys()].filter(id => matches(recipes.get(id))));
    passed = [];
  }
  function syncDeck() {
    queue = queue.filter(id => recipes.has(id) && matches(recipes.get(id)));
    passed = passed.filter(id => recipes.has(id) && matches(recipes.get(id)));
    for (const id of recipes.keys()) {
      if (matches(recipes.get(id)) && !queue.includes(id) && !passed.includes(id)) queue.push(id);
    }
  }

  function cardHTML(id) {
    const r = recipes.get(id);
    return '<article class="card ' + groupOf(r) + '" data-id="' + esc(id) + '">' +
      '<span class="stamp yes">Yes</span><span class="stamp no">Not tonight</span>' +
      '<div class="eyebrow"><span>' + esc(list(r.core).slice(0, 3).join(' · ')) + '</span>' + (r.sample ? '<span class="badge">Sample</span>' : '') + '</div>' +
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
    else if (!queue.length && !passed.length) empty = '<div class="empty"><h2>Nothing uses all of that</h2><p>Untick an ingredient to see more dishes.</p></div>';
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
  }

  function renderRecipe() {
    const box = $('recipe');
    const r = openId && recipes.get(openId);
    box.hidden = !r;
    if (!r) return;
    const src = /^https?:\/\//.test(r.sourceUrl || '') ? '<a href="' + esc(r.sourceUrl) + '" target="_blank" rel="noopener">Original recipe' + (r.source ? ' from ' + esc(r.source) : '') + '</a>' : esc(r.source ? 'From: ' + r.source : '');
    const takes = [
      r.kit ? 'Washing up: ' + r.kit : '',
      r.ingredientCount ? r.ingredientCount + ' ingredients' : '',
      r.handsOn ? r.handsOn + ' minutes hands-on' : '',
      list(r.hard).length ? 'Hard to find: ' + list(r.hard).join(', ') : ''
    ].filter(Boolean);
    box.innerHTML = '<div class="sheet-in">' +
      '<div class="sheet-actions"><button type="button" class="ghost" data-act="close">Keep swiping</button></div>' +
      '<div><h2>' + esc(r.title) + '</h2><p class="sub">' +
        [r.sample ? 'Sample dish' : '', r.minutes ? r.minutes + ' min' : '', r.serves ? 'Serves ' + r.serves : '', lastHad(r)].filter(Boolean).map(esc).join(' · ') + '</p></div>' +
      '<div class="rate">' + SCORES.map(s => '<div class="rate-row"><span>' + s[1] + '</span><div class="pips">' +
        [1, 2, 3, 4, 5].map(i => '<button type="button" data-rate="' + s[0] + '" data-val="' + i + '" class="' + (i <= (r[s[0]] || 0) ? 'on' : '') + '" aria-label="' + s[1] + ' ' + i + ' out of 5">' + i + '</button>').join('') +
        '</div></div>').join('') + '</div>' +
      (r.note ? '<p class="note">' + esc(r.note) + '</p>' : '') +
      (r.needsRecipe ? '<p class="note">This recipe has not been copied in yet. Use the link below to see it.</p>' : '') +
      (takes.length ? '<section><h3>What it takes</h3><ul>' + takes.map(x => '<li>' + esc(x) + '</li>').join('') + '</ul></section>' : '') +
      (list(r.shopping).length ? '<section><h3>Ingredients</h3><ul>' + list(r.shopping).map(x => '<li>' + esc(x) + '</li>').join('') + '</ul></section>' : '') +
      (list(r.steps).length ? '<section><h3>Method</h3><ol>' + list(r.steps).map(x => '<li>' + esc(x) + '</li>').join('') + '</ol></section>' : '') +
      (src ? '<p>' + src + '</p>' : '') +
      '<div class="sheet-actions"><button type="button" class="primary" data-act="cook">We\'re cooking this tonight</button></div>' +
      '</div>';
  }

  function render() { renderFilter(); renderStack(); renderRecipe(); }

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
      if (dir > 0) openId = id;
      render();
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
      if (!cancelled && !moved) { openId = card.dataset.id; renderRecipe(); return; }
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
  $('noBtn').addEventListener('click', () => fling(-1));
  $('yesBtn').addEventListener('click', () => fling(1));
  $('backBtn').addEventListener('click', () => {
    if (busy || !passed.length) return;
    queue.unshift(passed.pop());
    renderStack();
  });
  $('stack').addEventListener('click', e => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    if (b.dataset.act === 'again') { queue = shuffle(passed); passed = []; renderStack(); }
    if (b.dataset.act === 'add') openAdder();
  });
  $('recipe').addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b || !openId) return;
    if (b.dataset.act === 'close') { openId = null; $('recipe').scrollTop = 0; renderRecipe(); return; }
    if (b.dataset.act === 'cook') { write(openId, { lastHad: today() }, 'Saved. Enjoy dinner.'); return; }
    if (b.dataset.rate) {
      const key = b.dataset.rate, val = Number(b.dataset.val);
      const name = SCORES.find(s => s[0] === key)[1];
      write(openId, { [key]: val }, name + ' saved as ' + val);
    }
  });
  function openAdder() {
    $('adder').hidden = false;
    $('f-title').focus();
  }
  $('addBtn').addEventListener('click', openAdder);
  $('addClose').addEventListener('click', () => { $('adder').hidden = true; });
  const csv = v => v.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  const lines = v => v.split('\n').map(s => s.trim()).filter(Boolean);
  $('addForm').addEventListener('submit', async e => {
    e.preventDefault();
    const title = $('f-title').value.trim();
    if (!title) return;
    try {
      const { id, dish } = await api('', 'POST', {
        title, blurb: $('f-blurb').value.trim(), minutes: Number($('f-minutes').value) || null,
        handsOn: Number($('f-hands').value) || null, kit: $('f-kit').value.trim(),
        core: csv($('f-core').value), tags: csv($('f-tags').value),
        shopping: lines($('f-shop').value), steps: lines($('f-steps').value)
      });
      recipes.set(id, dish);
      syncDeck();
      render();
      e.target.reset();
      $('adder').hidden = true;
      toast(title + ' is in the deck.');
    } catch (err) {
      toast('That did not save. Try again.');
    }
  });
  addEventListener('keydown', e => {
    if (openId || !$('adder').hidden) {
      if (e.key === 'Escape') { openId = null; $('adder').hidden = true; renderRecipe(); }
      return;
    }
    if (e.target.matches('input, textarea')) return;
    if (e.key === 'ArrowLeft') fling(-1);
    if (e.key === 'ArrowRight') fling(1);
  });

  render();

  load();
  setInterval(() => { if (!document.hidden) load(); }, 60000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) load(); });
})();
