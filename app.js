const tg = window.Telegram?.WebApp;
try { tg?.ready(); tg?.expand(); } catch (e) {}

const el = id => document.getElementById(id);
const money = n => (n || 0).toLocaleString('uz-UZ');
const rlabel = r => ({ Epic: 'Epic', Legendary: 'Legendary', Mighty: 'Mighty' }[r] || r);

const state = {
  user: { coin: 0, chakra: 0, cash_balance: 0 },
  cards: [], spells: [], shop: null,
  pick: [],                 // selected card ids for team-select
  arena: null,              // {queued:true} or full match view or null
  battleAttacker: null, battleTarget: null, battleSpells: [],
  pollTimer: null,
};

let toastTimer;
function toast(msg) {
  const t = el('toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
}

async function api(path, opts = {}) {
  try {
    const r = await fetch(path, { ...opts, headers: { 'Content-Type': 'application/json', 'X-Telegram-Init-Data': tg?.initData || '', ...(opts.headers || {}) } });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) { toast(d.error || 'Server xatosi.'); return null; }
    return d;
  } catch (e) { toast('Serverga ulanib bo‘lmadi.'); return null; }
}

function paintTop() {
  el('bal-coin').textContent = money(state.user.coin);
  el('bal-chakra').textContent = money(state.user.chakra);
  el('bal-cash').textContent = money(state.user.cash_balance);
}

function applyUserPayload(d) {
  if (!d) return;
  if (d.user) state.user = d.user;
  if (d.cards) state.cards = d.cards;
  if (d.spells) state.spells = d.spells;
  paintTop();
}

/* ---------------- Navigation ---------------- */
document.querySelectorAll('.nav-btn').forEach(b => b.addEventListener('click', () => switchScreen(b.dataset.screen)));
function switchScreen(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.screen === name));
  el('screen-' + name).classList.add('active');
  if (name === 'cards') paintCards();
  if (name === 'spells') paintSpells();
  if (name === 'shop') paintShop();
  if (name === 'arena') paintArenaScreen();
  if (name === 'profile') paintProfile();
}

/* ---------------- Cards ---------------- */
function cardHTML(c) {
  const canMerge = c.next_id && c.qty >= 5;
  const upCost = c.rarity === 'Epic' ? 150 : 500;
  const canCoinUp = c.next_id && c.qty >= 1 && state.user.coin >= upCost;
  return `<article class="card">
    <span class="rarity ${c.rarity}">${rlabel(c.rarity)}</span>
    <span class="owned-badge">x${c.qty}</span>
    <img src="${c.image_url}" alt="${c.name}">
    <div class="body">
      <div class="name">${c.name}</div>
      <div class="meta">${c.form} · ${c.ability_name}</div>
      <div class="stats">
        <span class="mini-stat">⚔️ ${c.attack}</span>
        <span class="mini-stat">🛡️ ${c.defense}</span>
        <span class="mini-stat">❤️ ${c.hp}</span>
      </div>
      ${c.next_id ? `<div class="mini-row">
        <button class="small-btn ${canMerge ? 'good' : ''}" ${canMerge ? '' : 'disabled'} data-merge="${c.id}">5 ta → Upgrade</button>
        <button class="small-btn ${canCoinUp ? 'primary' : ''}" ${canCoinUp ? '' : 'disabled'} data-coinup="${c.id}">🪙 ${upCost}</button>
      </div>` : ''}
    </div>
  </article>`;
}
function paintCards() {
  const owned = state.cards.filter(c => c.qty > 0);
  el('card-grid').innerHTML = owned.length ? owned.map(cardHTML).join('') : '<div class="empty">Hali kartangiz yo‘q. Do‘kondan xarid qiling.</div>';
  el('card-grid').querySelectorAll('[data-merge]').forEach(b => b.onclick = () => upgradeCard(+b.dataset.merge, 'merge'));
  el('card-grid').querySelectorAll('[data-coinup]').forEach(b => b.onclick = () => upgradeCard(+b.dataset.coinup, 'coin'));
}
async function upgradeCard(id, mode) {
  const d = await api('/api/cards/upgrade', { method: 'POST', body: JSON.stringify({ card_id: id, mode }) });
  if (d) { applyUserPayload(d); paintCards(); toast('✅ Karta upgrade qilindi.'); }
}

