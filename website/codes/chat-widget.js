/* Connect Guide: a shared, accessible chat widget for every page. */
(function () {
  const history = [];

  const css = `
    #connectChat{position:fixed;right:24px;bottom:24px;z-index:500;font-family:'Plus Jakarta Sans',sans-serif}
    .connect-chat-toggle{width:58px;height:58px;border:0;border-radius:50%;background:#081C10;color:#fff;box-shadow:0 12px 28px rgba(8,28,16,.28);font-size:24px;cursor:pointer;transition:transform .2s,background .2s}.connect-chat-toggle:hover{transform:translateY(-3px);background:#16542F}
    .connect-chat-panel{position:absolute;right:0;bottom:72px;width:min(390px,calc(100vw - 32px));height:520px;background:#fff;border:1px solid #D8E7DE;border-radius:18px;box-shadow:0 20px 50px rgba(8,28,16,.24);overflow:hidden;display:none;grid-template-rows:auto 1fr auto}.connect-chat-panel.open{display:grid}
    .connect-chat-head{background:#081C10;color:#fff;padding:18px 19px;display:flex;align-items:center;justify-content:space-between}.connect-chat-name{font:700 18px Georgia,serif}.connect-chat-status{font-size:11px;color:#A7EAC0;margin-top:2px}.connect-chat-close{border:0;background:transparent;color:#fff;font-size:22px;line-height:1;padding:2px 5px;cursor:pointer}
    .connect-chat-messages{overflow-y:auto;padding:18px 15px;background:#F5FAF7;display:flex;flex-direction:column;gap:11px}.connect-message{max-width:86%;padding:10px 12px;border-radius:12px;font-size:12.5px;line-height:1.55;white-space:pre-wrap}.connect-message.assistant{align-self:flex-start;background:#fff;border:1px solid #D8E7DE;color:#1A2D20;border-bottom-left-radius:3px}.connect-message.user{align-self:flex-end;background:#16542F;color:#fff;border-bottom-right-radius:3px}.connect-message.loading{color:#607466;font-style:italic}
    .connect-chat-compose{padding:12px;border-top:1px solid #D8E7DE;background:#fff}.connect-suggestions{display:flex;gap:6px;overflow-x:auto;margin-bottom:10px}.connect-suggestion{white-space:nowrap;border:1px solid #B8D9C5;background:#fff;color:#16542F;border-radius:999px;padding:6px 9px;font-size:10px;font-weight:700;cursor:pointer}.connect-chat-form{display:flex;gap:8px}.connect-chat-input{min-width:0;flex:1;border:1px solid #B8D9C5;border-radius:9px;padding:10px 11px;outline:none;font-size:12px}.connect-chat-input:focus{border-color:#16542F;box-shadow:0 0 0 3px rgba(22,84,47,.1)}.connect-send{border:0;border-radius:9px;background:#3DBA6F;color:#081C10;font-weight:800;padding:0 13px;cursor:pointer}.connect-send:disabled{opacity:.55;cursor:not-allowed}
    @media(max-width:600px){#connectChat{right:16px;bottom:16px}.connect-chat-panel{right:-2px;bottom:69px;height:min(520px,calc(100vh - 110px))}
  `;

  function addMessage(role, text, className = '') {
    const node = document.createElement('div');
    node.className = `connect-message ${role} ${className}`;
    node.textContent = text;
    document.getElementById('connectChatMessages').appendChild(node);
    node.scrollIntoView({ block: 'end', behavior: 'smooth' });
    return node;
  }

  function buildWidget() {
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);

    const shell = document.createElement('section');
    shell.id = 'connectChat';
    shell.innerHTML = `
      <div class="connect-chat-panel" id="connectChatPanel" aria-label="Connect Guide chat" role="dialog" aria-modal="false">
        <div class="connect-chat-head"><div><div class="connect-chat-name">Connect Guide</div><div class="connect-chat-status">Event help & recommendations</div></div><button class="connect-chat-close" id="connectChatClose" aria-label="Close chat">×</button></div>
        <div class="connect-chat-messages" id="connectChatMessages" aria-live="polite"></div>
        <div class="connect-chat-compose"><div class="connect-suggestions"><button class="connect-suggestion" data-prompt="Help me find a free event">Free events</button><button class="connect-suggestion" data-prompt="Recommend an event for me">Recommend something</button><button class="connect-suggestion" data-prompt="How do I register for an event?">How registration works</button></div><form class="connect-chat-form" id="connectChatForm"><input class="connect-chat-input" id="connectChatInput" maxlength="800" autocomplete="off" placeholder="Ask about events or Connect…" aria-label="Message Connect Guide"/><button class="connect-send" id="connectChatSend" type="submit">Send</button></form></div>
      </div>
      <button class="connect-chat-toggle" id="connectChatToggle" aria-label="Open Connect Guide" aria-expanded="false">✦</button>`;
    document.body.appendChild(shell);

    document.getElementById('connectChatToggle').addEventListener('click', toggleChat);
    document.getElementById('connectChatClose').addEventListener('click', toggleChat);
    document.getElementById('connectChatForm').addEventListener('submit', sendFromInput);
    shell.querySelectorAll('[data-prompt]').forEach((button) => button.addEventListener('click', () => sendMessage(button.dataset.prompt)));
  }

  function toggleChat() {
    const panel = document.getElementById('connectChatPanel');
    const opening = !panel.classList.contains('open');
    panel.classList.toggle('open', opening);
    document.getElementById('connectChatToggle').setAttribute('aria-expanded', String(opening));
    if (opening) {
      if (!history.length) addMessage('assistant', 'Hi! I can help you find events, explain how Connect works, and suggest what to attend. What are you looking for?');
      document.getElementById('connectChatInput').focus();
    }
  }

  async function sendFromInput(event) {
    event.preventDefault();
    const input = document.getElementById('connectChatInput');
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    await sendMessage(text);
  }

  function getEvents() {
    const events = window.ConnectChatContext?.events;
    return Array.isArray(events) ? events : [];
  }

  function eventDate(date) {
    return new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }).format(new Date(date));
  }

  function recommendEvents(message) {
    const events = getEvents();
    if (!events.length) return 'Open Explore events to see the current event list. There you can search by topic and filter by university, category, and price.';

    const query = message.toLowerCase();
    const categoryMap = { music: 'Music', workshop: 'Workshop', workshops: 'Workshop', sport: 'Sports', sports: 'Sports', talk: 'Talk', talks: 'Talk', panel: 'Talk', community: 'Community' };
    const category = Object.keys(categoryMap).find((word) => query.includes(word));
    const university = ['LAU', 'AUB', 'NDU'].find((name) => query.includes(name.toLowerCase()));
    const price = query.includes('free') ? 'Free' : query.includes('paid') ? 'Paid' : '';
    let matches = events.filter((event) => (!category || event.category === categoryMap[category]) && (!university || event.university === university) && (!price || event.price === price));
    if (!matches.length) matches = events.slice(0, 3);
    const list = matches.slice(0, 3).map((event) => `• ${event.title} — ${eventDate(event.date)}, ${event.university}${event.price === 'Free' ? ' (Free)' : ''}`).join('\n');
    return `Here are good options based on that:\n${list}\n\nYou can use the filters on Explore events to narrow the list further.`;
  }

  function getAnswer(message) {
    const query = message.toLowerCase().trim();
    if (/\b(hi|hello|hey)\b/.test(query)) return 'Hi! Tell me what you enjoy—music, workshops, talks, sports, or a free event—and I’ll point you in the right direction.';
    if (/register|registration|sign up for (an )?event|join (an )?event/.test(query)) return 'Open the event from Explore events and choose Register. Once registration is complete, Connect provides your digital QR ticket. Keep it ready for check-in.';
    if (/ticket|qr|check.?in|scan/.test(query)) return 'After you register, your event ticket is a QR code. Open it on your phone at the event entrance so the organizer can scan it.';
    if (/sponsor/.test(query)) return 'Sponsors are visible only to logged-in students with a verified LAU, AUB, or NDU email. Sign in with your university email, then the Sponsors link will appear in the navigation.';
    if (/university|student|verified|private event|private/.test(query)) return 'Use and verify your LAU, AUB, or NDU email when you sign up. That unlocks student-only areas and campus-specific content.';
    if (/log ?in|password|account|sign ?up/.test(query)) return 'Use Sign up free to create an account, then verify the confirmation email. If you already have an account, use Log in from the navigation.';
    if (/become a sponsor|business|partner/.test(query)) return 'Choose Become a sponsor from the navigation to submit your business details. Sponsor applications are reviewed before they appear for students.';
    if (/recommend|suggest|find|event|free|music|workshop|sport|talk|panel|community|lau|aub|ndu/.test(query)) return recommendEvents(query);
    if (/how.*use|what.*connect|help/.test(query)) return 'Connect helps you discover university events, filter them by university and category, register, and keep a QR ticket for check-in. Students with verified university emails can also view Sponsors.';
    return 'I can help you find an event, explain registration and QR tickets, or guide you around Connect. Try asking “Find a free workshop” or “How do I register?”';
  }

  async function sendMessage(text) {
    const input = document.getElementById('connectChatInput');
    const send = document.getElementById('connectChatSend');
    addMessage('user', text);
    history.push({ role: 'user', content: text });
    if (history.length > 20) history.splice(0, history.length - 20);
    const waiting = addMessage('assistant', 'Finding the best answer…', 'loading');
    input.disabled = true;
    send.disabled = true;

    try {
      const response = await ConnectAccess.api('/api/chatbot', {
        method: 'POST',
        body: JSON.stringify({ question: text, history: history.slice(0, -1).slice(-6) })
      });
      const answer = response.data.answer;
      waiting.remove();
      addMessage('assistant', answer);
      history.push({ role: 'assistant', content: answer });
      if (history.length > 20) history.splice(0, history.length - 20);
    } catch (error) {
      waiting.remove();
      const fallback = getAnswer(text);
      addMessage('assistant', `${fallback}\n\n(Connect Guide AI is temporarily unavailable; this answer uses the built-in help guide.)`);
    } finally {
      input.disabled = false;
      send.disabled = false;
      input.focus();
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', buildWidget);
  else buildWidget();
})();
