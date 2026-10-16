/* =============================================
   FINDBARBER — FULL APP LOGIC v2
   ============================================= */

// ─── GLOBAL STATE ────────────────────────────
const state = {
  role: null,
  customer: { name: '', phone: '', email: '', location: '', initials: '' },
  barber: {
    name: '', shop: '', phone: '', address: '',
    open: '09:00', close: '21:00',
    chairs: 4, slotDuration: 30,
    openDays: [0,1,2,3,4,5],   // 0=Sun … 6=Sat
    services: [],
  },
  selectedSalon: null,
  selectedServices: [],
  selectedDate: null,
  selectedSlot: null,
  bookingId: null,
  timelineEntries: [],
  bookings: [],       // all confirmed bookings
  blocks: [           // barber-defined capacity blocks
    {
      date: 'today',
      from: '14:00',
      to: '17:00',
      chairs: 3,
      reason: 'Staff shortage: 3 of 4 barbers on duty',
      rawDate: new Date().toISOString().split('T')[0]
    }
  ],
  walkInCount: 0,
  delayMins: 0,
  blockChairTemp: 3,
  barberSlotDate: null,
};

const DAYS  = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const ICONS = ['&#9988;&#65039;','&#129492;','&#128136;','&#128167;','&#10024;','&#127807;','&#9996;&#65039;','&#128082;'];

// ─── PRESETS ─────────────────────────────────
const SERVICE_PRESETS = [
  { name:'Haircut',      price:200, duration:30 },
  { name:'Beard Trim',   price:100, duration:20 },
  { name:'Skin Fade',    price:250, duration:40 },
  { name:'Hair Wash',    price:80,  duration:15 },
  { name:'Combo Cut',    price:280, duration:50 },
  { name:'Hair Spa',     price:350, duration:60 },
  { name:'Shave',        price:120, duration:25 },
  { name:'Kids Cut',     price:150, duration:25 },
];

// ─── DEMO SALONS (customer view) ─────────────
const SALONS = [
  { id:1, name:'Classic Cuts',       barber:'Ravi Kumar',
    address:'12 MG Road, Koramangala, Bangalore',
    emoji:'&#9988;', rating:4.8, dist:'0.4 km', wait:'~10 min',
    tags:['Haircut','Beard','Fade'] },
  { id:2, name:'The Barber Lounge',  barber:'Pradeep Sharma',
    address:'56 Indiranagar, 100 Ft Road, Bangalore',
    emoji:'&#128136;', rating:4.6, dist:'0.9 km', wait:'~5 min',
    tags:['Styling','Hair Spa','Beard'] },
  { id:3, name:'Groom and Bloom',    barber:'Akshay Rao',
    address:'3rd Block, Jayanagar, Bangalore',
    emoji:'&#127815;', rating:4.9, dist:'1.3 km', wait:'No wait',
    tags:['Premium','Haircut','Shave'] },
];

// Demo services for customer salons (will be replaced by barber's own if logged in as barber)
const DEMO_SERVICES = [
  { id:'haircut', name:'Haircut',       price:200, duration:30, icon:'&#9988;&#65039;' },
  { id:'beard',   name:'Beard Trim',    price:100, duration:20, icon:'&#129492;' },
  { id:'combo',   name:'Haircut+Beard', price:280, duration:45, icon:'&#128136;' },
  { id:'wash',    name:'Hair Wash',     price:80,  duration:15, icon:'&#128167;' },
  { id:'fade',    name:'Skin Fade',     price:250, duration:40, icon:'&#10024;' },
  { id:'spa',     name:'Hair Spa',      price:350, duration:60, icon:'&#127807;' },
];

// Demo bookings (simulated existing) — {salonId, date:'today', time, chairs:1}
const DEMO_BOOKINGS = [
  { salonId:1, date:'today', time:'10:00', chairs:1, client:'Amit D.' },
  { salonId:1, date:'today', time:'10:00', chairs:1, client:'Rohan S.' },
  { salonId:1, date:'today', time:'10:00', chairs:1, client:'Kiran P.' },
  { salonId:1, date:'today', time:'12:00', chairs:1, client:'Suresh B.' },
  { salonId:1, date:'today', time:'14:00', chairs:1, client:'Varun M.' },
  { salonId:1, date:'today', time:'14:00', chairs:1, client:'Farhan Q.' },
  { salonId:1, date:'today', time:'17:30', chairs:1, client:'Deepak N.' },
  { salonId:1, date:'today', time:'18:00', chairs:1, client:'Ananya R.' },
];

// ─── NAVIGATION ──────────────────────────────
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const el = document.getElementById(id);
  if (el) { el.classList.add('active'); el.scrollTop = 0; }
}
function goBack(id) { showScreen(id); }
function selectRole(role) {
  state.role = role;
  showScreen(role === 'customer' ? 'screen-customer-register' : 'screen-barber-register');
}
function showLogin() { showToast('Login coming soon!'); }

