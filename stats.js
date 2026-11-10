// The stats page. Reads /api/dishes/stats, which decides which groups this phone may see.
(() => {
  const LABELS = { swipes: 'Swipes', likes: 'Likes', matches: 'Matches', cooked: 'Cooked', reads: 'AI reads' };
  const SHOWN_DAYS = 14;
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = id => document.getElementById(id);
  const when = day => {
    if (!day) return 'not yet';
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Amsterdam' }).format(new Date());
    const days = Math.round((new Date(today) - new Date(day)) / 864e5);
    return days === 0 ? 'today' : days === 1 ? 'yesterday' : days < 7 ? days + ' days ago' : new Date(day + 'T12:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  };
  const dayName = day => new Date(day + 'T12:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  const cell = n => '<td' + (n ? '' : ' class="zero"') + '>' + n + '</td>';

  function groupHtml(g, kinds, showAll) {
    const people = Object.entries(g.people);
    const title = people.map(([, n]) => n).join(' and ');
    const seen = people.map(([p, n]) => esc(n) + ' ' + when(g.lastSeen[p])).join(' · ');
    const tiles = kinds.map(k => '<div class="tile"><b>' + g.all[k] + '</b><span>' + LABELS[k] + '</span></div>').join('');
    const head = '<tr><th></th>' + people.map(([, n]) => '<th>' + esc(n) + '</th>').join('') + '</tr>';
    const rows = kinds.map(k => '<tr><td>' + LABELS[k] + '</td>' + people.map(([p]) => cell(g.totals[p][k])).join('') + '</tr>').join('');
    const days = showAll ? g.daily : g.daily.slice(0, SHOWN_DAYS);
    const most = Math.max(1, ...g.daily.map(d => d.swipes));
    const dayRows = days.map(d => {
      const who = people.filter(([p]) => d.people[p] && kinds.some(k => d.people[p][k])).map(([p, n]) => esc(n) + ' ' + (d.people[p].swipes || 0)).join(', ');
      return '<tr><td>' + dayName(d.day) + (who ? '<span class="day-who">swipes: ' + who + '</span>' : '') + '</td>' +
        '<td>' + d.swipes + '<span class="bar" style="width:' + Math.round(40 * d.swipes / most) + 'px"></span></td>' +
        kinds.filter(k => k !== 'swipes').map(k => cell(d[k])).join('') + '</tr>';
    }).join('');
    return '<section class="group"><h2>' + esc(title) + '</h2><p class="seen">Last used: ' + seen + '</p>' +
      '<div class="tiles">' + tiles + '</div>' +
      '<h3>Since counting started</h3><table>' + head + rows + '</table>' +
      '<h3>Day by day</h3>' + (g.daily.length
        ? '<table><tr><th>Day</th>' + kinds.map(k => '<th>' + LABELS[k] + '</th>').join('') + '</tr>' + dayRows + '</table>' +
          (g.daily.length > SHOWN_DAYS && !showAll ? '<button type="button" class="more" data-more="' + esc(g.name) + '">Show all ' + g.daily.length + ' days</button>' : '')
        : '<p class="empty">Nothing yet.</p>') +
      '</section>';
  }

  async function show() {
    let data;
    try {
      const res = await fetch('/api/dishes/stats', { cache: 'no-store' });
      data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not load');
    } catch (e) {
      $('sub').textContent = e.message === 'Failed to fetch' ? 'Could not load. Check your connection.' : e.message + '.';
      return;
    }
    const open = new Set();
    const draw = () => { $('groups').innerHTML = data.groups.map(g => groupHtml(g, data.kinds, open.has(g.name))).join(''); };
    $('sub').innerHTML = (data.everyone ? 'Every group, counted since stage two went live. ' : 'Your group, counted since stage two went live. ') + '<a href="/">Back to the app</a>';
    $('groups').addEventListener('click', e => {
      const b = e.target.closest('[data-more]');
      if (b) { open.add(b.dataset.more); draw(); }
    });
    draw();
  }
  show();
})();
