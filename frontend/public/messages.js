// messages.js
// assumes common helpers are available globally (authFetch, showToast, formatDate)
// If you used modules, adapt imports accordingly.

const Messages = (function () {
  let currentConversationId = null;
  let pollingInterval = null;

  function el(q) { return document.querySelector(q); }
  function createThreadItem(thread) {
    const li = document.createElement('li');
    li.className = 'p-3 hover:bg-neutral-800 rounded-md cursor-pointer';
    const title = thread.members?.filter(m => m.user?.email !== localStorage.getItem('userEmail')).map(m => m.user?.name || m.user?.email).join(', ') || 'Conversation';
    const last = thread.messages?.[0];
    li.innerHTML = `<div class="flex items-center justify-between"><div><div class="font-semibold">${title}</div><div class="text-xs text-neutral-400">${last?.body ? (last.body.length>60 ? last.body.slice(0,60)+'...' : last.body) : 'No messages yet'}</div></div><div class="text-xs text-neutral-500">${last ? new Date(last.createdAt).toLocaleTimeString() : ''}</div></div>`;
    li.addEventListener('click', () => openConversation(thread));
    return li;
  }

  async function loadThreads() {
    const list = document.getElementById('threadList');
    list.innerHTML = `<div class="p-4 text-neutral-400">Loading threads…</div>`;
    try {
      const res = await authFetch(`${API_BASE}/api/messages/threads`);
      if (!res.ok) { list.innerHTML = `<div class="p-4 text-red-400">Unable to load threads</div>`; return; }
      const threads = await res.json();
      list.innerHTML = '';
      if (!threads.length) { list.innerHTML = `<div class="p-4 text-neutral-400">No conversations yet</div>`; return; }
      threads.forEach(t => list.appendChild(createThreadItem(t)));
    } catch (err) {
      console.error(err);
      list.innerHTML = `<div class="p-4 text-red-400">Error loading threads</div>`;
    }
  }

  async function openConversation(thread) {
    currentConversationId = thread.id;
    document.getElementById('chat-name').textContent = thread.members?.filter(m => m.user?.email !== localStorage.getItem('userEmail')).map(m => m.user?.name).join(', ') || 'Conversation';
    // load messages
    await loadMessages(thread.id);
    // start polling
    if (pollingInterval) clearInterval(pollingInterval);
    pollingInterval = setInterval(() => loadMessages(thread.id), 3000);
  }

  async function loadMessages(conversationId) {
    const body = document.getElementById('chatBody');
    body.innerHTML = `<div class="text-neutral-400">Loading messages…</div>`;
    try {
      const res = await authFetch(`${API_BASE}/api/messages/${conversationId}`);
      if (!res.ok) { body.innerHTML = `<div class="text-red-400 p-4">Unable to load messages</div>`; return; }
      const messages = await res.json();
      body.innerHTML = '';
      messages.forEach(m => {
        const mine = m.senderId === localStorage.getItem('userId') || m.senderId === parseInt(localStorage.getItem('userId'));
        const wrap = document.createElement('div');
        wrap.className = (mine ? 'ml-auto max-w-[70%] px-3 py-2 rounded-2xl bg-gradient-to-r from-brand-600 to-fuchsia-500 text-white' : 'max-w-[70%] px-3 py-2 rounded-2xl bg-neutral-800 border border-white/10');
        wrap.innerHTML = `<div class="text-sm">${m.body}</div><div class="text-xs text-neutral-400 mt-1">${formatDate(m.createdAt)}</div>`;
        body.appendChild(wrap);
      });
      body.scrollTop = body.scrollHeight;
    } catch (err) {
      console.error(err);
      body.innerHTML = `<div class="text-red-400 p-2">Error loading messages</div>`;
    }
  }

  async function sendMessage(e) {
    e.preventDefault();
    const input = document.getElementById('chatInput');
    const text = input.value.trim();
    if (!text) return;
    if (!currentConversationId) { showToast('Select a conversation first'); return; }
    try {
      const res = await authFetch(`${API_BASE}/api/messages/${currentConversationId}`, {
        method: 'POST',
        body: JSON.stringify({ body: text })
      });
      if (!res.ok) { const err = await res.json(); showToast(err?.error || 'Send failed'); return; }
      input.value = '';
      await loadMessages(currentConversationId);
    } catch (err) {
      console.error(err);
      showToast('Send error');
    }
  }

  function attach() {
    document.getElementById('chatForm').addEventListener('submit', sendMessage);
    document.getElementById('thread-search').addEventListener('input', (e) => {
      // basic client-side filter
      const q = e.target.value.toLowerCase();
      document.querySelectorAll('#threadList li').forEach(li => {
        li.style.display = li.textContent.toLowerCase().includes(q) ? '' : 'none';
      });
    });
  }

  return { init: () => { loadThreads(); attach(); }, loadThreads, openConversation };
})();

// Expose to window for HTML to call without modules
window.Messages = Messages;