/* ---------------- Spells ---------------- */
function spellHTML(s) {
  return `<article class="card">
    <span class="rarity ${s.rarity}">${rlabel(s.rarity)}</span>
    <span class="owned-badge">x${s.qty || 0}</span>
    <img src="${s.image_url}" alt="${s.name}">
    <div class="body">
      <div class="name">${s.name}</div>
      <div class="meta">🔮 ${s.chakra_cost} Chakra · 🪙 ${money(s.coin_price)}</div>
      <div class="stats"><span class="mini-stat">⚡ ${s.power_min}–${s.power_max}</span></div>
      <div class="meta">${s.description}</div>
      <div class="mini-row"><button class="small-btn primary" data-buy-spell="${s.id}">Sotib olish</button></div>
    </div>
  </article>`;
}
let spellTab = 'Epic';
function paintSpells() {
  const rs = ['Epic', 'Legendary', 'Mighty'];
  el('spell-tabs').innerHTML = rs.map(r => `<button class="tab ${r === spellTab ? 'active' : ''}" data-r="${r}">${rlabel(r)}</button>`).join('');
  el('spell-tabs').querySelectorAll('[data-r]').forEach(b => b.onclick = () => { spellTab = b.dataset.r; paintSpells(); });
  const list = state.spells.filter(s => s.rarity === spellTab);
  el('spell-grid').innerHTML = list.length ? list.map(spellHTML).join('') : '<div class="empty">Bu toifada afsun yo‘q.</div>';
  el('spell-grid').querySelectorAll('[data-buy-spell]').forEach(b => b.onclick = () => buySpell(+b.dataset.buySpell));
}
async function buySpell(id) {
  const d = await api('/api/shop/spell', { method: 'POST', body: JSON.stringify({ spell_id: id }) });
  if (d) { applyUserPayload(d); paintSpells(); toast('✅ Afsun sotib olindi.'); }
}

/* ---------------- Shop ---------------- */
async function paintShop() {
  if (!state.shop) {
    const d = await api('/api/shop');
    if (!d) return;
    state.shop = d;
  }
  el('shop-cards').innerHTML = state.shop.cards.map(c => {
    const owned = state.cards.find(x => x.id === c.id);
    const canBuy = state.user.coin >= c.coin_price;
    return `<article class="card">
      <span class="rarity ${c.rarity}">${rlabel(c.rarity)}</span>
      ${owned ? `<span class="owned-badge">x${owned.qty}</span>` : ''}
      <img src="${c.image_url}" alt="${c.name}">
      <div class="body">
        <div class="name">${c.name}</div>
        <div class="meta">${c.form}</div>
        <div class="mini-row"><button class="small-btn ${canBuy ? 'primary' : ''}" ${canBuy ? '' : 'disabled'} data-buy-card="${c.id}">🪙 ${money(c.coin_price)}</button></div>
      </div>
    </article>`;
  }).join('');
  el('shop-cards').querySelectorAll('[data-buy-card]').forEach(b => b.onclick = () => buyCard(+b.dataset.buyCard));

  el('shop-chakra').innerHTML = state.shop.chakra_packages.map(p => {
    const canBuy = state.user.coin >= p.coin;
    return `<article class="card"><div class="body" style="text-align:center;padding:18px 10px">
      <div class="name">🔮 +${p.chakra} Chakra</div>
      <div class="mini-row"><button class="small-btn ${canBuy ? 'primary' : ''}" ${canBuy ? '' : 'disabled'} data-buy-chakra="${p.coin}">🪙 ${money(p.coin)}</button></div>
    </div></article>`;
  }).join('');
  el('shop-chakra').querySelectorAll('[data-buy-chakra]').forEach(b => b.onclick = () => buyChakra(+b.dataset.buyChakra));
}
async function buyCard(id) {
  const d = await api('/api/shop/card', { method: 'POST', body: JSON.stringify({ card_id: id }) });
  if (d) { applyUserPayload(d); state.shop = null; paintShop(); toast('✅ Karta sotib olindi.'); }
}
async function buyChakra(coin) {
  const d = await api('/api/shop/chakra', { method: 'POST', body: JSON.stringify({ coin }) });
  if (d) { applyUserPayload(d); paintShop(); toast('✅ Chakra qo‘shildi.'); }
}

/* ---------------- Profile ---------------- */
function paintProfile() {
  const total = state.cards.reduce((a, c) => a + c.qty, 0);
  el('profile-card').innerHTML = `
    <div class="profile-row"><span>👤 Ism</span><b>${state.user.name || state.user.first_name || 'Player'}</b></div>
    <div class="profile-row"><span>🪙 Coin</span><b>${money(state.user.coin)}</b></div>
    <div class="profile-row"><span>🔮 Chakra</span><b>${money(state.user.chakra)}</b></div>
    <div class="profile-row"><span>💵 Balans</span><b>${money(state.user.cash_balance)} so‘m</b></div>
    <div class="profile-row"><span>🎴 Jami kartalar</span><b>${total}</b></div>`;
}