// ─── CUSTOMER REGISTRATION ────────────────────
function completeCustomerRegister(e) {
  e.preventDefault();
  const name = document.getElementById('cust-name').value.trim();
  const phone = document.getElementById('cust-phone').value.trim();
  const email = document.getElementById('cust-email').value.trim();
  const loc   = document.getElementById('cust-location').value.trim();
  if (!name || !phone || !loc) return;
  state.customer = { name, phone, email, location: loc, initials: getInitials(name) };
  document.getElementById('cust-header-avatar').textContent = state.customer.initials;
  document.getElementById('cust-slot-avatar').textContent   = state.customer.initials;
  renderSalons();
  showScreen('screen-customer-salons');
  showToast('Welcome, ' + name.split(' ')[0] + '!');
}
function getInitials(n) { return n.split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase(); }

// ─── SALON RENDERING ─────────────────────────
function renderSalons() {
  const c = document.getElementById('salon-list');
  c.innerHTML = SALONS.map(s => `
    <div class="salon-card" id="salon-card-${s.id}" onclick="selectSalon(${s.id})">
      <div class="salon-avatar">${s.emoji}</div>
      <div class="salon-info">
        <div class="salon-name">${s.name}</div>
        <div class="salon-sub">${s.barber} &bull; ${s.address.split(',').slice(-2).join(',').trim()}</div>
        <div class="salon-tags">${s.tags.map(t=>'<span class="salon-tag">'+t+'</span>').join('')}</div>
      </div>
      <div class="salon-meta">
        <div class="salon-rating">&#9733; ${s.rating}</div>
        <div class="salon-dist">${s.dist}</div>
        <div class="salon-wait">${s.wait}</div>
      </div>
    </div>`).join('');
}

function selectSalon(id) {
  state.selectedSalon = SALONS.find(s=>s.id===id);
  state.selectedServices = [];
  document.querySelectorAll('.salon-card').forEach(c=>c.classList.remove('selected'));
  document.getElementById('salon-card-'+id).classList.add('selected');
  renderCustomerServices();
  const ss = document.getElementById('service-section');
  ss.style.display = 'flex'; ss.style.flexDirection = 'column'; ss.style.gap = '12px';
  setTimeout(()=>ss.scrollIntoView({behavior:'smooth',block:'nearest'}),100);
  updateServiceSummary();
}

function getActiveServices() {
  if (state.selectedSalon && (state.selectedSalon.id === 1 || state.selectedSalon.name === state.barber.shop) && state.barber.services && state.barber.services.length > 0) {
    return state.barber.services;
  }
  return DEMO_SERVICES;
}

function renderCustomerServices() {
  const svcs = getActiveServices();
  document.getElementById('service-list').innerHTML = svcs.map(s=>`
    <div class="service-card" id="svc-${s.id}" onclick="toggleService('${s.id}')">
      <div class="service-header">
        <span class="service-icon">${s.icon||'&#9988;&#65039;'}</span>
        <div class="service-check" id="svc-check-${s.id}"></div>
      </div>
      <div class="service-name">${s.name}</div>
      <div class="service-price">&#8377;${s.price}</div>
      <div class="service-duration">&#128336; ${s.duration} mins</div>
    </div>`).join('');
}

function toggleService(id) {
  const svcs = getActiveServices();
  const svc = svcs.find(s=>String(s.id)===String(id));
  const idx = state.selectedServices.findIndex(s=>String(s.id)===String(id));
  const card  = document.getElementById('svc-'+id);
  const check = document.getElementById('svc-check-'+id);
  if (idx>=0) {
    state.selectedServices.splice(idx,1);
    if (card) card.classList.remove('selected');
    if (check) check.innerHTML='';
  } else if (svc) {
    state.selectedServices.push(svc);
    if (card) card.classList.add('selected');
    if (check) check.innerHTML='&#10003;';
  }
  updateServiceSummary();
}

function updateServiceSummary() {
  const svcs = state.selectedServices;
  document.getElementById('summary-services').textContent = svcs.map(v=>v.name).join(', ')||'None';
  document.getElementById('summary-duration').textContent = svcs.reduce((s,v)=>s+v.duration,0)>0 ? svcs.reduce((s,v)=>s+v.duration,0)+' mins' : '—';
  document.getElementById('summary-total').textContent    = '&#8377;'+svcs.reduce((s,v)=>s+v.price,0);
  document.getElementById('btn-pick-slot').disabled = svcs.length===0;
}

// ─── SLOT SELECTION (CUSTOMER) ────────────────
function goToSlots() {
  if (!state.selectedSalon || state.selectedServices.length===0) return;
  const s = state.selectedSalon;
  const total = state.selectedServices.reduce((a,v)=>a+v.price,0);
  document.getElementById('slot-salon-info').innerHTML=`
    <div class="si-name">${s.name} &bull; ${s.barber}</div>
    <div class="si-sub">${s.address} &bull; Total: &#8377;${total}</div>`;
  renderCustomerDateStrip();
  renderCustomerSlots(0);
  showScreen('screen-customer-slots');
}

