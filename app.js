/**
 * Útnyilvántartás / Útiköltség-elszámolás
 * Natív HTML/CSS/JS – GitHub Pages kompatibilis
 */

'use strict';

// ─── Állapot ────────────────────────────────────────────────────────────────
const state = {
  norma: null,       // norma.json tartalma
  ceg: null,         // ceg.json tartalma (opcionális)
  mod: 'egyszeru',   // 'egyszeru' | 'reszletes'
  utvonalak: [],     // részletes mód sorai
};

// ─── Segédfüggvények ─────────────────────────────────────────────────────────

function $(id) { return document.getElementById(id); }

function val(id) { return ($(id) ? $(id).value.trim() : ''); }

function numVal(id) {
  const v = parseFloat(val(id));
  return isNaN(v) ? null : v;
}

function intVal(id) {
  const v = parseInt(val(id), 10);
  return isNaN(v) ? null : v;
}

function fmt(n, digits = 0) {
  if (n === null || n === undefined || isNaN(n)) return '–';
  return n.toLocaleString('hu-HU', { minimumFractionDigits: digits, maximumFractionDigits: digits }) + ' Ft';
}

function fmtKm(n, digits = 0) {
  if (n === null || n === undefined || isNaN(n)) return '–';
  return n.toLocaleString('hu-HU', { minimumFractionDigits: digits, maximumFractionDigits: digits }) + ' km';
}

function setVisible(id, visible) {
  const el = $(id);
  if (!el) return;
  el.classList.toggle('hidden', !visible);
}

function getRadioValue(name) {
  const el = document.querySelector(`input[name="${name}"]:checked`);
  return el ? el.value : null;
}

// ─── JSON betöltés ────────────────────────────────────────────────────────────

async function loadJSON(path) {
  try {
    const resp = await fetch(path);
    if (!resp.ok) return null;
    return await resp.json();
  } catch {
    return null;
  }
}

// ─── Inicializálás ────────────────────────────────────────────────────────────

async function init() {
  state.norma = await loadJSON('norma.json');
  state.ceg   = await loadJSON('ceg.json');

  if (!state.norma) {
    console.warn('norma.json nem tölthető be – ellenőrizd a fájlt!');
  }

  betoltCegAdatok();
  betoltUzemanyagTipusok();
  betoltLocalStorage();
  bindEvents();
  frissitAdoszamMegjelenes();
  frissitJarmuMod();
  szamol();
}

// ─── Cégadatok ───────────────────────────────────────────────────────────────

function betoltCegAdatok() {
  if (!state.ceg) return;
  const c = state.ceg;
  if (c.nev)  $('ceg-nev').value  = c.nev;
  if (c.cim)  $('ceg-cim').value  = c.cim;
  if (c.adoszam) {
    const a = c.adoszam;
    if (a.torzsszam)    $('adoszam-torzsszam').value = a.torzsszam;
    if (a.afakod)       $('adoszam-afakod').value    = a.afakod;
    if (a.teruleti_kod) $('adoszam-teruleti').value  = a.teruleti_kod;
    if (a.csoportos) {
      if (a.csoportos_adoszam)  $('adoszam-csoport').value    = a.csoportos_adoszam;
      if (a.csoporttag_adoszam) $('adoszam-csoporttag').value = a.csoporttag_adoszam;
    }
    frissitAdoszamMegjelenes();
  }
}

// ─── Adószám dinamikus megjelenés ─────────────────────────────────────────────

function frissitAdoszamMegjelenes() {
  const afakod = val('adoszam-afakod');
  const csoportos = (afakod === '4' || afakod === '5');
  setVisible('adoszam-csoportos-wrap', csoportos);
  if (csoportos) {
    const lbl = $('adoszam-csoport-label');
    if (lbl) lbl.textContent = afakod === '5'
      ? 'Csoportazonosító adószám'
      : 'Csoportos adószám';
  }
}

// ─── Üzemanyag típusok (norma.json alapján) ───────────────────────────────────