/* ---------------- Arena ---------------- */
function stopPoll() { if (state.pollTimer) { clearInterval(state.pollTimer); state.pollTimer = null; } }

function paintArenaScreen() {
  stopPoll();
  if (state.arena && state.arena.match) { renderBattle(state.arena); return; }
  if (state.arena && state.arena.queued) { renderQueue(); pollQueue(); return; }
  renderTeamSelect();
}

function renderTeamSelect() {
  el('arena-setup').style.display = ''; el('arena-queue').style.display = 'none'; el('arena-live').style.display = 'none';
  const owned = state.cards.filter(c => c.qty > 0);
  if (owned.length < 5) {
    el('arena-setup').innerHTML = `<div class="glass" style="text-align:center;padding:40px 16px">
      <div style="font-size:32px;margin-bottom:10px">🎴</div>
      <p>Arenaga kirish uchun kamida <b>5 xil karta</b> kerak. Hozir: ${owned.length} ta.</p>
      <div style="margin-top:14px"><button class="btn primary" onclick="switchScreen('shop')">🏪 Do‘konga o‘tish</button></div>
    </div>`;
    return;
  }
  el('arena-setup').innerHTML = `<div class="glass">
    <div class="section-head" style="margin:0 0 6px"><div><h2 style="font-size:17px">⚔️ Jamoani tanlang</h2><p>Aynan 5 ta karta tanlang — haqiqiy raqib bilan jang qilasiz</p></div></div>
    <div id="pick-grid" class="select-grid"></div>
    <div id="pick-chosen" class="chosen-row"></div>
    <button class="btn primary" id="start-arena-btn" disabled>⚔️ Raqib qidirish</button>
  </div>`;
  renderPickGrid(owned);
  el('start-arena-btn').onclick = startArena;
}
function renderPickGrid(owned) {
  el('pick-grid').innerHTML = owned.map(c => `<div class="slot ${state.pick.includes(c.id) ? 'picked' : ''}" data-pick="${c.id}">
    <img src="${c.image_url}" alt="">
    <b>${c.name}</b>
    <div class="meta">${rlabel(c.rarity)} · ⚔️${c.attack}</div>
  </div>`).join('');
  el('pick-grid').querySelectorAll('[data-pick]').forEach(s => s.onclick = () => togglePick(+s.dataset.pick, owned));
  el('pick-chosen').innerHTML = state.pick.map((id, i) => { const c = owned.find(x => x.id === id); return `<span class="tag">${i + 1}. ${c ? c.name : ''}</span>`; }).join('');
  el('start-arena-btn').toggleAttribute('disabled', state.pick.length !== 5);
}
function togglePick(id, owned) {
  if (state.pick.includes(id)) state.pick = state.pick.filter(x => x !== id);
  else if (state.pick.length < 5) state.pick.push(id);
  renderPickGrid(owned);
}
async function startArena() {
  if (state.pick.length !== 5) return;
  const d = await api('/api/arena/start', { method: 'POST', body: JSON.stringify({ card_ids: state.pick }) });
  state.pick = [];
  if (!d) return;
  state.arena = d;
  paintArenaScreen();
}

function renderQueue() {
  el('arena-setup').style.display = 'none'; el('arena-live').style.display = 'none';
  const q = el('arena-queue'); q.style.display = '';
  q.innerHTML = `<div class="glass queue-box">
    <div class="spinner"></div>
    <h3>Raqib qidirilmoqda…</h3>
    <p style="color:var(--muted);margin-top:6px">Hech kim topilmasa, bir necha soniyada bot bilan jang boshlanadi.</p>
    <button class="btn" id="cancel-queue-btn" style="margin-top:18px">Bekor qilish</button>
  </div>`;
  el('cancel-queue-btn').onclick = async () => { await api('/api/arena/queue/cancel', { method: 'POST' }); stopPoll(); state.arena = null; paintArenaScreen(); };
}
function pollQueue() {
  state.pollTimer = setInterval(async () => {
    const d = await api('/api/arena/queue/status');
    if (!d) return;
    if (d.match) { stopPoll(); state.arena = d; paintArenaScreen(); return; }
    state.arena = d;
  }, 1500);
}