function renderCustomerDateStrip() {
  const today = new Date();
  const strip = document.getElementById('date-strip');
  strip.innerHTML = '';
  for (let i=0;i<7;i++) {
    const d = new Date(today); d.setDate(today.getDate()+i);
    const chip = document.createElement('div');
    chip.className = 'date-chip'+(i===0?' active':'');
    chip.innerHTML=`<span class="dc-day">${DAYS[d.getDay()]}</span><span class="dc-num">${d.getDate()}</span>${i<3?'<div class="dc-dot"></div>':''}`;
    chip.onclick=()=>{
      document.querySelectorAll('#date-strip .date-chip').forEach(c=>c.classList.remove('active'));
      chip.classList.add('active');
      state.selectedDate=d; state.selectedSlot=null;
      document.getElementById('slot-cta').style.display='none';
      renderCustomerSlots(i);
    };
    strip.appendChild(chip);
  }
  state.selectedDate=today;
}

function getSlotCapacity(salonId, dateKey, timeStr) {
  const totalChairs = (state.barber && state.barber.chairs && (salonId === 1 || (state.selectedSalon && state.selectedSalon.name === state.barber.shop))) ? state.barber.chairs : 4;
  const booked = DEMO_BOOKINGS.filter(b=>b.salonId===salonId && b.date===dateKey && b.time===timeStr).length;
  let effectiveChairs = totalChairs;
  for (const blk of state.blocks) {
    if (blk.date===dateKey && timeStr>=blk.from && timeStr<blk.to) {
      effectiveChairs = Math.min(effectiveChairs, blk.chairs);
    }
  }
  const available = Math.max(0, effectiveChairs - booked);
  return { total: effectiveChairs, booked, available };
}

