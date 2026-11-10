// The History page: what this group has matched, chosen and cooked, and what the swipes say.
(() => {
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Amsterdam' }).format(new Date());
  const daysBetween = (a, b) => Math.round((new Date(b + 'T12:00') - new Date(a + 'T12:00')) / 864e5);
  const ago = day => {
    const n = daysBetween(day, today);
    return n <= 0 ? 'today' : n === 1 ? 'yesterday' : n < 14 ? n + ' days ago' : n < 60 ? Math.round(n / 7) + ' weeks ago' : Math.round(n / 30) + ' months ago';
  };
  const every = n => (n < 10 ? 'every ' + n + ' days' : n < 60 ? 'every ' + Math.round(n / 7) + ' weeks' : 'every ' + Math.round(n / 30) + ' months');
  const KIND = { matched: ['💞', 'Matched'], chosen: ['🍳', 'Chosen for tonight'], cooked: ['✅', 'Cooked'] };
  const SHOWN = 40;
  let data, dishes, people, showAll = false;

  const tile = d => '<span class="tile" aria-hidden="true">' + (d && d.photo ? '<img src="' + esc(d.photo.replace('.jpg', '-thumb.jpg')) + '" alt="" loading="lazy">' : '🍽️') + '</span>';
  const name = id => (dishes[id] ? dishes[id].title : 'A dish no longer in the deck');

  // The days each dish was made: chosen or cooked, once per day.
  function madeDays() {
    const made = {};
    data.events.filter(e => e.kind !== 'matched').forEach(e => { (made[e.dish] = made[e.dish] || new Set()).add(e.day); });
    return Object.fromEntries(Object.entries(made).map(([id, s]) => [id, [...s].sort()]));
  }

  function hits(made) {
    const rows = Object.entries(made).filter(([id]) => dishes[id]).map(([id, days]) => {
      const gaps = days.slice(1).map((d, i) => daysBetween(days[i], d)), usual = gaps.length ? Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length) : null;
      const ratings = data.events.filter(e => e.dish === id && e.rating).map(e => e.rating);
      const rating = ratings.length ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1).replace('.0', '') : null;
      return { id, times: days.length, usual, last: days[days.length - 1], rating };
    }).sort((a, b) => b.times - a.times || (a.last < b.last ? 1 : -1));
    if (!rows.length) return '<p class="empty">Nothing cooked yet. Press "We\'re cooking this tonight" on a dish and it starts here.</p>';
    return rows.map(r => '<div class="row">' + tile(dishes[r.id]) + '<div><strong>' + esc(name(r.id)) + '</strong><span class="facts">' +
      [r.usual ? 'Usually ' + every(r.usual) : '', 'last ' + ago(r.last), r.rating ? '★ ' + r.rating : ''].filter(Boolean).join(' · ') + '</span></div>' +
      '<div class="big">' + r.times + '<small>' + (r.times === 1 ? 'time' : 'times') + '</small></div></div>').join('');
  }

  function swipeList(made, pick, facts, number, label, none) {
    const rows = Object.entries(data.swipes).filter(([id, s]) => dishes[id] && pick(id, s, made)).sort((a, b) => number(b[1]) - number(a[1]));
    if (!rows.length) return '<p class="empty">' + none + '</p>';
    return rows.slice(0, 12).map(([id, s]) => '<div class="row">' + tile(dishes[id]) + '<div><strong>' + esc(name(id)) + '</strong><span class="facts">' + esc(facts(s)) + '</span></div>' +
      '<div class="big">' + number(s) + '<small>' + label + '</small></div></div>').join('');
  }

  function timeline() {
    if (!data.events.length) return '<p class="empty">Nothing yet.</p>';
    const shown = showAll ? data.events : data.events.slice(0, SHOWN);
    let month = '', html = '';
    shown.forEach(e => {
      const m = new Date(e.day + 'T12:00').toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
      if (m !== month) { month = m; html += '<p class="month">' + esc(m) + '</p>'; }
      const [icon, said] = KIND[e.kind];
      const by = e.fromBefore ? 'from before history' : e.who && people[e.who] ? people[e.who] : '';
      html += '<div class="event"><span class="day">' + new Date(e.day + 'T12:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' }) + '</span>' +
        '<span class="kind" aria-hidden="true">' + icon + '</span>' +
        '<div class="what"><b>' + esc(name(e.dish)) + '</b><span>' + esc(said + (e.rating ? ', ★ ' + e.rating : '') + (by ? ' · ' + by : '')) + '</span></div>' +
        '<button type="button" data-delete="' + esc(e.key) + '" aria-label="Delete this entry">✕</button></div>';
    });
    if (!showAll && data.events.length > SHOWN) html += '<button type="button" class="more" data-all>Show all ' + data.events.length + '</button>';
    return html;
  }

  function draw() {
    const made = madeDays();
    const cooked = new Set(Object.keys(made));
    const plural = (n, one, many) => n + ' ' + (n === 1 ? one : many);
    $('sub').textContent = Object.values(people).join(' and ') + ': ' + plural(data.events.filter(e => e.kind !== 'matched').length, 'dinner', 'dinners') + ' chosen or cooked, ' + plural(data.events.filter(e => e.kind === 'matched').length, 'match', 'matches') + '.';
    $('out').innerHTML =
      '<h2>Hits</h2><p class="why">What you make most, how often, and when you last had it.</p>' + hits(made) +
      '<h2>Picked a lot, never made</h2><p class="why">Swiped right again and again, but never cooked. A weekend one, maybe?</p>' +
      swipeList(made, (id, s) => s.right >= 3 && !cooked.has(id), s => 'Swiped right ' + s.right + ' times' + (s.lastRight ? ', last ' + ago(s.lastRight) : ''), s => s.right, 'rights',
        'Nothing yet. Dishes you keep swiping right on but never cook show up here.') +
      '<h2>Always skipped</h2><p class="why">Swiped left every time. Worth deleting, so the deck stays fresh?</p>' +
      swipeList(made, (id, s) => s.left >= 5 && !s.right && !cooked.has(id), s => 'Skipped ' + s.left + ' times, never picked', s => s.left, 'skips',
        'Nothing yet. A dish skipped 5 times and never picked shows up here.') +
      '<h2>Everything, newest first</h2><p class="why">Tap ✕ to delete an entry you didn\'t mean.</p>' + timeline();
  }

  async function load() {
    try {
      const [h, d] = await Promise.all(['/api/dishes/history', '/api/dishes'].map(u => fetch(u, { cache: 'no-store' }).then(async r => {
        const body = await r.json();
        if (!r.ok) throw new Error(body.error || 'Could not load');
        return body;
      })));
      data = h;
      dishes = d.dishes;
      people = h.people;
      draw();
    } catch (e) {
      $('sub').textContent = e.message === 'Failed to fetch' ? 'Could not load. Check your connection.' : e.message + '.';
    }
  }

  $('out').addEventListener('click', async e => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.all !== undefined) { showAll = true; draw(); return; }
    const key = b.dataset.delete;
    const ev = key && data.events.find(x => x.key === key);
    if (!ev || !confirm('Delete "' + KIND[ev.kind][1] + ': ' + name(ev.dish) + '" from ' + ev.day + '?')) return;
    b.disabled = true;
    try {
      const res = await fetch('/api/dishes/' + key, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      data.events = data.events.filter(x => x.key !== key);
      draw();
    } catch (err) {
      b.disabled = false;
      alert('That did not delete. Check your connection and try again.');
    }
  });
  load();
})();