function betoltUzemanyagTipusok() {
  const group = $('uzemanyag-group');
  if (!group || !state.norma) return;

  const tipusok  = state.norma.uzemanyag_tipusok  || ['benzin', 'gazolaj', 'lpg'];
  const cimkek   = state.norma.uzemanyag_cimkek   || {};

  group.innerHTML = '';
  tipusok.forEach((t, i) => {
    const lbl = document.createElement('label');
    lbl.className = 'radio-btn' + (i === 0 ? ' active' : '');
    const inp = document.createElement('input');
    inp.type  = 'radio';
    inp.name  = 'uzemanyag';
    inp.value = t;
    if (i === 0) inp.checked = true;
    lbl.appendChild(inp);
    lbl.appendChild(document.createTextNode(cimkek[t] || t));
    group.appendChild(lbl);
  });
}

// ─── Norma keresés ────────────────────────────────────────────────────────────

function keresNorma() {
  if (!state.norma) return null;
  const jarmuTipus = getRadioValue('jarmu-tipus');
  const hengerur   = intVal('hengerurtartalom');
  if (!hengerur) return null;

  if (jarmuTipus === 'motorkerekpar') {
    // motornál az üzemanyag típusa nem számít, csak a hengerűrtartalom
    const lista = state.norma.motorkerekpar || [];
    for (const t of lista) {
      // segedmotoros nincs hengerűr korlát
      if (t.tipus === 'segedmotoros') {
        // csak akkor vesszük, ha 50 cm3 alatt vagy épp ez az egyetlen egyezés
        // mivel a felhasználó dönti el, hogy segédmotor-e (radio), itt visszaadjuk
        continue; // a segedmotorost csak ha a user azt választotta – de a radio csak szemely/motor van
      }
      const minOk = (t.min === undefined || hengerur >= t.min);
      const maxOk = (t.max === undefined || hengerur <= t.max);
      if (minOk && maxOk) return { norma: t.norma, label: t.label, forras: 'átalány' };
    }
    // ha nem talált, utolsót adjuk vissza
    const lista2 = state.norma.motorkerekpar || [];
    const utolso = lista2[lista2.length - 1];
    return utolso ? { norma: utolso.norma, label: utolso.label, forras: 'átalány' } : null;
  }

  // Személygépkocsi
  const uzemanyag = getRadioValue('uzemanyag') || 'benzin';

  if (uzemanyag === 'lpg') {
    const benzinNorma = keresAlapNormaBenzin(hengerur);
    if (!benzinNorma) return null;
    const mod = state.norma.szemelygepkocsi.lpg?.modosito || 1.2;
    return {
      norma: Math.round(benzinNorma.norma * mod * 10) / 10,
      label: benzinNorma.label + ' × 1,2 (LPG)',
      forras: 'átalány',
    };
  }

  if (uzemanyag === 'cng_lng') {
    const benzinNorma = keresAlapNormaBenzin(hengerur);
    if (!benzinNorma) return null;
    const mod = state.norma.szemelygepkocsi.cng_lng?.modosito || 0.8;
    return {
      norma: Math.round(benzinNorma.norma * mod * 10) / 10,
      label: benzinNorma.label + ' × 0,8 (CNG/LNG)',
      forras: 'átalány',
    };
  }

  const lista = state.norma.szemelygepkocsi[uzemanyag] || [];
  for (const t of lista) {
    const minOk = (t.min === undefined || hengerur >= t.min);
    const maxOk = (t.max === undefined || hengerur <= t.max);
    if (minOk && maxOk) return { norma: t.norma, label: t.label, forras: 'átalány' };
  }
  return null;
}

function keresAlapNormaBenzin(hengerur) {
  if (!state.norma) return null;
  const lista = state.norma.szemelygepkocsi.benzin || [];
  for (const t of lista) {
    const minOk = (t.min === undefined || hengerur >= t.min);
    const maxOk = (t.max === undefined || hengerur <= t.max);
    if (minOk && maxOk) return t;
  }
  return null;
}

// ─── Fogyasztás auto-kitöltés ─────────────────────────────────────────────────

function frissitFogyasztas() {
  const eredmeny = keresNorma();
  const hintEl   = $('norma-forras-hint');
  if (eredmeny) {
    $('fogyasztas').value = eredmeny.norma;
    if (hintEl) hintEl.textContent = `Átalány: ${eredmeny.label}`;
  } else {
    if (hintEl) hintEl.textContent = '';
  }
}

// ─── Jármű mód (személy vs motor) ────────────────────────────────────────────

function frissitJarmuMod() {
  const jarmu = getRadioValue('jarmu-tipus');
  setVisible('uzemanyag-row', jarmu !== 'motorkerekpar');
  frissitFogyasztas();
}