function renderCustomerSlots(dayOffset) {
  const today  = new Date();
  const dateKey= dayOffset===0 ? 'today' : 'future-'+dayOffset;
  const basePrice = state.selectedServices.reduce((s,v)=>s+v.price,0);
  const isPeak = hr=>(hr>=9&&hr<11)||(hr>=13&&hr<15)||(hr>=17&&hr<20);
  const grid = document.getElementById('slots-grid');
  grid.innerHTML='';
  for (let h=9;h<21;h++) {
    for (let m of [0,30]) {
      const timeStr = pad(h)+':'+pad(m);
      const cap = getSlotCapacity(state.selectedSalon.id, dateKey, timeStr);
      const peak = isPeak(h);
      const discount = !peak ? Math.round(basePrice*0.1) : 0;
      const displayPrice = basePrice - discount;
      const isFull = cap.available<=0;
      const btn = document.createElement('button');
      btn.className = 'slot-btn';
      btn.disabled  = isFull;
      let capText='', capClass='';
      if      (isFull)           { capText='Full'; capClass='cap-none'; }
      else if (cap.available===1){ capText='1 left!'; capClass='cap-low'; }
      else if (cap.available<cap.total){ capText=cap.available+' left'; capClass='cap-low'; }
      else                        { capText=cap.total+' slots'; capClass='cap-ok'; }
      btn.innerHTML=`
        <div class="slot-time">${timeStr}</div>
        <div class="slot-tag ${isFull?'booked':peak?'peak':'off-peak'}">${isFull?'Full':peak?'Peak':'Off-Peak'}</div>
        ${!isFull?`<div class="slot-price">&#8377;${displayPrice}</div>`:''}
        <div class="slot-capacity ${capClass}">${capText}</div>
        ${!isFull&&!peak?`<div class="slot-discount">Save &#8377;${discount}</div>`:''}`;
      if (!isFull) btn.onclick=()=>selectCustomerSlot(timeStr,displayPrice,discount,peak,btn);
      grid.appendChild(btn);
    }
  }
}

function selectCustomerSlot(time,price,discount,isPeak,btnEl) {
  document.querySelectorAll('.slot-btn').forEach(b=>b.classList.remove('selected'));
  btnEl.classList.add('selected');
  state.selectedSlot={time,price,discount,isPeak};
  const duration=state.selectedServices.reduce((s,v)=>s+v.duration,0);
  const deposit=Math.round(price*0.25);
  const cta=document.getElementById('slot-cta'); cta.style.display='block';
  document.getElementById('selected-slot-display').innerHTML=
    '<strong>'+time+'</strong> &bull; '+duration+' mins &bull; Total: <strong>&#8377;'+price+'</strong>'+
    (discount>0?' <span style="color:#00897b">(Save &#8377;'+discount+')</span>':'')+
    '<br><span style="color:#888">Deposit required: <strong>&#8377;'+deposit+'</strong></span>';
}

// ─── BOOKING CONFIRMATION ─────────────────────
function goToPayment() {
  if (!state.selectedSlot) return;
  const bookingId='FB-'+Math.random().toString(36).substring(2,8).toUpperCase();
  state.bookingId=bookingId;
  const deposit=Math.round(state.selectedSlot.price*0.25);
  const duration=state.selectedServices.reduce((s,v)=>s+v.duration,0);
  const svcNames=state.selectedServices.map(v=>v.name).join(', ');
  const d=state.selectedDate||new Date();
  const dateStr=d.toLocaleDateString('en-IN',{weekday:'short',day:'numeric',month:'short'});
  const isToday = d.toDateString() === new Date().toDateString();
  const dateKey = isToday ? 'today' : 'future-1';

  // Store booking
  state.bookings.push({
    id:bookingId, client:state.customer.name, date:d, dateStr,
    time:state.selectedSlot.time, duration, services:svcNames,
    salon:state.selectedSalon.name, barber:state.selectedSalon.barber,
    address:state.selectedSalon.address, deposit, total:state.selectedSlot.price,
    status:'confirmed',
  });

  // Track in active slot reservations
  DEMO_BOOKINGS.push({
    salonId: state.selectedSalon.id,
    date: dateKey,
    time: state.selectedSlot.time,
    chairs: 1,
    client: state.customer.name,
    bookingId: bookingId
  });

  // Add to live barber timeline
  state.timelineEntries.push({
    time: state.selectedSlot.time,
    client: state.customer.name,
    services: svcNames,
    duration,
    status: 'upcoming',
    payment: 'paid',
    amount: state.selectedSlot.price,
    deposit,
    bookingId: bookingId
  });
  state.timelineEntries.sort((a,b)=>a.time.localeCompare(b.time));
  updateStats();

  // Fill pass
  document.getElementById('pass-client').textContent  = state.customer.name;
  document.getElementById('pass-date').textContent    = dateStr;
  document.getElementById('pass-time').textContent    = state.selectedSlot.time;
  document.getElementById('pass-duration').textContent= duration+' mins';
  document.getElementById('pass-salon').textContent   = state.selectedSalon.name;
  document.getElementById('pass-barber').textContent  = state.selectedSalon.barber;
  document.getElementById('pass-address').textContent = state.selectedSalon.address;
  document.getElementById('pass-services').textContent= svcNames;
  document.getElementById('pass-deposit').textContent = '&#8377;'+deposit+' Paid';
  document.getElementById('pass-id-text').textContent = bookingId;
  // Reset cancel button
  const cancelBtn = document.getElementById('btn-cancel-booking');
  cancelBtn.disabled = false;
  cancelBtn.textContent = '✕ Cancel Booking';
  cancelBtn.style.background = '';
  cancelBtn.style.color = '';
  cancelBtn.style.borderColor = '';
  showScreen('screen-customer-confirm');
  showToast('Deposit of &#8377;'+deposit+' processed!');
}

function cancelBooking() {
  const booking = state.bookings.find(b=>b.id===state.bookingId);
  if (!booking) return;
  // Check 6-hour rule
  const appt = new Date(booking.date);
  const [h,m] = booking.time.split(':').map(Number);
  appt.setHours(h,m,0,0);
  const now = new Date();
  const diffHours = (appt - now) / (1000*60*60);
  if (diffHours < 6) {
    const hoursLeft = Math.max(0, Math.round(diffHours * 10) / 10);
    showToast('Cannot cancel — appointment is in '+hoursLeft+' hrs. Cancellations permitted only 6+ hours in advance.');
    return;
  }
  booking.status = 'cancelled';
  // Free up the slot in DEMO_BOOKINGS
  const dbIdx = DEMO_BOOKINGS.findIndex(b => b.bookingId === booking.id);
  if (dbIdx >= 0) DEMO_BOOKINGS.splice(dbIdx, 1);
  // Remove from barber timeline
  const tlIdx = state.timelineEntries.findIndex(e => e.bookingId === booking.id);
  if (tlIdx >= 0) {
    state.timelineEntries.splice(tlIdx, 1);
    renderTimeline();
    updateStats();
  }
  const btn = document.getElementById('btn-cancel-booking');
  btn.disabled = true;
  btn.textContent = '✓ Booking Cancelled (Deposit Refunded)';
  btn.style.background = '#f5f5f5';
  btn.style.color = '#9e9e9e';
  btn.style.borderColor = '#e0e0e0';
  showToast('Booking cancelled! Full deposit refund of ₹'+booking.deposit+' initiated.');
}

function goHome() { showScreen('screen-customer-salons'); }
function sharePass() { showToast('Booking pass link copied!'); }

// ─── BARBER REGISTRATION ──────────────────────
function completeBarberRegister(e) {
  e.preventDefault();
  const name    = document.getElementById('barber-name').value.trim();
  const shop    = document.getElementById('barber-shop').value.trim();
  const phone   = document.getElementById('barber-phone').value.trim();
  const address = document.getElementById('barber-address').value.trim();
  const open    = document.getElementById('barber-open').value;
  const close   = document.getElementById('barber-close').value;
  if (!name||!shop||!phone||!address) return;
  state.barber = { ...state.barber, name, shop, phone, address, open, close, services:[] };
  SALONS[0].name = shop;
  SALONS[0].barber = name;
  SALONS[0].address = address;
  renderPresetChips();
  showScreen('screen-barber-services-setup');
}

// ─── BARBER SETUP: SERVICES ───────────────────
function renderPresetChips() {
  const c = document.getElementById('preset-chips');
  c.innerHTML = SERVICE_PRESETS.map((p,i)=>
    `<button class="preset-chip" id="preset-${i}" onclick="addPreset(${i})">${p.name} &bull; &#8377;${p.price}</button>`
  ).join('');
}

function addPreset(idx) {
  const p = SERVICE_PRESETS[idx];
  if (state.barber.services.find(s=>s.name===p.name)) {
    showToast(p.name+' already added!'); return;
  }
  const svc = { id:'svc-'+Date.now()+'-'+idx, name:p.name, price:p.price, duration:p.duration, icon:ICONS[idx%ICONS.length] };
  state.barber.services.push(svc);
  document.getElementById('preset-'+idx).classList.add('added');
  renderAddedServicesList();
  showToast(p.name+' added!');
}

function addCustomService() {
  const name     = document.getElementById('new-svc-name').value.trim();
  const price    = parseInt(document.getElementById('new-svc-price').value)||0;
  const duration = parseInt(document.getElementById('new-svc-duration').value)||30;
  if (!name) { showToast('Enter a service name'); return; }
  if (price<=0) { showToast('Enter a valid price'); return; }
  state.barber.services.push({ id:'svc-custom-'+Date.now(), name, price, duration, icon:'&#10024;' });
  document.getElementById('new-svc-name').value='';
  document.getElementById('new-svc-price').value='';
  document.getElementById('new-svc-duration').value='';
  renderAddedServicesList();
  showToast(name+' added!');
}

function renderAddedServicesList() {
  const c = document.getElementById('added-services-list');
  const svcs = state.barber.services;
  document.getElementById('svc-count-badge').textContent = svcs.length;
  document.getElementById('btn-services-next').disabled = svcs.length===0;
  if (svcs.length===0) {
    c.innerHTML='<div class="empty-services-hint">No services added yet. Use quick-add above or fill the form.</div>';
    return;
  }
  c.innerHTML = svcs.map((s,i)=>`
    <div class="added-svc-card">
      <div class="asc-icon">${s.icon}</div>
      <div class="asc-info">
        <div class="asc-name">${s.name}</div>
        <div class="asc-meta">&#128336; ${s.duration} mins</div>
      </div>
      <div class="asc-price">&#8377;${s.price}</div>
      <button class="asc-remove" onclick="removeService(${i})">&#10005;</button>
    </div>`).join('');
}

function removeService(idx) {
  state.barber.services.splice(idx,1);
  renderAddedServicesList();
  renderManagedServices();
}

function goToChairSetup() {
  if (state.barber.services.length===0) { showToast('Add at least one service'); return; }
  state.blockChairTemp = state.barber.chairs - 1;
  document.getElementById('chair-count-display').textContent = state.barber.chairs;
  document.getElementById('chair-hint-num').textContent      = state.barber.chairs;
  document.getElementById('block-chairs-total').textContent  = state.barber.chairs;
  document.getElementById('block-chairs-display').textContent= state.barber.chairs - 1;
  showScreen('screen-barber-chairs-setup');
}

// ─── BARBER SETUP: CHAIRS ─────────────────────
function adjustChairs(delta) {
  state.barber.chairs = Math.max(1, Math.min(10, state.barber.chairs + delta));
  document.getElementById('chair-count-display').textContent = state.barber.chairs;
  document.getElementById('chair-hint-num').textContent      = state.barber.chairs;
  document.getElementById('block-chairs-total').textContent  = state.barber.chairs;
  state.blockChairTemp = Math.min(state.blockChairTemp, state.barber.chairs);
}

function selectSlotDur(mins) {
  state.barber.slotDuration = mins;
  document.querySelectorAll('.slot-dur-opt').forEach(b=>b.classList.remove('active'));
  document.getElementById('dur-'+mins).classList.add('active');
}

function toggleDay(btn) {
  const day = parseInt(btn.dataset.day);
  const idx = state.barber.openDays.indexOf(day);
  if (idx>=0) {
    if (state.barber.openDays.length<=1) return; // keep at least 1 day
    state.barber.openDays.splice(idx,1);
    btn.classList.remove('active');
  } else {
    state.barber.openDays.push(day);
    btn.classList.add('active');
  }
}

function launchBarberDashboard() {
  document.getElementById('barber-header-shop').textContent = state.barber.shop;
  document.getElementById('barber-chairs-badge').textContent= state.barber.chairs+' chairs';
  const totalChairsEl = document.getElementById('block-chairs-total');
  if (totalChairsEl) totalChairsEl.textContent = state.barber.chairs;
  state.blockChairTemp = Math.max(1, state.barber.chairs - 1);
  const dispEl = document.getElementById('block-chairs-display');
  if (dispEl) dispEl.textContent = state.blockChairTemp;
  state.timelineEntries = buildDefaultTimeline();
  populateWalkInServices();
  renderBarberSchedule();
  renderManagedServices();
  renderBlocksList();
  // Set today's date on block form
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('block-date').value = today;
  switchTab('schedule');
  showScreen('screen-barber-schedule');
  showToast('Welcome, '+state.barber.name.split(' ')[0]+'! Your shop is live.');
}

// ─── BARBER DASHBOARD TABS ────────────────────
function switchTab(tabName) {
  document.querySelectorAll('.dash-tab').forEach(t=>t.classList.remove('active'));
  document.querySelectorAll('.dash-tab-content').forEach(c=>c.classList.remove('active'));
  document.getElementById('tab-'+tabName).classList.add('active');
  document.getElementById('dash-tab-'+tabName).classList.add('active');
  if (tabName==='slots') renderBarberSlotsView();
  if (tabName==='block') renderBlocksList();
  if (tabName==='services') renderManagedServices();
}

// ─── BARBER SCHEDULE / TIMELINE ───────────────
function buildDefaultTimeline() {
  const svcs = state.barber.services;
  const s0 = svcs[0]||{name:'Haircut',duration:30,price:200};
  const s1 = svcs[1]||{name:'Beard Trim',duration:20,price:100};
  const s2 = svcs[2]||{name:'Skin Fade',duration:40,price:250};
  return [
    { time:'09:00', client:'Amit Desai',     services:s0.name+'+'+s1.name, duration:s0.duration+s1.duration, status:'done',     payment:'paid',      amount:s0.price+s1.price, deposit:50 },
    { time:'09:50', client:'Rohan Singh',    services:s2.name,              duration:s2.duration,            status:'done',     payment:'paid',      amount:s2.price, deposit:50 },
    { time:'10:35', client:'Kiran Patel',    services:s0.name,              duration:s0.duration,            status:'inchair',  payment:'cash',      amount:s0.price, deposit:0 },
    { time:'11:10', client:'Suresh Bhat',    services:s1.name,              duration:s1.duration,            status:'upcoming', payment:'paid',      amount:s1.price, deposit:30 },
    { time:'11:35', client:'Varun Menon',    services:s0.name+'+'+s1.name, duration:s0.duration+s1.duration, status:'upcoming', payment:'paid',      amount:s0.price+s1.price, deposit:50 },
    { time:'12:25', client:'Farhan Qureshi', services:(svcs[5]||s0).name,   duration:(svcs[5]||s0).duration, status:'upcoming', payment:'paid',      amount:(svcs[5]||s0).price, deposit:70 },
    { time:'13:30', client:'Deepak Nair',    services:s0.name,              duration:s0.duration,            status:'upcoming', payment:'paid',      amount:s0.price, deposit:50 },
  ];
}

function renderBarberSchedule() {
  const today=new Date();
  document.getElementById('today-date-label').textContent=
    today.toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long'});
  renderTimeline();
  updateStats();
}

function renderTimeline() {
  const c=document.getElementById('barber-timeline');
  c.innerHTML=state.timelineEntries.map((e,i)=>{
    const lbl={upcoming:'Upcoming',inchair:'In Chair',done:'Done',walkin:'Walk-In',blocked:'Blocked'}[e.status]||e.status;
    const dep=e.deposit>0?'&#8377;'+e.deposit+' deposit':'No deposit';
    return `
      <div class="timeline-item">
        <div class="tl-time-col">
          <div class="tl-time">${e.time}</div>
          <div class="tl-dot status-${e.status}"></div>
        </div>
        <div class="tl-card status-${e.status}" onclick="toggleCardStatus(${i})">
          <div class="tl-card-top">
            <div class="tl-client">${e.client}</div>
            <div class="tl-status-badge badge-${e.status}">${lbl}</div>
          </div>
          <div class="tl-services">&#9988; ${e.services}</div>
          <div class="tl-card-bottom">
            <div class="tl-duration">&#128336; ${e.duration} mins &bull; &#8377;${e.amount}</div>
            <div class="tl-payment ${e.payment==='paid'?'paid':e.payment==='walkin-pay'?'walkin-pay':'cash'}">
              ${e.payment==='paid'?'&#10003; '+dep:e.payment==='walkin-pay'?'Walk-In':'Cash'}
            </div>
          </div>
        </div>
      </div>`;
  }).join('');
}

function toggleCardStatus(idx) {
  const e=state.timelineEntries[idx];
  const cycle=['upcoming','inchair','done'];
  if (e.status==='walkin'||e.status==='blocked') e.status='inchair';
  else { const i=cycle.indexOf(e.status); e.status=cycle[(i+1)%cycle.length]; }
  renderTimeline(); updateStats();
  showToast('Status: '+e.status.charAt(0).toUpperCase()+e.status.slice(1));
}

function updateStats() {
  const en=state.timelineEntries;
  document.getElementById('stat-bookings').textContent = en.filter(e=>e.status!=='blocked').length;
  document.getElementById('stat-done').textContent     = en.filter(e=>e.status==='done').length;
  document.getElementById('stat-revenue').textContent  = '&#8377;'+en.filter(e=>e.status==='done').reduce((s,e)=>s+e.amount,0);
  document.getElementById('stat-pending').textContent  = '&#8377;'+en.filter(e=>e.status!=='done').reduce((s,e)=>s+e.deposit,0);
  document.getElementById('queue-count').textContent   = en.filter(e=>e.status==='upcoming'||e.status==='walkin').length+' waiting';
}

// ─── BARBER SLOTS VIEW ────────────────────────
function renderBarberSlotsView() {
  // Build date strip if empty
  const strip = document.getElementById('barber-date-strip');
  if (!strip.innerHTML.trim()) {
    const today = new Date();
    for (let i=0;i<7;i++) {
      const d = new Date(today); d.setDate(today.getDate()+i);
      const chip = document.createElement('div');
      chip.className='date-chip'+(i===0?' active':'');
      chip.innerHTML=`<span class="dc-day">${DAYS[d.getDay()]}</span><span class="dc-num">${d.getDate()}</span>`;
      chip.onclick=()=>{
        document.querySelectorAll('#barber-date-strip .date-chip').forEach(c=>c.classList.remove('active'));
        chip.classList.add('active');
        state.barberSlotDate = i===0?'today':'future-'+i;
        renderBarberSlotGrid();
      };
      strip.appendChild(chip);
    }
    state.barberSlotDate='today';
  }
  renderBarberSlotGrid();
}

function renderBarberSlotGrid() {
  const dateKey = state.barberSlotDate||'today';
  const chairs  = state.barber.chairs||4;
  const grid    = document.getElementById('barber-slots-grid');
  grid.innerHTML='';
  for (let h=parseInt(state.barber.open);h<parseInt(state.barber.close);h++) {
    for (let m of [0,30]) {
      const timeStr=pad(h)+':'+pad(m);
      // Count demo bookings
      const booked=DEMO_BOOKINGS.filter(b=>b.salonId===1&&b.date===dateKey&&b.time===timeStr);
      const bookedCount=booked.length;
      // Check blocks
      let effectiveChairs=chairs;
      let isBlocked=false;
      for (const blk of state.blocks) {
        if (blk.date===dateKey&&timeStr>=blk.from&&timeStr<blk.to) {
          effectiveChairs=Math.min(effectiveChairs,blk.chairs);
          isBlocked=true;
        }
      }
      const available=Math.max(0,effectiveChairs-bookedCount);
      const pct=effectiveChairs>0?Math.min(100,Math.round((bookedCount/effectiveChairs)*100)):100;
      let rowCls='', fillCls='', tagCls='', tagLbl='';
      if (isBlocked && available===0) { rowCls='blocked-row'; fillCls='fill-blocked'; tagCls='bsg-tag-blocked'; tagLbl='Blocked'; }
      else if (available===0)         { rowCls='full-row';    fillCls='fill-full';    tagCls='bsg-tag-full';    tagLbl='Full'; }
      else if (bookedCount>0)         { rowCls='partial-row'; fillCls='fill-partial'; tagCls='bsg-tag-partial'; tagLbl=bookedCount+'/'+effectiveChairs+' booked'; }
      else                            { rowCls='';            fillCls='fill-free';    tagCls='bsg-tag-free';    tagLbl='Free'; }
      const clientNames=booked.map(b=>b.client).join(', ')||'—';
      grid.innerHTML+=`
        <div class="bsg-row ${rowCls}">
          <div class="bsg-time">${timeStr}</div>
          <div class="bsg-bar-wrap">
            <div class="bsg-bar"><div class="bsg-bar-fill ${fillCls}" style="width:${pct}%"></div></div>
            <div class="bsg-label">${available} of ${effectiveChairs} chairs free${isBlocked?' (Blocked)':''}</div>
          </div>
          <div class="bsg-clients">${bookedCount>0?clientNames:''}</div>
          <div class="bsg-status-tag ${tagCls}">${tagLbl}</div>
        </div>`;
    }
  }
}

// ─── BLOCK SLOTS ──────────────────────────────
function adjustBlockChairs(delta) {
  const max=state.barber.chairs||4;
  state.blockChairTemp=Math.max(0,Math.min(max,state.blockChairTemp+delta));
  document.getElementById('block-chairs-display').textContent=state.blockChairTemp;
}

function addBlock() {
  const date   = document.getElementById('block-date').value;
  const from   = document.getElementById('block-from').value;
  const to     = document.getElementById('block-to').value;
  const chairs = state.blockChairTemp;
  const reason = document.getElementById('block-reason').value.trim();
  if (!date||!from||!to) { showToast('Fill in date and time'); return; }
  if (from>=to) { showToast('From time must be before To time'); return; }
  const dateKey = date===new Date().toISOString().split('T')[0]?'today':date;
  state.blocks.push({date:dateKey,from,to,chairs,reason,rawDate:date});
  renderBlocksList();
  renderBarberSlotGrid();
  document.getElementById('block-reason').value='';
  showToast('Block added: '+from+' to '+to+' ('+chairs+' barbers available)');
}

function removeBlock(idx) {
  state.blocks.splice(idx,1);
  renderBlocksList();
  renderBarberSlotGrid();
  showToast('Block removed');
}

function renderBlocksList() {
  const c=document.getElementById('blocks-list');
  if (state.blocks.length===0) { c.innerHTML='<div class="empty-hint">No blocks added yet.</div>'; return; }
  c.innerHTML=state.blocks.map((b,i)=>`
    <div class="block-card">
      <div class="block-card-info">
        <div class="block-card-date">&#128197; ${b.rawDate||b.date}</div>
        <div class="block-card-time">${b.from} &mdash; ${b.to}</div>
        <div class="block-card-chairs">&#128188; ${b.chairs} of ${state.barber.chairs} barbers available</div>
        ${b.reason?'<div class="block-card-reason">'+b.reason+'</div>':''}
      </div>
      <button class="block-remove" onclick="removeBlock(${i})">Remove</button>
    </div>`).join('');
}

// ─── MANAGED SERVICES (dashboard) ────────────
function renderManagedServices() {
  const c=document.getElementById('managed-services-list');
  const svcs=state.barber.services;
  if (svcs.length===0) { c.innerHTML='<div class="empty-hint">No services added yet.</div>'; return; }
  c.innerHTML=svcs.map((s,i)=>`
    <div class="msvc-card">
      <div class="msvc-icon">${s.icon}</div>
      <div class="msvc-info">
        <div class="msvc-name">${s.name}</div>
        <div class="msvc-meta">&#128336; ${s.duration} mins</div>
      </div>
      <div style="text-align:right">
        <div class="msvc-price">&#8377;${s.price}</div>
      </div>
      <button class="asc-remove" onclick="removeService(${i})" style="margin-left:8px">&#10005;</button>
    </div>`).join('');
}

function addManagedService() {
  const name=document.getElementById('mgmt-svc-name').value.trim();
  const price=parseInt(document.getElementById('mgmt-svc-price').value)||0;
  const duration=parseInt(document.getElementById('mgmt-svc-duration').value)||30;
  if (!name||price<=0) { showToast('Enter name and price'); return; }
  state.barber.services.push({id:'svc-mgmt-'+Date.now(),name,price,duration,icon:'&#10024;'});
  document.getElementById('mgmt-svc-name').value='';
  document.getElementById('mgmt-svc-price').value='';
  document.getElementById('mgmt-svc-duration').value='';
  renderManagedServices();
  populateWalkInServices();
  showToast(name+' added to your services!');
}

// ─── WALK-IN SERVICES POPULATE ────────────────
function populateWalkInServices() {
  const sel=document.getElementById('walkin-service');
  const svcs=state.barber.services.length>0 ? state.barber.services : [
    {name:'Haircut',duration:30,price:200},{name:'Beard Trim',duration:20,price:100}
  ];
  sel.innerHTML=svcs.map(s=>`<option value="${s.name}|${s.duration}|${s.price}">${s.name} &mdash; ${s.duration} mins &mdash; &#8377;${s.price}</option>`).join('');
}

// ─── DELAY NOTIFICATION ───────────────────────
function triggerDelay() { openModal('modal-delay'); }
function confirmDelay(mins) {
  state.delayMins+=mins;
  closeModal('modal-delay');
  const upcoming=state.timelineEntries.filter(e=>e.status==='upcoming'||e.status==='walkin');
  upcoming.forEach(e=>{
    const [h,m]=e.time.split(':').map(Number);
    const nm=h*60+m+mins;
    e.time=pad(Math.floor(nm/60))+':'+pad(nm%60);
  });
  renderTimeline();
  showToast('&#9201; '+upcoming.length+' client'+(upcoming.length===1?'':'s')+' notified — Running +'+mins+' mins late');
}

// ─── WALK-IN ──────────────────────────────────
function addWalkIn() { populateWalkInServices(); openModal('modal-walkin'); }
function confirmWalkIn() {
  const nm=document.getElementById('walkin-name').value.trim();
  const sv=document.getElementById('walkin-service').value.split('|');
  const name=nm||'Walk-In #'+(++state.walkInCount);
  const last=state.timelineEntries.length>0?state.timelineEntries[state.timelineEntries.length-1].time:'09:00';
  const [lh,lm]=last.split(':').map(Number);
  const nm2=lh*60+lm+30;
  const nextTime=pad(Math.floor(nm2/60))+':'+pad(nm2%60);
  state.timelineEntries.push({
    time:nextTime,client:name,services:sv[0],
    duration:parseInt(sv[1]),status:'walkin',payment:'walkin-pay',
    amount:parseInt(sv[2]),deposit:0,
  });
  closeModal('modal-walkin');
  document.getElementById('walkin-name').value='';
  renderTimeline(); updateStats();
  showToast('&#128694; Walk-in added at '+nextTime);
}

// ─── MODAL / TOAST ────────────────────────────
function openModal(id)  { document.getElementById(id).classList.remove('hidden'); }
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }
function showToast(msg) {
  const t=document.getElementById('toast');
  t.innerHTML=msg; t.classList.remove('hidden');
  clearTimeout(window._tt);
  window._tt=setTimeout(()=>t.classList.add('hidden'),3000);
}

// ─── UTILS ────────────────────────────────────
function pad(n) { return String(n).padStart(2,'0'); }

// ─── INIT ─────────────────────────────────────
document.addEventListener('DOMContentLoaded',()=>{
  document.querySelectorAll('.role-card').forEach((c,i)=>{
    c.style.opacity='0'; c.style.transform='translateY(20px)';
    setTimeout(()=>{
      c.style.transition='opacity 0.4s ease,transform 0.4s ease';
      c.style.opacity='1'; c.style.transform='translateY(0)';
    },200+i*120);
  });
  // Set default block chairs
  state.blockChairTemp=3;
});