function hpPct(c) { return Math.max(0, Math.round((c.hp_now / c.hp) * 100)); }
function battleCardHTML(c, side) {
  const dead = !c.alive;
  const pct = hpPct(c);
  const selected = (side === 'me' && state.battleAttacker === c.id) || (side === 'opp' && state.battleTarget === c.id);
  return `<div class="bcard ${dead ? 'dead' : ''} ${selected ? 'sel' : ''}" data-side="${side}" data-id="${c.id}">
    <img src="${c.image_url}" alt="">
    <div class="info">
      <b>${c.name}</b>
      <div class="hp-bar"><div class="hp-fill ${pct <= 30 ? 'low' : ''}" style="width:${pct}%"></div></div>
    </div>
  </div>`;
}
function renderBattle(v) {
  state.arena = v;
  applyUserPayload(v);
  el('arena-setup').style.display = 'none'; el('arena-queue').style.display = 'none';
  const live = el('arena-live'); live.style.display = '';

  if (v.match.finished) {
    stopPoll();
    const win = v.match.winner_is_me;
    live.innerHTML = `
      <div class="result-banner ${win ? 'win' : 'lose'}">
        <div class="big">${win ? '🏆' : '💀'}</div>
        <h2>${win ? 'G‘alaba!' : 'Mag‘lubiyat'}</h2>
      </div>
      <div class="log">${v.events.slice().reverse().map(e => `<div class="event">${e.text}</div>`).join('')}</div>
      <button class="btn primary" id="rematch-btn" style="margin-top:14px">⚔️ Yana o‘ynash</button>`;
    el('rematch-btn').onclick = () => { state.arena = null; state.battleAttacker = null; state.battleTarget = null; state.battleSpells = []; paintArenaScreen(); };
    return;
  }

  const ownedSpells = state.spells.filter(s => (s.qty || 0) > 0);
  live.innerHTML = `
    <div class="turn-banner ${v.my_turn ? 'mine' : 'theirs'}">${v.my_turn ? '🟢 Sizning navbatingiz!' : `⏳ ${v.opponent_name} navbati…`}</div>
    <div class="vs-row"><span>Siz</span><span>VS</span><span>${v.opponent_name}${v.is_bot ? ' 🤖' : ''}</span></div>
    <div class="battle-cols">
      <div class="battle-col"><h4>Sizning jamoa</h4>${v.team.map(c => battleCardHTML(c, 'me')).join('')}</div>
      <div class="battle-col"><h4>Raqib</h4>${v.opponents.map(c => battleCardHTML(c, 'opp')).join('')}</div>
    </div>
    ${ownedSpells.length ? `<div class="spell-row">${ownedSpells.map(s => `<div class="spell-chip ${state.battleSpells.includes(s.id) ? 'sel' : ''}" data-spell="${s.id}">
        <img src="${s.image_url}" alt=""><span>${s.name} (🔮${s.chakra_cost})</span></div>`).join('')}</div>` : ''}
    <button class="btn primary" id="attack-btn" ${v.my_turn ? '' : 'disabled'}>⚔️ Zarba berish</button>
    <div class="log">${v.events.slice().reverse().map(e => `<div class="event">${e.text}</div>`).join('')}</div>`;

  live.querySelectorAll('[data-side="me"]').forEach(elx => elx.onclick = () => {
    if (elx.classList.contains('dead')) return;
    state.battleAttacker = +elx.dataset.id; renderBattle(v);
  });
  live.querySelectorAll('[data-side="opp"]').forEach(elx => elx.onclick = () => {
    if (elx.classList.contains('dead')) return;
    state.battleTarget = +elx.dataset.id; renderBattle(v);
  });
  live.querySelectorAll('[data-spell]').forEach(elx => elx.onclick = () => {
    const id = +elx.dataset.spell;
    state.battleSpells = state.battleSpells.includes(id) ? state.battleSpells.filter(x => x !== id) : [...state.battleSpells, id];
    renderBattle(v);
  });
  const btn = el('attack-btn');
  if (btn) btn.onclick = submitMove;

  if (!state.pollTimer) {
    state.pollTimer = setInterval(async () => {
      const d = await api(`/api/arena/${v.match.id}/state`);
      if (d) renderBattle(d);
    }, 2000);
  }
}
async function submitMove() {
  const v = state.arena;
  if (!v || !v.my_turn) return;
  const attacker = state.battleAttacker || (v.team.find(c => c.alive) || {}).id;
  const target = state.battleTarget || (v.opponents.find(c => c.alive) || {}).id;
  if (!attacker || !target) { toast('Karta tanlang.'); return; }
  const d = await api(`/api/arena/${v.match.id}/move`, { method: 'POST', body: JSON.stringify({ attacker_id: attacker, target_id: target, spell_ids: state.battleSpells }) });
  state.battleAttacker = null; state.battleTarget = null; state.battleSpells = [];
  if (d) renderBattle(d);
}

/* ---------------- Boot ---------------- */
async function boot() {
  const me = await api('/api/me');
  if (!me) { toast('Yuklab bo‘lmadi. Sahifani yangilang.'); return; }
  applyUserPayload(me);
  paintCards();
  const q = await api('/api/arena/queue/status');
  if (q) state.arena = q;
}
boot();
