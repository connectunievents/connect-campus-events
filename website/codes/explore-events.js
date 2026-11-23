(function () {
  const state = { events: [], quick: 'all', loading: false };
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  const art = { talk: ['talk', '◌'], music: ['music', '♫'], workshop: ['workshop', '⌘'], sports: ['sport', '↗'], community: ['community', '✦'] };
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
  const formatDate = (value) => new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }).format(new Date(value));
  const selected = (selector) => $$(selector + ':checked').map((element) => element.value);

  function normalize(event) {
    const visual = art[String(event.category || '').toLowerCase()] || ['tech', '✺'];
    return { ...event, date: event.start_time, place: event.location || 'Location to be announced', priceLabel: Number(event.price) === 0 ? 'Free' : `USD ${Number(event.price).toFixed(2)}`, art: visual[0], symbol: visual[1] };
  }
  function matchesQuick(event) {
    if (state.quick === 'all') return true;
    if (state.quick === 'Free') return Number(event.price) === 0;
    if (['Music', 'Workshop'].includes(state.quick)) return event.category?.toLowerCase() === state.quick.toLowerCase();
    const date = new Date(event.start_time), now = new Date();
    if (state.quick === 'today') return date.toDateString() === now.toDateString();
    return [0, 6].includes(date.getDay());
  }
  function render() {
    const query = $('#searchInput').value.trim().toLowerCase();
    const university = $('#universitySelect').value, categories = selected('.category'), prices = selected('.price');
    let items = state.events.filter((event) => {
      const haystack = `${event.title} ${event.category} ${event.university || ''} ${event.location || ''}`.toLowerCase();
      const price = Number(event.price) === 0 ? 'Free' : 'Paid';
      return (!query || haystack.includes(query)) && (university === 'all' || event.university === university) && (!categories.length || categories.some((category) => category.toLowerCase() === event.category?.toLowerCase())) && (!prices.length || prices.includes(price)) && matchesQuick(event);
    });
    items.sort((a, b) => $('#sortSelect').value === 'name' ? a.title.localeCompare(b.title) : new Date(a.start_time) - new Date(b.start_time));
    $('#resultCount').textContent = `${items.length} event${items.length === 1 ? '' : 's'} to explore`;
    $('#eventGrid').innerHTML = items.length ? items.map((raw) => {
      const event = normalize(raw);
      return `<article class="event-card" tabindex="0" role="button" data-event-id="${event.id}" aria-label="View ${escapeHtml(event.title)}"><div class="event-art art-${event.art}"><span class="event-badge">${escapeHtml(event.priceLabel)}</span><span class="art-symbol">${event.symbol}</span></div><div class="event-body"><div class="event-date">${formatDate(event.date)}</div><h3>${escapeHtml(event.title)}</h3><div class="event-meta">⌖ ${escapeHtml(event.place)}</div><div class="event-university">${escapeHtml(event.university || 'Open to everyone')}</div></div></article>`;
    }).join('') : `<div class="empty"><h3>${state.loading ? 'Loading events…' : 'No events found'}</h3><p>${state.loading ? 'Getting the latest Connect listings.' : 'Try another search or clear a filter to see more events.'}</p></div>`;
  }
  function openModal(event) {
    const item = normalize(event);
    $('#eventModalTitle').textContent = item.title;
    $('#eventModalDescription').textContent = item.description || 'No description has been provided.';
    $('#eventModalDetails').textContent = `${formatDate(item.date)} · ${item.place} · ${item.university || 'Public'} · ${item.priceLabel}`;
    $('#registerButton').dataset.eventId = item.id;
    $('#registerStatus').textContent = ''; $('#ticketQr').hidden = true;
    $('#eventModal').classList.add('open');
  }
  async function register(eventId) {
    const status = $('#registerStatus'), button = $('#registerButton');
    button.disabled = true; status.textContent = 'Registering…';
    try {
      const result = await ConnectAccess.api(`/api/events/${eventId}/register`, { method: 'POST', body: '{}' });
      status.textContent = result.data.message;
      if (result.data.ticket?.qrDataUrl) { $('#ticketQr').src = result.data.ticket.qrDataUrl; $('#ticketQr').hidden = false; }
    } catch (error) {
      status.textContent = error.status === 401 ? 'Please log in before registering.' : error.message;
      if (error.status === 401) window.setTimeout(() => { location.href = `login.html?next=${encodeURIComponent(location.href)}`; }, 1200);
    } finally { button.disabled = false; }
  }
  async function load() {
    state.loading = true; render();
    try {
      const result = await ConnectAccess.api('/api/events?limit=50');
      state.events = result.data;
      window.ConnectChatContext = { page: 'Explore events', events: state.events.map((event) => ({ title: event.title, category: event.category, price: Number(event.price) === 0 ? 'Free' : 'Paid', university: event.university, date: event.start_time, place: event.location })) };
    } catch (error) {
      $('#eventGrid').innerHTML = `<div class="empty"><h3>Events could not load</h3><p>${escapeHtml(error.message)}</p><button class="btn" id="retryEvents">Try again</button></div>`;
      $('#retryEvents').addEventListener('click', load); return;
    } finally { state.loading = false; }
    render();
  }

  $('#searchButton').addEventListener('click', render); $('#searchInput').addEventListener('input', render); $('#universitySelect').addEventListener('change', render); $('#sortSelect').addEventListener('change', render);
  $$('.category,.price').forEach((element) => element.addEventListener('change', render));
  $('#quickFilters').addEventListener('click', (click) => { const button = click.target.closest('[data-quick]'); if (!button) return; $$('[data-quick]').forEach((item) => item.classList.toggle('active', item === button)); state.quick = button.dataset.quick; render(); });
  $('#clearFilters').addEventListener('click', () => { $('#searchInput').value = ''; $('#universitySelect').value = 'all'; $$('.category,.price').forEach((element) => { element.checked = false; }); state.quick = 'all'; $$('[data-quick]').forEach((element) => element.classList.toggle('active', element.dataset.quick === 'all')); render(); });
  $('#eventGrid').addEventListener('click', (click) => { const card = click.target.closest('[data-event-id]'); if (card) openModal(state.events.find((event) => event.id === card.dataset.eventId)); });
  $('#eventGrid').addEventListener('keydown', (key) => { if ((key.key === 'Enter' || key.key === ' ') && key.target.matches('[data-event-id]')) { key.preventDefault(); openModal(state.events.find((event) => event.id === key.target.dataset.eventId)); } });
  $('#eventModalClose').addEventListener('click', () => $('#eventModal').classList.remove('open')); $('#eventModal').addEventListener('click', (click) => { if (click.target.id === 'eventModal') click.currentTarget.classList.remove('open'); });
  $('#registerButton').addEventListener('click', () => register($('#registerButton').dataset.eventId));
  load();
})();