// ─── Hengerűrtartalom hint ────────────────────────────────────────────────────

function frissitHengerHint() {
  const v = intVal('hengerurtartalom');
  const hint = $('hengerurtartalom-hint');
  if (!hint) return;
  if (v && v > 0) {
    const liter = Math.round(v / 100) / 10;
    hint.textContent = `≈ ${liter.toLocaleString('hu-HU', { minimumFractionDigits: 1 })} l`;
  } else {
    hint.textContent = '';
  }
  frissitFogyasztas();
}

// ─── Eseménykezelők ───────────────────────────────────────────────────────────

function bindEvents() {
  // Adószám ÁFA kód → csoportos megjelenés
  $('adoszam-afakod').addEventListener('input', frissitAdoszamMegjelenes);

  // Jármű típus radio
  document.querySelectorAll('input[name="jarmu-tipus"]').forEach(inp => {
    inp.addEventListener('change', () => {
      updateRadioButtons('jarmu-tipus-group', inp.value, 'jarmu-tipus');
      frissitJarmuMod();
    });
  });

  // Üzemanyag radio (delegált, mert dinamikusan töltjük)
  $('uzemanyag-group').addEventListener('change', e => {
    if (e.target.name === 'uzemanyag') {
      updateRadioButtons('uzemanyag-group', e.target.value, 'uzemanyag');
      frissitFogyasztas();
    }
  });

  // Mód radio
  document.querySelectorAll('input[name="mod"]').forEach(inp => {
    inp.addEventListener('change', () => {
      state.mod = inp.value;
      updateRadioButtons('mod-group', inp.value, 'mod');
      setVisible('sec-egyszeru',  inp.value === 'egyszeru');
      setVisible('sec-reszletes', inp.value === 'reszletes');
      szamol();
    });
  });

  // Hengerűrtartalom
  $('hengerurtartalom').addEventListener('input', frissitHengerHint);

  // Futásteljesítmény / összeg → kölcsönös törlés
  $('futasteljesitmeny').addEventListener('input', () => {
    if (val('futasteljesitmeny')) $('osszeg-vissza').value = '';
    szamol();
    mentLocalStorage();
  });
  $('osszeg-vissza').addEventListener('input', () => {
    if (val('osszeg-vissza')) $('futasteljesitmeny').value = '';
    szamol();
  });

  // Norma / ár / amortizáció változás → újraszámol
  ['fogyasztas', 'uzemanyagar', 'amortizacio'].forEach(id => {
    $(id).addEventListener('input', szamol);
  });

  // LocalStorage mentés
  ['ceg-nev', 'ceg-cim', 'adoszam-torzsszam', 'adoszam-afakod', 'adoszam-teruleti',
   'adoszam-csoport', 'adoszam-csoporttag',
   'tulajdonos', 'gyartmany', 'tipus', 'hengerurtartalom', 'amortizacio'].forEach(id => {
    const el = $(id);
    if (el) el.addEventListener('input', mentLocalStorage);
  });

  document.querySelectorAll('input[name="jarmu-tipus"], input[name="uzemanyag"]').forEach(inp => {
    inp.addEventListener('change', mentLocalStorage);
  });

  // Sor hozzáadása
  $('btn-sor-hozzaad').addEventListener('click', () => {
    utvonalSorHozzaad();
    mentLocalStorage();
  });

  // Számítás gomb
  $('btn-szamol').addEventListener('click', () => {
    szamol();
    mentLocalStorage();
  });

  // Nyomtatás
  $('btn-nyomtat').addEventListener('click', nyomtat);

  // Törlés
  $('btn-torles').addEventListener('click', () => {
    if (confirm('Biztosan törli az összes mentett adatot és visszaállítja az űrlapot?')) {
      torles();
    }
  });
}

// ─── Radio gomb stílus szinkron ────────────────────────────────────────────────

function updateRadioButtons(groupId, selectedValue, radioName) {
  const group = $(groupId);
  if (!group) return;
  group.querySelectorAll('.radio-btn').forEach(lbl => {
    const inp = lbl.querySelector(`input[name="${radioName}"]`);
    if (inp) lbl.classList.toggle('active', inp.value === selectedValue);
  });
}

// ─── Számítás ─────────────────────────────────────────────────────────────────

