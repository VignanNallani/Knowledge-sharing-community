// slots.js
// simple slots UI: create slot (mentor) + list all slots + book (member)

const Slots = (function () {
  const slotGrid = () => document.getElementById('slotGrid');
  const API = 'http://localhost:4000';

  async function loadSlots() {
    const grid = slotGrid();
    grid.innerHTML = `<div class="p-4 text-neutral-400">Loading slots…</div>`;
    try {
      // public endpoint for slots. Adjust to your routes if different.
      const res = await authFetch(`${API}/api/slots`);
      if (!res.ok) { grid.innerHTML = `<div class="p-4 text-red-400">Unable to load slots</div>`; return; }
      const slots = await res.json();
      if (!slots.length) { grid.innerHTML = `<div class="p-4 text-neutral-400">No slots available</div>`; return; }
      grid.innerHTML = '';
      slots.forEach(s => {
        const card = document.createElement('div');
        card.className = 'p-4 rounded-2xl bg-neutral-900 border border-white/10';
        const start = new Date(s.start).toLocaleString();
        const end = new Date(s.end).toLocaleString();
        const booked = s.booking ? true : false;
        card.innerHTML = `<p class="text-sm text-neutral-400">Mentor: ${s.mentor?.name || s.mentorId || '—'}</p>
                          <p class="font-semibold mt-1">${start} — ${end}</p>
                          <div class="mt-3">
                            <button class="btn w-full ${booked ? 'opacity-60 cursor-not-allowed' : ''}" data-slot-id="${s.id}" ${booked ? 'disabled' : ''}>${booked ? 'Booked' : 'Book'}</button>
                          </div>`;
        grid.appendChild(card);
      });

      // attach booking handlers
      grid.querySelectorAll('button[data-slot-id]').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const id = e.currentTarget.getAttribute('data-slot-id');
          try {
            const r = await authFetch(`${API}/api/slots/${id}/book`, { method: 'POST' });
            if (!r.ok) { const err = await r.json(); showToast(err?.error || 'Booking failed'); return; }
            showToast('Booked!');
            loadSlots();
          } catch (err) { console.error(err); showToast('Booking error'); }
        });
      });
    } catch (err) {
      console.error(err);
      grid.innerHTML = `<div class="p-4 text-red-400">Error loading slots</div>`;
    }
  }

  async function createSlot(e) {
    e.preventDefault();
    const start = document.getElementById('slot-start').value;
    const end = document.getElementById('slot-end').value;
    if (!start || !end) { showToast('Provide start and end'); return; }
    try {
      const res = await authFetch(`${API}/api/slots`, { method: 'POST', body: JSON.stringify({ start, end }) });
      if (!res.ok) { const err = await res.json(); showToast(err?.error || 'Create failed'); return; }
      showToast('Slot created');
      document.getElementById('slot-start').value = '';
      document.getElementById('slot-end').value = '';
      loadSlots();
    } catch (err) {
      console.error(err);
      showToast('Create error');
    }
  }

  function attach() {
    const form = document.getElementById('slotForm');
    if (form) form.addEventListener('submit', createSlot);
    loadSlots();
  }

  return { init: attach, loadSlots };
})();

window.Slots = Slots;
