// ═══════════════════════════════════════════════════════════════
// GFA MANAGER — Firebase App
// ═══════════════════════════════════════════════════════════════
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.7.1/firebase-auth.js";
import { getFirestore, collection, doc, getDocs, getDoc, setDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/11.7.1/firebase-firestore.js";

// ─── Firebase Config ─────────────────────────────────────────
const app = initializeApp({
  apiKey: "AIzaSyB6MW35DPPsh59DoOEPVXml6FIvDNFgdI0",
  authDomain: "gfa-manager-50a7f.firebaseapp.com",
  projectId: "gfa-manager-50a7f",
  storageBucket: "gfa-manager-50a7f.firebasestorage.app",
  messagingSenderId: "224596157977",
  appId: "1:224596157977:web:c8d09907b8185010076c88"
});
const auth = getAuth(app);
const db = getFirestore(app);

// ─── State ───────────────────────────────────────────────────
const S = { vignerons: [], vins: [], associes: [], groupements: [], campagnes: [] };
let selGroupement = null, selCampagne = null;

// ─── Utilities ───────────────────────────────────────────────
const $ = id => document.getElementById(id);
const esc = s => { const d = document.createElement('div'); d.textContent = s || ''; return d.innerHTML; };
const genId = () => Date.now().toString(36) + Math.random().toString(36).substr(2, 6);
const genToken = () => {
  const c = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let t = ''; for (let i = 0; i < 24; i++) t += c[Math.floor(Math.random() * c.length)]; return t;
};
const num = v => Number(v) || 0;
const prix = v => num(v).toFixed(2) + ' €';

function toast(msg, type = 'success') {
  const c = $('toast-container'), t = document.createElement('div');
  t.className = 'toast ' + type;
  t.innerHTML = (type === 'success' ? '✅ ' : '❌ ') + esc(msg);
  c.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 300); }, 3000);
}

// ─── Modal ───────────────────────────────────────────────────
function openModal(title, body, footer, large) {
  $('modal-title').textContent = title;
  $('modal-body').innerHTML = body;
  $('modal-footer').innerHTML = footer;
  $('modal-box').className = large ? 'modal modal-lg' : 'modal';
  $('modal-overlay').classList.add('open');
}
function closeModal() { $('modal-overlay').classList.remove('open'); }
$('modal-overlay').onclick = e => { if (e.target === $('modal-overlay')) closeModal(); };
$('modal-close-btn').onclick = closeModal;

// ─── Screens ─────────────────────────────────────────────────
function showScreen(id) {
  document.querySelectorAll('.screen, #loading-screen').forEach(s => { s.style.display = 'none'; s.classList.remove('active'); });
  const el = $(id);
  if (el) { el.style.display = ''; el.classList.add('active'); }
}

// ─── Tabs ────────────────────────────────────────────────────
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    $('panel-' + tab.dataset.tab).classList.add('active');
  });
});

function updateBadges() {
  const counts = { groupements: S.groupements.length, vignerons: S.vignerons.length, vins: S.vins.length, associes: S.associes.length, campagnes: S.campagnes.length };
  document.querySelectorAll('.tab').forEach(tab => {
    const k = tab.dataset.tab; let b = tab.querySelector('.badge');
    if (counts[k] > 0) { if (!b) { b = document.createElement('span'); b.className = 'badge'; tab.appendChild(b); } b.textContent = counts[k]; }
    else if (b) b.remove();
  });
}