function szamol() {
  if (state.mod === 'egyszeru') szamolEgyszeru();
  else szamolReszletes();
}

function szamolEgyszeru() {
  const fogyasztas  = numVal('fogyasztas');
  const uzemanyagar = numVal('uzemanyagar');
  const amortizacio = numVal('amortizacio') ?? 15;
  const km          = numVal('futasteljesitmeny');
  const osszeg      = numVal('osszeg-vissza');

  const eredmenyDiv = $('egyszeru-eredmeny');

  if (!fogyasztas || !uzemanyagar) {
    eredmenyDiv.classList.add('hidden');
    return;
  }

  const kmAranykolt = (fogyasztas / 100 * uzemanyagar) + amortizacio; // Ft/km

  if (km !== null && km > 0) {
    // km → összeg
    const uzemE = fogyasztas / 100 * uzemanyagar * km;
    const amortE = amortizacio * km;
    const ossz   = uzemE + amortE;

    $('er-uzemanyag').textContent    = fmt(Math.round(uzemE));
    $('er-amortizacio').textContent  = fmt(Math.round(amortE));
    $('er-osszesen').textContent     = fmt(Math.round(ossz));
    $('er-km-row').style.display     = 'none';
    eredmenyDiv.classList.remove('hidden');

  } else if (osszeg !== null && osszeg > 0) {
    // összeg → km visszaszámítás
    const visszaKm = osszeg / kmAranykolt;
    const uzemE    = fogyasztas / 100 * uzemanyagar * visszaKm;
    const amortE   = amortizacio * visszaKm;

    $('er-uzemanyag').textContent    = fmt(Math.round(uzemE));
    $('er-amortizacio').textContent  = fmt(Math.round(amortE));
    $('er-osszesen').textContent     = fmt(Math.round(osszeg));
    $('er-km').textContent           = fmtKm(Math.round(visszaKm));
    $('er-km-row').style.display     = '';
    eredmenyDiv.classList.remove('hidden');

  } else {
    eredmenyDiv.classList.add('hidden');
  }
}

function szamolReszletes() {
  const fogyasztas  = numVal('fogyasztas');
  const uzemanyagar = numVal('uzemanyagar');
  const amortizacio = numVal('amortizacio') ?? 15;

  let osszkm = 0;
  state.utvonalak.forEach(sor => {
    const k = parseInt(sor.km_kezdo, 10);
    const b = parseInt(sor.km_befejezo, 10);
    if (!isNaN(k) && !isNaN(b) && b > k) osszkm += (b - k);
  });

  $('reszletes-ossz-km').textContent = fmtKm(osszkm);

  const eredmenyDiv = $('reszletes-eredmeny');
  if (!fogyasztas || !uzemanyagar || osszkm === 0) {
    eredmenyDiv.classList.add('hidden');
    return;
  }

  const uzemE  = fogyasztas / 100 * uzemanyagar * osszkm;
  const amortE = amortizacio * osszkm;
  const ossz   = uzemE + amortE;

  $('rer-uzemanyag').textContent   = fmt(Math.round(uzemE));
  $('rer-amortizacio').textContent = fmt(Math.round(amortE));
  $('rer-osszesen').textContent    = fmt(Math.round(ossz));
  eredmenyDiv.classList.remove('hidden');
}

// ─── Részletes mód: útvonal sorok ─────────────────────────────────────────────

function utvonalSorHozzaad(adatok) {
  const id = Date.now() + Math.random();
  const sor = {
    id,
    datum:        adatok?.datum        || '',
    km_kezdo:     adatok?.km_kezdo     || '',
    kiindulas:    adatok?.kiindulas    || '',
    km_befejezo:  adatok?.km_befejezo  || '',
    celallomas:   adatok?.celallomas   || '',
  };
  state.utvonalak.push(sor);
  renderUtvonalSor(sor);
  szamolReszletes();
}

function renderUtvonalSor(sor) {
  const tbody = $('utvonal-tbody');
  const tr = document.createElement('tr');
  tr.dataset.id = sor.id;

  tr.innerHTML = `
    <td><input type="date" value="${escHtml(sor.datum)}" data-field="datum" /></td>
    <td><input type="number" min="0" step="1" value="${escHtml(sor.km_kezdo)}" data-field="km_kezdo" placeholder="0" /></td>
    <td><input type="text" value="${escHtml(sor.kiindulas)}" data-field="kiindulas" placeholder="Kiindulás" /></td>
    <td><input type="number" min="0" step="1" value="${escHtml(sor.km_befejezo)}" data-field="km_befejezo" placeholder="0" /></td>
    <td><input type="text" value="${escHtml(sor.celallomas)}" data-field="celallomas" placeholder="Célállomás" /></td>
    <td class="sor-futastelj">0 km</td>
    <td><button type="button" class="btn-sor-torles" title="Sor törlése">✕</button></td>
  `;

  // Futásteljesítmény live számítás
  function frissitFutas() {
    const k = parseInt(tr.querySelector('[data-field="km_kezdo"]').value, 10);
    const b = parseInt(tr.querySelector('[data-field="km_befejezo"]').value, 10);
    const cell = tr.querySelector('.sor-futastelj');
    if (!isNaN(k) && !isNaN(b) && b > k) {
      cell.textContent = fmtKm(b - k);
    } else {
      cell.textContent = '–';
    }
  }

  tr.querySelectorAll('input').forEach(inp => {
    inp.addEventListener('input', () => {
      const field = inp.dataset.field;
      const idx = state.utvonalak.findIndex(s => s.id == tr.dataset.id);
      if (idx >= 0) state.utvonalak[idx][field] = inp.value;
      frissitFutas();
      szamolReszletes();
      mentLocalStorage();
    });
  });

  tr.querySelector('.btn-sor-torles').addEventListener('click', () => {
    const idx = state.utvonalak.findIndex(s => s.id == tr.dataset.id);
    if (idx >= 0) state.utvonalak.splice(idx, 1);
    tr.remove();
    szamolReszletes();
    mentLocalStorage();
  });

  frissitFutas();
  tbody.appendChild(tr);
}

function escHtml(str) {
  return String(str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ─── LocalStorage ─────────────────────────────────────────────────────────────

const LS_KEY = 'utikoltseg_v1';

function mentLocalStorage() {
  const data = {
    elszamolo: {
      nev:             val('ceg-nev'),
      cim:             val('ceg-cim'),
      torzsszam:       val('adoszam-torzsszam'),
      afakod:          val('adoszam-afakod'),
      teruleti:        val('adoszam-teruleti'),
      csoport:         val('adoszam-csoport'),
      csoporttag:      val('adoszam-csoporttag'),
    },
    jarmu: {
      tulajdonos:      val('tulajdonos'),
      jarmu_tipus:     getRadioValue('jarmu-tipus'),
      gyartmany:       val('gyartmany'),
      tipus:           val('tipus'),
      hengerurtartalom: val('hengerurtartalom'),
      uzemanyag:       getRadioValue('uzemanyag'),
      fogyasztas:      val('fogyasztas'),
      uzemanyagar:     val('uzemanyagar'),
      amortizacio:     val('amortizacio'),
    },
    utvonalak: state.utvonalak,
  };
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(data));
  } catch { /* kvóta hiba */ }
}

function betoltLocalStorage() {
  let data;
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return;
    data = JSON.parse(raw);
  } catch { return; }

  if (data.elszamolo) {
    const e = data.elszamolo;
    if (e.nev)        $('ceg-nev').value              = e.nev;
    if (e.cim)        $('ceg-cim').value              = e.cim;
    if (e.torzsszam)  $('adoszam-torzsszam').value    = e.torzsszam;
    if (e.afakod)     $('adoszam-afakod').value       = e.afakod;
    if (e.teruleti)   $('adoszam-teruleti').value     = e.teruleti;
    if (e.csoport)    $('adoszam-csoport').value      = e.csoport;
    if (e.csoporttag) $('adoszam-csoporttag').value   = e.csoporttag;
  }

  if (data.jarmu) {
    const j = data.jarmu;
    if (j.tulajdonos)      $('tulajdonos').value       = j.tulajdonos;
    if (j.gyartmany)       $('gyartmany').value        = j.gyartmany;
    if (j.tipus)           $('tipus').value            = j.tipus;
    if (j.hengerurtartalom) $('hengerurtartalom').value = j.hengerurtartalom;
    if (j.fogyasztas)      $('fogyasztas').value       = j.fogyasztas;
    if (j.uzemanyagar)     $('uzemanyagar').value      = j.uzemanyagar;
    if (j.amortizacio)     $('amortizacio').value      = j.amortizacio;

    if (j.jarmu_tipus) {
      const inp = document.querySelector(`input[name="jarmu-tipus"][value="${j.jarmu_tipus}"]`);
      if (inp) { inp.checked = true; updateRadioButtons('jarmu-tipus-group', j.jarmu_tipus, 'jarmu-tipus'); }
    }
    if (j.uzemanyag) {
      // A dinamikus rádió gombok már betöltve → kis késleltetéssel
      setTimeout(() => {
        const inp = document.querySelector(`input[name="uzemanyag"][value="${j.uzemanyag}"]`);
        if (inp) { inp.checked = true; updateRadioButtons('uzemanyag-group', j.uzemanyag, 'uzemanyag'); }
      }, 0);
    }
    frissitHengerHint();
    frissitJarmuMod();
  }

  if (data.utvonalak && Array.isArray(data.utvonalak)) {
    data.utvonalak.forEach(sor => utvonalSorHozzaad(sor));
  }
}