// ─── Firestore ───────────────────────────────────────────────
async function loadCol(name) {
  const snap = await getDocs(collection(db, name));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
async function saveDocFB(col, id, data) { await setDoc(doc(db, col, id), data); }
async function delDocFB(col, id) { await deleteDoc(doc(db, col, id)); }

async function loadAll() {
  try {
    S.vignerons = await loadCol('vignerons');
    S.vins = await loadCol('vins');
    S.associes = await loadCol('associes');
    S.groupements = await loadCol('groupements');
    S.campagnes = await loadCol('campagnes');
  } catch (e) { console.error(e); toast('Erreur chargement données', 'error'); }
}

function renderAll() {
  renderVignerons(); renderVins(); renderAssocies(); renderGroupements(); renderCampagnes(); updateBadges();
}

// ═══════════════════════════════════════════════════════════════
// AUTH
// ═══════════════════════════════════════════════════════════════
$('login-btn').onclick = async () => {
  const email = $('login-email').value.trim(), pw = $('login-password').value, err = $('login-error'), btn = $('login-btn');
  if (!email || !pw) { err.textContent = 'Remplissez tous les champs.'; err.style.display = ''; return; }
  btn.disabled = true; btn.textContent = 'Connexion…';
  try { await signInWithEmailAndPassword(auth, email, pw); err.style.display = 'none'; }
  catch (e) {
    const m = { 'auth/invalid-credential': 'Email ou mot de passe incorrect.', 'auth/too-many-requests': 'Trop de tentatives.' };
    err.textContent = m[e.code] || e.message; err.style.display = '';
  }
  btn.disabled = false; btn.textContent = 'Se connecter';
};
$('login-password').onkeydown = e => { if (e.key === 'Enter') $('login-btn').click(); };
$('logout-btn').onclick = () => signOut(auth);

// Check token URL first
function isOrderMode() {
  const t = new URLSearchParams(window.location.search).get('token');
  if (t) { showScreen('order-screen'); loadOrderByToken(t); return true; }
  return false;
}

onAuthStateChanged(auth, async user => {
  if (isOrderMode()) return;
  if (user) {
    $('header-email').textContent = user.email;
    showScreen('admin-screen');
    await loadAll();
    renderAll();
  } else { showScreen('login-screen'); }
});

// ═══════════════════════════════════════════════════════════════
// VIGNERONS
// ═══════════════════════════════════════════════════════════════
function renderVignerons() {
  const tb = $('vignerons-table'), em = $('vignerons-empty');
  if (!S.vignerons.length) { tb.innerHTML = ''; em.style.display = ''; return; }
  em.style.display = 'none';
  tb.innerHTML = S.vignerons.map(v => `<tr>
    <td><strong>${esc(v.domaine)}</strong></td><td>${esc(v.nom)}</td><td>${esc(v.prenom)}</td>
    <td>${esc(v.email)}</td><td>${esc(v.telephone)}</td>
    <td class="actions-cell">
      <button class="btn btn-secondary btn-sm" data-edit-vig="${v.id}">✏️</button>
      <button class="btn btn-danger btn-sm" data-del-vig="${v.id}">🗑️</button>
    </td></tr>`).join('');
}

function openVigneronForm(v) {
  v = v || {};
  openModal(v.id ? 'Modifier le vigneron' : 'Nouveau vigneron', `
    <div class="form-group"><label>Domaine</label><input id="v-domaine" value="${esc(v.domaine||'')}"></div>
    <div class="form-row">
      <div class="form-group"><label>Nom</label><input id="v-nom" value="${esc(v.nom||'')}"></div>
      <div class="form-group"><label>Prénom</label><input id="v-prenom" value="${esc(v.prenom||'')}"></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Email</label><input type="email" id="v-email" value="${esc(v.email||'')}"></div>
      <div class="form-group"><label>Téléphone</label><input id="v-tel" value="${esc(v.telephone||'')}"></div>
    </div>`,
    `<button class="btn btn-secondary" data-action="cancel">Annuler</button>
     <button class="btn btn-primary" data-action="save-vig" data-id="${v.id||''}">${v.id?'Modifier':'Créer'}</button>`);
}

$('btn-new-vigneron').onclick = () => openVigneronForm();

// ═══════════════════════════════════════════════════════════════
// VINS
// ═══════════════════════════════════════════════════════════════
function renderVins() {
  const tb = $('vins-table'), em = $('vins-empty');
  if (!S.vins.length) { tb.innerHTML = ''; em.style.display = ''; return; }
  em.style.display = 'none';
  tb.innerHTML = S.vins.map(v => {
    const vig = S.vignerons.find(x => x.id === v.vigneronId);
    return `<tr><td><strong>${esc(v.nom)}</strong></td><td>${vig?esc(vig.domaine):'—'}</td>
      <td><span class="type-badge type-${v.type}">${esc(v.type)}</span></td><td>${prix(v.prix)}</td>
      <td class="actions-cell">
        <button class="btn btn-secondary btn-sm" data-edit-vin="${v.id}">✏️</button>
        <button class="btn btn-danger btn-sm" data-del-vin="${v.id}">🗑️</button>
      </td></tr>`;
  }).join('');
}

function openVinForm(v) {
  v = v || {};
  const vigOpts = S.vignerons.map(x => `<option value="${x.id}" ${v.vigneronId===x.id?'selected':''}>${esc(x.domaine)} — ${esc(x.nom)}</option>`).join('');
  const types = ['bulles','blanc','rosé','rouge'];
  openModal(v.id ? 'Modifier le vin' : 'Nouveau vin', `
    <div class="form-group"><label>Nom du vin</label><input id="w-nom" value="${esc(v.nom||'')}"></div>
    <div class="form-group"><label>Vigneron</label><select id="w-vigneron"><option value="">— Choisir —</option>${vigOpts}</select></div>
    <div class="form-row">
      <div class="form-group"><label>Type</label><select id="w-type"><option value="">— Choisir —</option>${types.map(t=>`<option value="${t}" ${v.type===t?'selected':''}>${t[0].toUpperCase()+t.slice(1)}</option>`).join('')}</select></div>
      <div class="form-group"><label>Prix (€)</label><input type="number" step="0.01" id="w-prix" value="${v.prix||''}"></div>
    </div>`,
    `<button class="btn btn-secondary" data-action="cancel">Annuler</button>
     <button class="btn btn-primary" data-action="save-vin" data-id="${v.id||''}">${v.id?'Modifier':'Créer'}</button>`);
}

$('btn-new-vin').onclick = () => openVinForm();

// ═══════════════════════════════════════════════════════════════
// ASSOCIÉS
// ═══════════════════════════════════════════════════════════════
function renderAssocies() {
  const tb = $('associes-table'), em = $('associes-empty');
  if (!S.associes.length) { tb.innerHTML = ''; em.style.display = ''; return; }
  em.style.display = 'none';
  tb.innerHTML = S.associes.map(a => {
    const grps = S.groupements.filter(g => (g.membres||[]).some(m => m.associeId === a.id));
    return `<tr><td><strong>${esc(a.nom)}</strong></td><td>${esc(a.prenom)}</td>
      <td>${esc(a.email)}</td><td>${esc(a.telephone)}</td>
      <td>${grps.map(g=>esc(g.nom)).join(', ')||'—'}</td>
      <td class="actions-cell">
        <button class="btn btn-secondary btn-sm" data-edit-ass="${a.id}">✏️</button>
        <button class="btn btn-danger btn-sm" data-del-ass="${a.id}">🗑️</button>
      </td></tr>`;
  }).join('');
}

function openAssocieForm(a) {
  a = a || {};
  openModal(a.id ? 'Modifier l\'associé' : 'Nouvel associé', `
    <div class="form-row">
      <div class="form-group"><label>Nom</label><input id="a-nom" value="${esc(a.nom||'')}"></div>
      <div class="form-group"><label>Prénom</label><input id="a-prenom" value="${esc(a.prenom||'')}"></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Email</label><input type="email" id="a-email" value="${esc(a.email||'')}"></div>
      <div class="form-group"><label>Téléphone</label><input id="a-tel" value="${esc(a.telephone||'')}"></div>
    </div>`,
    `<button class="btn btn-secondary" data-action="cancel">Annuler</button>
     <button class="btn btn-primary" data-action="save-ass" data-id="${a.id||''}">${a.id?'Modifier':'Créer'}</button>`);
}

$('btn-new-associe').onclick = () => openAssocieForm();

// ═══════════════════════════════════════════════════════════════
// GROUPEMENTS
// ═══════════════════════════════════════════════════════════════
function renderGroupements() {
  const tb = $('groupements-table'), em = $('groupements-empty');
  if (!S.groupements.length) { tb.innerHTML = ''; em.style.display = ''; return; }
  em.style.display = 'none';
  tb.innerHTML = S.groupements.map(g => {
    const vig = S.vignerons.find(v=>v.id===g.vigneronId);
    const wine = S.vins.find(w=>w.id===g.bouteilleId);
    return `<tr class="clickable" data-show-grp="${g.id}">
      <td><strong>${esc(g.nom)}</strong></td><td>${vig?esc(vig.domaine):'—'}</td>
      <td>${g.partsTotales}</td><td>${g.partsParBouteille}</td>
      <td>${wine?esc(wine.nom):'—'}</td><td>${(g.membres||[]).length}</td>
      <td class="actions-cell" onclick="event.stopPropagation()">
        <button class="btn btn-secondary btn-sm" data-edit-grp="${g.id}">✏️</button>
        <button class="btn btn-danger btn-sm" data-del-grp="${g.id}">🗑️</button>
      </td></tr>`;
  }).join('');
}

function openGroupementForm(g) {
  g = g || {};
  const vigOpts = S.vignerons.map(v=>`<option value="${v.id}" ${g.vigneronId===v.id?'selected':''}>${esc(v.domaine)} — ${esc(v.nom)}</option>`).join('');
  const wOpts = S.vins.filter(w=>w.vigneronId===(g.vigneronId||'')).map(w=>`<option value="${w.id}" ${g.bouteilleId===w.id?'selected':''}>${esc(w.nom)} (${w.type})</option>`).join('');
  openModal(g.id ? 'Modifier le groupement' : 'Nouveau groupement', `
    <div class="form-group"><label>Nom</label><input id="g-nom" value="${esc(g.nom||'')}"></div>
    <div class="form-group"><label>Vigneron</label><select id="g-vigneron"><option value="">— Choisir —</option>${vigOpts}</select></div>
    <div class="form-group"><label>Bouteille offerte</label><select id="g-bouteille"><option value="">— Choisir —</option>${wOpts}</select></div>
    <div class="form-row">
      <div class="form-group"><label>Parts totales</label><input type="number" id="g-parts" value="${g.partsTotales||''}"></div>
      <div class="form-group"><label>Parts/bouteille</label><input type="number" id="g-ppb" value="${g.partsParBouteille||''}"></div>
    </div>`,
    `<button class="btn btn-secondary" data-action="cancel">Annuler</button>
     <button class="btn btn-primary" data-action="save-grp" data-id="${g.id||''}" data-has-membres="${g.id?'1':''}">${g.id?'Modifier':'Créer'}</button>`);
}

function showGroupementDetail(id) {
  selGroupement = id;
  const g = S.groupements.find(x=>x.id===id);
  const vig = S.vignerons.find(v=>v.id===g.vigneronId);
  const wine = S.vins.find(w=>w.id===g.bouteilleId);
  $('gd-title').textContent = g.nom;
  $('gd-vigneron').textContent = vig ? `${vig.domaine} — ${vig.nom} ${vig.prenom}` : '—';
  $('gd-parts').textContent = g.partsTotales;
  $('gd-ppb').textContent = g.partsParBouteille;
  $('gd-bouteille').textContent = wine ? `${wine.nom} (${wine.type} — ${prix(wine.prix)})` : '—';
  $('groupement-detail').style.display = '';
  // Members
  const tb = $('gd-membres-table'), mbrs = g.membres || [];
  if (!mbrs.length) { tb.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-light);padding:18px">Aucun associé.</td></tr>'; return; }
  const px = wine ? num(wine.prix) : 0;
  tb.innerHTML = mbrs.map(m => {
    const a = S.associes.find(x=>x.id===m.associeId); if (!a) return '';
    const nb = g.partsParBouteille > 0 ? m.parts / g.partsParBouteille : 0;
    return `<tr><td>${esc(a.nom)}</td><td>${esc(a.prenom)}</td><td>${m.parts}</td>
      <td><strong>${(nb*px).toFixed(2)} €</strong> <small>(${nb.toFixed(1)} bout.)</small></td>
      <td><button class="btn btn-danger btn-sm" data-rm-membre="${m.associeId}">🗑️</button></td></tr>`;
  }).join('');
}

$('btn-new-groupement').onclick = () => openGroupementForm();
$('btn-close-gd').onclick = () => { selGroupement = null; $('groupement-detail').style.display = 'none'; };

$('btn-add-membre').onclick = () => {
  const g = S.groupements.find(x=>x.id===selGroupement);
  const existing = (g.membres||[]).map(m=>m.associeId);
  const avail = S.associes.filter(a=>!existing.includes(a.id));
  if (!avail.length) return alert('Aucun associé disponible.');
  openModal('Ajouter un associé', `
    <div class="form-group"><label>Associé</label><select id="m-associe">${avail.map(a=>`<option value="${a.id}">${esc(a.nom)} ${esc(a.prenom)}</option>`).join('')}</select></div>
    <div class="form-group"><label>Nombre de parts</label><input type="number" id="m-parts" value="1" min="1"></div>`,
    `<button class="btn btn-secondary" data-action="cancel">Annuler</button>
     <button class="btn btn-primary" data-action="add-membre">Ajouter</button>`);
};

// ═══════════════════════════════════════════════════════════════
// CAMPAGNES
// ═══════════════════════════════════════════════════════════════
function renderCampagnes() {
  const c = $('campagnes-list'), em = $('campagnes-empty');
  if (!S.campagnes.length) { c.innerHTML = ''; em.style.display = ''; return; }
  em.style.display = 'none';
  c.innerHTML = S.campagnes.map(camp => {
    const vig = S.vignerons.find(v=>v.id===camp.vigneronId);
    const total = (camp.associes||[]).length;
    const done = (camp.associes||[]).filter(a=>a.statut==='commandé').length;
    return `<div class="campaign-card" data-show-camp="${camp.id}">
      <div class="campaign-card-header"><h4>${vig?esc(vig.domaine):'—'}</h4><div class="year">Campagne ${camp.annee}</div></div>
      <div class="campaign-card-body">
        <div>${(camp.groupementIds||[]).map(gId=>{const g=S.groupements.find(x=>x.id===gId);return g?esc(g.nom):'';}).filter(Boolean).join(', ')}</div>
        <div class="campaign-stats">
          <div class="campaign-stat"><div class="num">${total}</div><div class="lbl">Associés</div></div>
          <div class="campaign-stat"><div class="num" style="color:var(--green)">${done}</div><div class="lbl">Commandés</div></div>
          <div class="campaign-stat"><div class="num" style="color:var(--orange)">${total-done}</div><div class="lbl">En attente</div></div>
        </div>
      </div></div>`;
  }).join('');
}

$('btn-new-campagne').onclick = () => {
  if (!S.vignerons.length) return alert('Créez d\'abord des vignerons.');
  const vigOpts = S.vignerons.map(v=>`<option value="${v.id}">${esc(v.domaine)} — ${esc(v.nom)}</option>`).join('');
  openModal('Lancer une campagne', `
    <div class="form-row">
      <div class="form-group"><label>Vigneron</label><select id="c-vigneron"><option value="">— Choisir —</option>${vigOpts}</select></div>
      <div class="form-group"><label>Année</label><input type="number" id="c-annee" value="${new Date().getFullYear()}"></div>
    </div>
    <div class="form-group"><label>Durée du lien (jours)</label><input type="number" id="c-days" value="30" min="1"></div>
    <div id="c-preview"></div>`,
    `<button class="btn btn-secondary" data-action="cancel">Annuler</button>
     <button class="btn btn-gold" data-action="create-camp">🍇 Lancer</button>`, true);
};

function updateCampPreview() {
  const vigId = $('c-vigneron')?.value, prev = $('c-preview');
  if (!vigId || !prev) { if (prev) prev.innerHTML = ''; return; }
  const grps = S.groupements.filter(g=>g.vigneronId===vigId);
  const wines = S.vins.filter(w=>w.vigneronId===vigId);
  let h = '';
  if (grps.length) {
    h += '<div class="sub-section"><h4>🏛️ Groupements concernés</h4><ul style="margin:6px 0 14px 18px">';
    grps.forEach(g => h += `<li>${esc(g.nom)} (${(g.membres||[]).length} associés)</li>`);
    h += '</ul></div>';
  } else h += '<p style="color:var(--text-light);margin:10px 0">Aucun groupement pour ce vigneron.</p>';
  if (wines.length) {
    h += '<div class="sub-section"><h4>🍷 Tarifs campagne</h4><table style="width:100%"><thead><tr><th>Vin</th><th>Type</th><th>Prix catalogue</th><th>Prix campagne</th></tr></thead><tbody>';
    wines.forEach(w => h += `<tr><td>${esc(w.nom)}</td><td><span class="type-badge type-${w.type}">${esc(w.type)}</span></td><td>${prix(w.prix)}</td><td><input type="number" step="0.01" value="${num(w.prix).toFixed(2)}" id="cprix-${w.id}" style="width:100px;padding:6px 10px;border:1.5px solid var(--border);border-radius:4px"></td></tr>`);
    h += '</tbody></table></div>';
  }
  prev.innerHTML = h;
}

function showCampagneDetail(id) {
  selCampagne = id;
  const c = S.campagnes.find(x=>x.id===id);
  const vig = S.vignerons.find(v=>v.id===c.vigneronId);
  $('cd-title').textContent = `Campagne ${c.annee}`;
  $('cd-vigneron').textContent = vig ? `${vig.domaine} — ${vig.nom} ${vig.prenom}` : '—';
  $('cd-year').textContent = c.annee;
  $('cd-groupements').textContent = (c.groupementIds||[]).map(gId=>{const g=S.groupements.find(x=>x.id===gId);return g?g.nom:'';}).filter(Boolean).join(', ');
  const total = (c.associes||[]).length, done = (c.associes||[]).filter(a=>a.statut==='commandé').length;
  $('cd-status').innerHTML = `${done}/${total} commandés`;
  $('cd-tarifs-table').innerHTML = (c.tarifs||[]).map(t=>`<tr><td>${esc(t.nom)}</td><td><span class="type-badge type-${t.type}">${esc(t.type)}</span></td><td><strong>${num(t.prixCampagne).toFixed(2)} €</strong></td></tr>`).join('');

  const baseUrl = window.location.origin + window.location.pathname;
  $('cd-associes-table').innerHTML = (c.associes||[]).map(ca => {
    const a = S.associes.find(x=>x.id===ca.associeId); if (!a) return '';
    const grpN = (ca.groupements||[]).map(cg=>{const g=S.groupements.find(x=>x.id===cg.groupementId);return g?g.nom:'';}).filter(Boolean).join(', ');
    const budget = (ca.groupements||[]).reduce((s,cg)=>s+num(cg.budget),0);
    const sc = ca.statut==='commandé'?'status-commande':ca.statut==='relancé'?'status-relance':'status-attente';
    const sl = ca.statut==='commandé'?'Commandé':ca.statut==='relancé'?'Relancé':'En attente';
    const url = `${baseUrl}?token=${ca.token}`;
    return `<tr><td>${esc(a.nom)}</td><td>${esc(a.prenom)}</td><td>${esc(a.email)}</td>
      <td>${esc(grpN)}</td><td><strong>${budget.toFixed(2)} €</strong></td>
      <td><span class="status-badge ${sc}">${sl}</span></td>
      <td class="actions-cell">
        <button class="btn btn-green btn-sm" data-mail-ass="${ca.associeId}">✉️</button>
        <button class="btn btn-secondary btn-sm" data-copy-link="${url}">🔗</button>
        <button class="btn btn-secondary btn-sm" data-order-ass="${ca.associeId}">🛒</button>
      </td></tr>`;
  }).join('');

  $('campagne-detail').style.display = '';
  $('campagne-detail').scrollIntoView({behavior:'smooth',block:'start'});
}

$('btn-close-cd').onclick = () => { selCampagne = null; $('campagne-detail').style.display = 'none'; };

$('btn-delete-camp').onclick = async () => {
  if (!confirm('Supprimer cette campagne ?')) return;
  await delDocFB('campagnes', selCampagne);
  selCampagne = null; $('campagne-detail').style.display = 'none';
  toast('Campagne supprimée'); await loadAll(); renderAll();
};

$('btn-mail-all').onclick = () => {
  const c = S.campagnes.find(x=>x.id===selCampagne);
  const pending = (c.associes||[]).filter(a=>a.statut!=='commandé');
  if (!pending.length) return alert('Tous ont commandé.');
  if (!confirm(`Ouvrir ${pending.length} mail(s) ?`)) return;
  pending.forEach((ca,i) => setTimeout(()=>sendMail(c, ca), i*600));
};

function sendMail(camp, ca) {
  const a = S.associes.find(x=>x.id===ca.associeId); if (!a) return;
  const vig = S.vignerons.find(v=>v.id===camp.vigneronId);
  const budget = (ca.groupements||[]).reduce((s,cg)=>s+num(cg.budget),0);
  const grpN = (ca.groupements||[]).map(cg=>{const g=S.groupements.find(x=>x.id===cg.groupementId);return g?g.nom:'';}).filter(Boolean).join(', ');
  const url = `${window.location.origin}${window.location.pathname}?token=${ca.token}`;
  const exp = new Date(camp.tokenExpiry).toLocaleDateString('fr-FR');
  const body = `Bonjour ${a.prenom} ${a.nom},\n\nLa campagne ${camp.annee} du domaine ${vig?vig.domaine:''} est ouverte !\n\nGroupement(s) : ${grpN}\nVotre budget : ${budget.toFixed(2)} €\n\nAccédez à votre espace commande :\n${url}\n\nCe lien est valable jusqu'au ${exp}.\n\nCordialement,\nVotre gestionnaire GFA`;
  const subject = `Campagne ${camp.annee} — ${vig?vig.domaine:''} — Votre commande`;

  openModal('Envoyer un mail', `
    <p>Mail pour <strong>${esc(a.prenom)} ${esc(a.nom)}</strong> (${esc(a.email)})</p>
    <div class="mail-preview">${esc(body)}</div>`,
    `<button class="btn btn-secondary" data-action="cancel">Annuler</button>
     <a href="mailto:${encodeURIComponent(a.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}" class="btn btn-green" data-action="mark-sent" data-camp="${camp.id}" data-ass="${ca.associeId}">✉️ Ouvrir client mail</a>`);
}

// Order modal (admin)
function openOrderModal(campId, assId) {
  const c = S.campagnes.find(x=>x.id===campId);
  const ca = (c.associes||[]).find(x=>x.associeId===assId);
  const a = S.associes.find(x=>x.id===assId); if (!a || !ca) return;
  const budget = (ca.groupements||[]).reduce((s,cg)=>s+num(cg.budget),0);
  if (!ca.commande) ca.commande = [];

  const wHtml = (c.tarifs||[]).map(t => {
    const qty = (ca.commande.find(x=>x.vinId===t.vinId)||{}).qty||0;
    return `<div class="wine-card"><div class="wine-name">${esc(t.nom)}</div>
      <div class="wine-type"><span class="type-badge type-${t.type}">${esc(t.type)}</span></div>
      <div class="wine-price">${num(t.prixCampagne).toFixed(2)} €</div>
      <div class="qty-control">
        <button data-qty-vin="${t.vinId}" data-qty-d="-1">−</button>
        <span id="oq-${t.vinId}">${qty}</span>
        <button data-qty-vin="${t.vinId}" data-qty-d="1">+</button>
      </div></div>`;
  }).join('');

  openModal(`Commande — ${a.prenom} ${a.nom}`, `
    <p style="margin-bottom:12px">Budget : <strong>${budget.toFixed(2)} €</strong></p>
    <div class="wine-grid">${wHtml}</div>
    <div id="order-sum"></div>`,
    `<button class="btn btn-secondary" data-action="cancel">Fermer</button>
     <button class="btn btn-primary" data-action="validate-order" data-camp="${campId}" data-ass="${assId}">✅ Valider</button>`, true);

  window._adminOrder = { camp: c, ca, budget };
  updAdminOrderSum();
}

function updAdminOrderSum() {
  const ctx = window._adminOrder; if (!ctx) return;
  const sum = $('order-sum'); if (!sum) return;
  let total = 0, lines = '';
  (ctx.ca.commande||[]).forEach(item => {
    if (item.qty > 0) {
      const t = ctx.camp.tarifs.find(x=>x.vinId===item.vinId);
      if (t) { const lt = item.qty * num(t.prixCampagne); total += lt; lines += `<div style="display:flex;justify-content:space-between;padding:3px 0"><span>${item.qty}× ${esc(t.nom)}</span><span>${lt.toFixed(2)} €</span></div>`; }
    }
  });
  const pct = ctx.budget > 0 ? Math.min(100,(total/ctx.budget)*100) : 0;
  const col = total > ctx.budget ? '#c0392b' : total > ctx.budget*0.8 ? 'var(--orange)' : 'var(--green)';
  sum.innerHTML = `<div class="order-summary"><h4>Récapitulatif</h4>${lines||'<p style="color:var(--text-light)">Aucun vin.</p>'}
    <div class="budget-bar"><div class="budget-bar-fill" style="width:${pct}%;background:${col}"></div></div>
    <div style="display:flex;justify-content:space-between;font-size:0.83rem;color:var(--text-light)"><span>${total.toFixed(2)} € dépensés</span><span>Budget : ${ctx.budget.toFixed(2)} €</span></div>
    <div class="order-total"><span style="font-weight:600">Total</span><span style="font-weight:700;font-size:1.2rem;color:${total>ctx.budget?'#c0392b':'var(--wine)'}">${total.toFixed(2)} €</span></div>
    ${total>ctx.budget?'<p style="color:#c0392b;font-size:0.83rem;margin-top:6px">⚠️ Dépasse le budget !</p>':''}</div>`;
}

// ═══════════════════════════════════════════════════════════════
// PUBLIC ORDER SCREEN (Token-based)
// ═══════════════════════════════════════════════════════════════
async function loadOrderByToken(token) {
  const content = $('order-screen-content');
  content.innerHTML = '<div style="text-align:center;padding:40px"><div class="spinner spinner-dark" style="width:40px;height:40px;margin:0 auto"></div><p style="margin-top:12px;color:var(--text-light)">Chargement…</p></div>';
  try {
    const snap = await getDocs(collection(db, 'campagnes'));
    let camp = null, ca = null;
    snap.forEach(d => { const c = {id:d.id,...d.data()}; const m = (c.associes||[]).find(a=>a.token===token); if (m) { camp=c; ca=m; } });

    if (!camp||!ca) { content.innerHTML = '<div class="token-expired"><div class="icon">🔒</div><h2>Lien invalide</h2><p>Ce lien n\'existe pas.</p></div>'; return; }
    if (new Date() > new Date(camp.tokenExpiry)) { content.innerHTML = '<div class="token-expired"><div class="icon">⏰</div><h2>Lien expiré</h2><p>Contactez votre gestionnaire.</p></div>'; return; }
    if (ca.statut === 'commandé') { content.innerHTML = '<div class="token-expired"><div class="icon">✅</div><h2>Commande déjà validée</h2><p>Contactez votre gestionnaire pour toute modification.</p></div>'; return; }

    const aDoc = await getDoc(doc(db,'associes',ca.associeId));
    const assoc = aDoc.exists() ? aDoc.data() : {prenom:'',nom:''};
    const vDoc = await getDoc(doc(db,'vignerons',camp.vigneronId));
    const vig = vDoc.exists() ? vDoc.data() : {domaine:''};
    const grpNames = [];
    for (const cg of (ca.groupements||[])) { const gD = await getDoc(doc(db,'groupements',cg.groupementId)); if (gD.exists()) grpNames.push(gD.data().nom); }
    const budget = (ca.groupements||[]).reduce((s,cg)=>s+num(cg.budget),0);
    if (!ca.commande) ca.commande = [];

    window._pubOrder = { camp, ca, budget, token };

    const wHtml = (camp.tarifs||[]).map(t => {
      const qty = (ca.commande.find(x=>x.vinId===t.vinId)||{}).qty||0;
      return `<div class="wine-card"><div class="wine-name">${esc(t.nom)}</div>
        <div class="wine-type"><span class="type-badge type-${t.type}">${esc(t.type)}</span></div>
        <div class="wine-price">${num(t.prixCampagne).toFixed(2)} €</div>
        <div class="qty-control">
          <button data-pub-vin="${t.vinId}" data-pub-d="-1">−</button>
          <span id="pq-${t.vinId}">${qty}</span>
          <button data-pub-vin="${t.vinId}" data-pub-d="1">+</button>
        </div></div>`;
    }).join('');

    content.innerHTML = `<div class="order-page"><div class="order-header">
      <h2>Bonjour ${esc(assoc.prenom)} ${esc(assoc.nom)} 👋</h2>
      <p>${esc(vig.domaine)} — Campagne ${camp.annee}</p>
      <p>Groupement(s) : <strong>${grpNames.map(esc).join(', ')}</strong> — Budget : <strong>${budget.toFixed(2)} €</strong></p>
    </div><div class="wine-grid">${wHtml}</div><div id="pub-sum"></div>
    <div style="text-align:center;margin-top:20px"><button class="btn btn-primary" style="padding:14px 40px;font-size:1rem" id="pub-validate-btn">✅ Valider ma commande</button></div></div>`;
    updPubSum();
  } catch (e) { console.error(e); content.innerHTML = '<div class="token-expired"><div class="icon">❌</div><h2>Erreur</h2><p>Réessayez plus tard.</p></div>'; }
}

function updPubSum() {
  const ctx = window._pubOrder; if (!ctx) return;
  const sum = $('pub-sum'); if (!sum) return;
  let total = 0, lines = '';
  (ctx.ca.commande||[]).forEach(item => {
    if (item.qty > 0) {
      const t = ctx.camp.tarifs.find(x=>x.vinId===item.vinId);
      if (t) { const lt = item.qty * num(t.prixCampagne); total += lt; lines += `<div style="display:flex;justify-content:space-between;padding:3px 0"><span>${item.qty}× ${esc(t.nom)}</span><span>${lt.toFixed(2)} €</span></div>`; }
    }
  });
  const pct = ctx.budget > 0 ? Math.min(100,(total/ctx.budget)*100) : 0;
  const col = total > ctx.budget ? '#c0392b' : total > ctx.budget*0.8 ? 'var(--orange)' : 'var(--green)';
  sum.innerHTML = `<div class="order-summary"><h4>Récapitulatif</h4>${lines||'<p style="color:var(--text-light)">Sélectionnez vos vins.</p>'}
    <div class="budget-bar"><div class="budget-bar-fill" style="width:${pct}%;background:${col}"></div></div>
    <div style="display:flex;justify-content:space-between;font-size:0.83rem;color:var(--text-light)"><span>${total.toFixed(2)} € dépensés</span><span>Budget : ${ctx.budget.toFixed(2)} €</span></div>
    <div class="order-total"><span style="font-weight:600">Total</span><span style="font-weight:700;font-size:1.2rem;color:${total>ctx.budget?'#c0392b':'var(--wine)'}">${total.toFixed(2)} €</span></div>
    ${total>ctx.budget?'<p style="color:#c0392b;font-size:0.83rem;margin-top:6px">⚠️ Dépasse votre budget.</p>':''}</div>`;
}

// ═══════════════════════════════════════════════════════════════
// GLOBAL EVENT DELEGATION
// ═══════════════════════════════════════════════════════════════
document.addEventListener('click', async (e) => {
  const btn = e.target.closest('[data-action],[data-edit-vig],[data-del-vig],[data-edit-vin],[data-del-vin],[data-edit-ass],[data-del-ass],[data-edit-grp],[data-del-grp],[data-show-grp],[data-rm-membre],[data-show-camp],[data-mail-ass],[data-copy-link],[data-order-ass],[data-qty-vin],[data-pub-vin]');
  if (!btn) return;

  // Modal actions
  const action = btn.dataset.action;
  if (action === 'cancel') return closeModal();

  // ─── Vignerons ───
  if (action === 'save-vig') {
    const id = btn.dataset.id;
    const obj = { domaine: $('v-domaine').value.trim(), nom: $('v-nom').value.trim(), prenom: $('v-prenom').value.trim(), email: $('v-email').value.trim(), telephone: $('v-tel').value.trim() };
    if (!obj.domaine||!obj.nom) return alert('Domaine et Nom requis.');
    await saveDocFB('vignerons', id||genId(), obj);
    toast(id?'Vigneron modifié':'Vigneron créé'); await loadAll(); renderAll(); closeModal();
  }
  if (btn.dataset.editVig) { openVigneronForm(S.vignerons.find(v=>v.id===btn.dataset.editVig)); }
  if (btn.dataset.delVig) { if (!confirm('Supprimer ?')) return; await delDocFB('vignerons',btn.dataset.delVig); toast('Supprimé'); await loadAll(); renderAll(); }

  // ─── Vins ───
  if (action === 'save-vin') {
    const id = btn.dataset.id;
    const obj = { nom: $('w-nom').value.trim(), vigneronId: $('w-vigneron').value, type: $('w-type').value, prix: parseFloat($('w-prix').value)||0 };
    if (!obj.nom||!obj.vigneronId||!obj.type) return alert('Tous les champs requis.');
    await saveDocFB('vins', id||genId(), obj);
    toast(id?'Vin modifié':'Vin créé'); await loadAll(); renderAll(); closeModal();
  }
  if (btn.dataset.editVin) openVinForm(S.vins.find(v=>v.id===btn.dataset.editVin));
  if (btn.dataset.delVin) { if (!confirm('Supprimer ?')) return; await delDocFB('vins',btn.dataset.delVin); toast('Supprimé'); await loadAll(); renderAll(); }

  // ─── Associés ───
  if (action === 'save-ass') {
    const id = btn.dataset.id;
    const obj = { nom: $('a-nom').value.trim(), prenom: $('a-prenom').value.trim(), email: $('a-email').value.trim(), telephone: $('a-tel').value.trim() };
    if (!obj.nom||!obj.prenom) return alert('Nom et Prénom requis.');
    await saveDocFB('associes', id||genId(), obj);
    toast(id?'Associé modifié':'Associé créé'); await loadAll(); renderAll(); closeModal();
  }
  if (btn.dataset.editAss) openAssocieForm(S.associes.find(a=>a.id===btn.dataset.editAss));
  if (btn.dataset.delAss) { if (!confirm('Supprimer ?')) return; await delDocFB('associes',btn.dataset.delAss); toast('Supprimé'); await loadAll(); renderAll(); }

  // ─── Groupements ───
  if (action === 'save-grp') {
    const id = btn.dataset.id, hasMbr = btn.dataset.hasMembres;
    const existing = id ? S.groupements.find(g=>g.id===id) : null;
    const obj = { nom: $('g-nom').value.trim(), vigneronId: $('g-vigneron').value, bouteilleId: $('g-bouteille').value,
      partsTotales: parseInt($('g-parts').value)||0, partsParBouteille: parseInt($('g-ppb').value)||1,
      membres: existing ? existing.membres||[] : [] };
    if (!obj.nom||!obj.vigneronId) return alert('Nom et Vigneron requis.');
    await saveDocFB('groupements', id||genId(), obj);
    toast(id?'Groupement modifié':'Groupement créé'); await loadAll(); renderAll(); closeModal();
    if (selGroupement===id) showGroupementDetail(id);
  }
  if (btn.dataset.editGrp) openGroupementForm(S.groupements.find(g=>g.id===btn.dataset.editGrp));
  if (btn.dataset.delGrp) { if (!confirm('Supprimer ?')) return; await delDocFB('groupements',btn.dataset.delGrp); if (selGroupement===btn.dataset.delGrp) { selGroupement=null; $('groupement-detail').style.display='none'; } toast('Supprimé'); await loadAll(); renderAll(); }
  if (btn.dataset.showGrp) showGroupementDetail(btn.dataset.showGrp);

  if (action === 'add-membre') {
    const g = S.groupements.find(x=>x.id===selGroupement);
    if (!g.membres) g.membres = [];
    g.membres.push({ associeId: $('m-associe').value, parts: parseInt($('m-parts').value)||1 });
    const {id,...d} = g; await saveDocFB('groupements',g.id,d);
    toast('Associé ajouté'); await loadAll(); renderAll(); closeModal(); showGroupementDetail(g.id);
  }
  if (btn.dataset.rmMembre) {
    const g = S.groupements.find(x=>x.id===selGroupement);
    g.membres = (g.membres||[]).filter(m=>m.associeId!==btn.dataset.rmMembre);
    const {id,...d} = g; await saveDocFB('groupements',g.id,d);
    toast('Retiré'); await loadAll(); renderAll(); showGroupementDetail(g.id);
  }

  // ─── Campagnes ───
  if (btn.dataset.showCamp) showCampagneDetail(btn.dataset.showCamp);

  if (action === 'create-camp') {
    const vigId = $('c-vigneron').value, annee = $('c-annee').value, days = parseInt($('c-days').value)||30;
    if (!vigId) return alert('Choisissez un vigneron.');
    const grps = S.groupements.filter(g=>g.vigneronId===vigId);
    const wines = S.vins.filter(w=>w.vigneronId===vigId);
    const tarifs = wines.map(w => ({ vinId:w.id, nom:w.nom, type:w.type, prixCampagne: parseFloat($('cprix-'+w.id)?.value)||num(w.prix) }));
    const exp = new Date(); exp.setDate(exp.getDate()+days);
    const assMap = {};
    grps.forEach(g => (g.membres||[]).forEach(m => {
      if (!assMap[m.associeId]) assMap[m.associeId] = { associeId:m.associeId, token:genToken(), groupements:[], statut:'attente', commande:[] };
      const pxB = tarifs.find(t=>t.vinId===g.bouteilleId)?.prixCampagne || 0;
      const nb = g.partsParBouteille > 0 ? m.parts/g.partsParBouteille : 0;
      assMap[m.associeId].groupements.push({ groupementId:g.id, parts:m.parts, budget:nb*pxB });
    }));
    await saveDocFB('campagnes', genId(), { vigneronId:vigId, annee, groupementIds:grps.map(g=>g.id), tarifs, associes:Object.values(assMap), tokenExpiry:exp.toISOString(), createdAt:new Date().toISOString() });
    toast('Campagne créée !'); await loadAll(); renderAll(); closeModal();
  }

  if (btn.dataset.mailAss) { const c = S.campagnes.find(x=>x.id===selCampagne); const ca = (c.associes||[]).find(x=>x.associeId===btn.dataset.mailAss); if (ca) sendMail(c, ca); }
  if (btn.dataset.copyLink) { navigator.clipboard.writeText(btn.dataset.copyLink).then(()=>toast('Lien copié !')).catch(()=>toast('Erreur','error')); }
  if (btn.dataset.orderAss) { openOrderModal(selCampagne, btn.dataset.orderAss); }

  if (action === 'mark-sent') {
    const c = S.campagnes.find(x=>x.id===btn.dataset.camp);
    const ca = (c.associes||[]).find(x=>x.associeId===btn.dataset.ass);
    if (ca && ca.statut==='attente') ca.statut = 'relancé';
    const {id,...d} = c; await saveDocFB('campagnes',c.id,d);
    setTimeout(async()=>{ closeModal(); await loadAll(); renderAll(); if(selCampagne) showCampagneDetail(selCampagne); },300);
  }

  if (action === 'validate-order') {
    const c = S.campagnes.find(x=>x.id===btn.dataset.camp);
    const ca = (c.associes||[]).find(x=>x.associeId===btn.dataset.ass);
    ca.statut = 'commandé';
    const {id,...d} = c; await saveDocFB('campagnes',c.id,d);
    toast('Commande validée !'); closeModal(); await loadAll(); renderAll(); if(selCampagne) showCampagneDetail(selCampagne);
  }

  // ─── Qty buttons (admin order modal) ───
  if (btn.dataset.qtyVin) {
    const ctx = window._adminOrder; if (!ctx) return;
    const vinId = btn.dataset.qtyVin, delta = parseInt(btn.dataset.qtyD);
    let item = ctx.ca.commande.find(x=>x.vinId===vinId);
    if (!item) { item={vinId,qty:0}; ctx.ca.commande.push(item); }
    item.qty = Math.max(0, item.qty+delta);
    const el = $('oq-'+vinId); if (el) el.textContent = item.qty;
    updAdminOrderSum();
  }

  // ─── Qty buttons (public order) ───
  if (btn.dataset.pubVin) {
    const ctx = window._pubOrder; if (!ctx) return;
    const vinId = btn.dataset.pubVin, delta = parseInt(btn.dataset.pubD);
    let item = ctx.ca.commande.find(x=>x.vinId===vinId);
    if (!item) { item={vinId,qty:0}; ctx.ca.commande.push(item); }
    item.qty = Math.max(0, item.qty+delta);
    const el = $('pq-'+vinId); if (el) el.textContent = item.qty;
    updPubSum();
  }
});

// Public validate button (delegated from order-screen)
document.addEventListener('click', async e => {
  if (e.target.id === 'pub-validate-btn' || e.target.closest('#pub-validate-btn')) {
    const ctx = window._pubOrder; if (!ctx) return;
    const total = (ctx.ca.commande||[]).reduce((s,item)=>{const t=ctx.camp.tarifs.find(x=>x.vinId===item.vinId);return s+(t?item.qty*num(t.prixCampagne):0);},0);
    if (total===0) return alert('Sélectionnez au moins un vin.');
    if (total>ctx.budget && !confirm('Le total dépasse votre budget. Continuer ?')) return;
    try {
      const updated = (ctx.camp.associes||[]).map(a => a.token===ctx.token ? {...a,statut:'commandé',commande:ctx.ca.commande} : a);
      const {id,...d} = ctx.camp; d.associes = updated;
      await saveDocFB('campagnes',ctx.camp.id,d);
      $('order-screen-content').innerHTML = `<div class="token-expired"><div class="icon">🎉</div><h2>Commande validée !</h2><p>Merci, votre commande de <strong>${total.toFixed(2)} €</strong> a été enregistrée.</p><p style="margin-top:8px;color:var(--text-light)">Vous pouvez fermer cette page.</p></div>`;
    } catch(e) { console.error(e); alert('Erreur, réessayez.'); }
  }
});

// Vigneron change handler for groupement modal wine list
document.addEventListener('change', e => {
  if (e.target.id === 'g-vigneron') {
    const vigId = e.target.value, sel = $('g-bouteille');
    const wines = S.vins.filter(w=>w.vigneronId===vigId);
    sel.innerHTML = wines.length ? '<option value="">— Choisir —</option>'+wines.map(w=>`<option value="${w.id}">${esc(w.nom)} (${w.type})</option>`).join('') : '<option value="">— Aucun vin —</option>';
  }
  if (e.target.id === 'c-vigneron') updateCampPreview();
});