function torles() {
  try { localStorage.removeItem(LS_KEY); } catch { /* */ }
  location.reload();
}

// ─── Nyomtatás ────────────────────────────────────────────────────────────────

function nyomtat() {
  const printView = $('print-view');
  printView.classList.remove('hidden');
  printView.innerHTML = '<div id="print-content">' + buildPrintHTML() + '</div>';
  window.print();
}

function buildPrintHTML() {
  const fogyasztas  = numVal('fogyasztas');
  const uzemanyagar = numVal('uzemanyagar');
  const amortizacio = numVal('amortizacio') ?? 15;
  const uzemanyagNev = getRadioValue('uzemanyag') || '';
  const cimkek = state.norma?.uzemanyag_cimkek || {};

  // Adatok összegyűjtése
  const cegNev    = val('ceg-nev');
  const cegCim    = val('ceg-cim');
  const torzsszam = val('adoszam-torzsszam');
  const afakod    = val('adoszam-afakod');
  const teruleti  = val('adoszam-teruleti');
  const adoszam   = torzsszam && afakod && teruleti
    ? `${torzsszam}-${afakod}-${teruleti}` : '–';

  const tulajdonos = val('tulajdonos');
  const gyartmany  = val('gyartmany');
  const tipus      = val('tipus');
  const hengerur   = val('hengerurtartalom');
  const jarmuTipus = getRadioValue('jarmu-tipus') === 'motorkerekpar' ? 'Motorkerékpár' : 'Személygépjármű';

  const ma = new Date().toLocaleDateString('hu-HU');

  let tartalom = '';

  if (state.mod === 'egyszeru') {
    const km     = numVal('futasteljesitmeny');
    const osszeg = numVal('osszeg-vissza');

    let osszkm = km;
    let uzemE = 0, amortE = 0, ossz = 0;

    if (km && km > 0) {
      uzemE  = (fogyasztas ?? 0) / 100 * (uzemanyagar ?? 0) * km;
      amortE = amortizacio * km;
      ossz   = uzemE + amortE;
    } else if (osszeg) {
      const kmAranykolt = (fogyasztas ?? 0) / 100 * (uzemanyagar ?? 0) + amortizacio;
      osszkm = kmAranykolt > 0 ? osszeg / kmAranykolt : 0;
      uzemE  = (fogyasztas ?? 0) / 100 * (uzemanyagar ?? 0) * osszkm;
      amortE = amortizacio * osszkm;
      ossz   = osszeg;
    }

    tartalom = `
      <div class="print-osszesites">
        <div class="print-osszesites-sor"><span>Futásteljesítmény:</span><strong>${fmtKm(Math.round(osszkm ?? 0))}</strong></div>
        <div class="print-osszesites-sor"><span>Üzemanyag (${fmt(uzemanyagar ?? 0, 0)}/l × ${fogyasztas ?? 0} l/100km):</span><strong>${fmt(Math.round(uzemE))}</strong></div>
        <div class="print-osszesites-sor"><span>Amortizáció (${amortizacio} Ft/km):</span><strong>${fmt(Math.round(amortE))}</strong></div>
        <div class="print-osszesites-sor total"><span>Összesen:</span><strong>${fmt(Math.round(ossz))}</strong></div>
      </div>`;

  } else {
    // Részletes táblázat
    let sorHtml = '';
    let osszkm = 0;

    state.utvonalak.forEach(sor => {
      const k = parseInt(sor.km_kezdo, 10);
      const b = parseInt(sor.km_befejezo, 10);
      const futas = (!isNaN(k) && !isNaN(b) && b > k) ? (b - k) : 0;
      osszkm += futas;
      sorHtml += `<tr>
        <td>${escHtml(sor.datum)}</td>
        <td>${escHtml(sor.km_kezdo)}</td>
        <td>${escHtml(sor.kiindulas)}</td>
        <td>${escHtml(sor.km_befejezo)}</td>
        <td>${escHtml(sor.celallomas)}</td>
        <td>${futas > 0 ? fmtKm(futas) : '–'}</td>
      </tr>`;
    });

    const uzemE  = (fogyasztas ?? 0) / 100 * (uzemanyagar ?? 0) * osszkm;
    const amortE = amortizacio * osszkm;
    const ossz   = uzemE + amortE;

    tartalom = `
      <table class="print-table">
        <thead>
          <tr>
            <th>Dátum</th><th>Km kezdő</th><th>Kiindulás</th>
            <th>Km befejező</th><th>Célállomás</th><th>Futástelj.</th>
          </tr>
        </thead>
        <tbody>${sorHtml}</tbody>
      </table>
      <div class="print-osszesites">
        <div class="print-osszesites-sor"><span>Összesített futásteljesítmény:</span><strong>${fmtKm(osszkm)}</strong></div>
        <div class="print-osszesites-sor"><span>Üzemanyag (${fmt(uzemanyagar ?? 0, 0)}/l × ${fogyasztas ?? 0} l/100km):</span><strong>${fmt(Math.round(uzemE))}</strong></div>
        <div class="print-osszesites-sor"><span>Amortizáció (${amortizacio} Ft/km):</span><strong>${fmt(Math.round(amortE))}</strong></div>
        <div class="print-osszesites-sor total"><span>Összesen:</span><strong>${fmt(Math.round(ossz))}</strong></div>
      </div>`;
  }

  return `
    <h1>Útnyilvántartás és Útiköltség-elszámolás</h1>

    <h2>Elszámoló adatai</h2>
    <div class="print-adatok">
      <div class="print-adat-sor"><span>Név:</span>${escHtml(cegNev)}</div>
      <div class="print-adat-sor"><span>Cím:</span>${escHtml(cegCim)}</div>
      <div class="print-adat-sor"><span>Adószám:</span>${escHtml(adoszam)}</div>
    </div>

    <h2>Gépjármű adatai</h2>
    <div class="print-adatok">
      <div class="print-adat-sor"><span>Tulajdonos:</span>${escHtml(tulajdonos)}</div>
      <div class="print-adat-sor"><span>Jármű:</span>${escHtml(jarmuTipus)}</div>
      <div class="print-adat-sor"><span>Gyártmány / Típus:</span>${escHtml(gyartmany)} ${escHtml(tipus)}</div>
      <div class="print-adat-sor"><span>Hengerűrtartalom:</span>${escHtml(hengerur)} cm³</div>
      <div class="print-adat-sor"><span>Üzemanyag:</span>${escHtml(cimkek[uzemanyagNev] || uzemanyagNev)}</div>
      <div class="print-adat-sor"><span>Fogyasztás:</span>${fogyasztas ?? '–'} l/100 km</div>
      <div class="print-adat-sor"><span>Üzemanyagár:</span>${uzemanyagar ?? '–'} Ft/liter</div>
      <div class="print-adat-sor"><span>Amortizáció:</span>${amortizacio} Ft/km</div>
    </div>

    <h2>Elszámolás</h2>
    ${tartalom}

    <div class="print-datum-mezo">Kelt: ${ma}</div>

    <div class="print-alairasok">
      <div class="print-alairasok-mezo">Elszámoló aláírása</div>
      <div class="print-alairasok-mezo">Jóváhagyó aláírása</div>
    </div>

    <div class="print-footer">
      Alapnorma: 60/1992. (IV. 1.) Korm. rendelet | Üzemanyagár: NAV – nav.gov.hu/ugyfeliranytu/uzemanyag/
    </div>
  `;
}

// ─── Indítás ─────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', init);
