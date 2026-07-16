// ─── HAMBURGER NAV TOGGLE ───────────────────────────────────────────────────
const hamburgerBtn = document.getElementById('hamburgerBtn');
const navMenu      = document.getElementById('navMenu');
const navOverlay   = document.getElementById('navOverlay');

function openNav() {
  navMenu.classList.add('active');
  navOverlay.classList.add('active');
  hamburgerBtn.classList.add('active');
  hamburgerBtn.setAttribute('aria-expanded', 'true');
}
function closeNav() {
  navMenu.classList.remove('active');
  navOverlay.classList.remove('active');
  hamburgerBtn.classList.remove('active');
  hamburgerBtn.setAttribute('aria-expanded', 'false');
}
hamburgerBtn.addEventListener('click', () => {
  if (navMenu.classList.contains('active')) closeNav();
  else openNav();
});
navOverlay.addEventListener('click', closeNav);

let selectedShape = 'square';

const shapeHints = {
  square:  ['Kotak',    'modul QR berbentuk persegi tajam'],
  rounded: ['Bulat',    'persegi dengan sudut membulat, modern'],
  circle:  ['Lingkaran','setiap modul berbentuk lingkaran'],
  diamond: ['Wajik',    'setiap modul berbentuk wajik / belah ketupat'],
  star:    ['Bintang',  'setiap modul berbentuk bintang 5 sudut'],
  cross:   ['Salib +',  'setiap modul berbentuk tanda plus (+)'],
  leaf:    ['Daun',     'modul dengan sudut melengkung asimetris'],
  heart:   ['Love ♥',  'setiap modul berbentuk hati kecil'],
};

document.querySelectorAll('.shape-opt').forEach(el => {
  el.addEventListener('click', () => {
    document.querySelectorAll('.shape-opt').forEach(e => e.classList.remove('selected'));
    el.classList.add('selected');
    selectedShape = el.dataset.shape;
    const [name, desc] = shapeHints[selectedShape] || ['', ''];
    document.getElementById('shapeHint').innerHTML =
      `<strong>${name}</strong> — ${desc}`;
  });
});

function syncHex(colorId, hexId) {
  document.getElementById(hexId).value = document.getElementById(colorId).value;
}
function syncColor(hexId, colorId) {
  const v = document.getElementById(hexId).value;
  if (/^#[0-9a-fA-F]{6}$/.test(v)) document.getElementById(colorId).value = v;
}

// ─── Ambil matrix QR dari QRCode.js ────────────────────────────────────────
function getQRMatrix(text) {
  const hidden = document.getElementById('qrHidden');
  hidden.innerHTML = '';
  const qr = new QRCode(hidden, {
    text,
    width: 1, height: 1,
    correctLevel: QRCode.CorrectLevel.M  // M cukup, error correction lebih ringan = lebih scannable
  });
  const model = qr._oQRCode;
  const count = model.moduleCount;
  const matrix = [];
  for (let r = 0; r < count; r++) {
    matrix.push([]);
    for (let c = 0; c < count; c++) matrix[r].push(model.isDark(r, c));
  }
  hidden.innerHTML = '';
  return { matrix, count };
}

// ─── Cek apakah modul termasuk finder pattern (pojok) ─────────────────────
// Finder pattern ada di 3 pojok: top-left, top-right, bottom-left
// Ukurannya 7x7 modul (termasuk quiet zone 1 modul)
function isFinderPattern(r, c, count) {
  // Top-left: r 0-7, c 0-7
  if (r < 8 && c < 8) return true;
  // Top-right: r 0-7, c count-8 to count-1
  if (r < 8 && c >= count - 8) return true;
  // Bottom-left: r count-8 to count-1, c 0-7
  if (r >= count - 8 && c < 8) return true;
  return false;
}

// ─── Gambar satu modul sesuai shape ────────────────────────────────────────
function drawModule(ctx, shape, x, y, size, isFinder) {
  // Finder pattern selalu kotak bulat supaya scanner bisa detect
  if (isFinder) {
    const r = size * 0.15;
    ctx.beginPath();
    roundRect(ctx, x, y, size, size, r);
    ctx.fill();
    return;
  }

  const pad = size * 0.08; // padding antar modul
  const s = size - pad * 2;
  const ox = x + pad;
  const oy = y + pad;
  const cx = ox + s / 2;
  const cy = oy + s / 2;
  const r  = s / 2;

  ctx.beginPath();
  switch (shape) {

    case 'square':
      ctx.rect(ox, oy, s, s);
      break;

    case 'rounded': {
      const rr = s * 0.35;
      roundRect(ctx, ox, oy, s, s, rr);
      break;
    }

    case 'circle':
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      break;

    case 'diamond':
      ctx.moveTo(cx, oy);
      ctx.lineTo(ox + s, cy);
      ctx.lineTo(cx, oy + s);
      ctx.lineTo(ox, cy);
      ctx.closePath();
      break;

    case 'star': {
      const outerR = r * 0.95;
      const innerR = r * 0.40;
      const pts = 5;
      for (let i = 0; i < pts * 2; i++) {
        const rad   = i % 2 === 0 ? outerR : innerR;
        const angle = (i * Math.PI / pts) - Math.PI / 2;
        if (i === 0) ctx.moveTo(cx + rad * Math.cos(angle), cy + rad * Math.sin(angle));
        else         ctx.lineTo(cx + rad * Math.cos(angle), cy + rad * Math.sin(angle));
      }
      ctx.closePath();
      break;
    }

    case 'cross': {
      const t = s * 0.34; // ketebalan cross
      const h = s;
      // Vertikal
      ctx.rect(cx - t/2, oy, t, h);
      ctx.rect(ox, cy - t/2, h, t);
      break;
    }

    case 'leaf': {
      // Satu sudut tajam, satu sudut melengkung
      ctx.moveTo(ox, oy);
      ctx.quadraticCurveTo(ox + s, oy, ox + s, oy + s);
      ctx.lineTo(ox, oy + s);
      ctx.closePath();
      break;
    }

    case 'heart': {
      // Heart kecil yang proper
      const w = s, h = s;
      ctx.moveTo(ox + w*0.5, oy + h*0.25);
      ctx.bezierCurveTo(ox+w*0.5, oy+h*0.15,  ox+w*0.35, oy,        ox+w*0.2, oy);
      ctx.bezierCurveTo(ox,        oy,          ox,        oy+h*0.4,  ox+w*0.5, oy+h*0.75);
      ctx.bezierCurveTo(ox+w,      oy+h*0.4,   ox+w,      oy,        ox+w*0.8, oy);
      ctx.bezierCurveTo(ox+w*0.65, oy,         ox+w*0.5,  oy+h*0.15, ox+w*0.5, oy+h*0.25);
      ctx.closePath();
      break;
    }

    default:
      ctx.rect(ox, oy, s, s);
  }
  ctx.fill();
}

// Helper roundRect (untuk browser yang belum support native ctx.roundRect)
function roundRect(ctx, x, y, w, h, r) {
  if (ctx.roundRect) {
    ctx.roundRect(x, y, w, h, r);
  } else {
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }
}

// ─── GENERATE ───────────────────────────────────────────────────────────────
function generateQR() {
  const text = document.getElementById('urlInput').value.trim();
  if (!text) return;

  const fg = document.getElementById('colorFg').value;
  const bg = document.getElementById('colorBg').value;

  let matrix, count;
  try {
    const res = getQRMatrix(text);
    matrix = res.matrix;
    count  = res.count;
  } catch(e) {
    alert('Gagal generate QR.');
    return;
  }

  // Ukuran canvas berdasarkan jumlah modul agar tetap tajam
  const CELL = 10;  // px per modul
  const PAD  = CELL * 4; // quiet zone 4 modul
  const SIZE = count * CELL + PAD * 2;

  const canvas = document.getElementById('qrCanvas');
  canvas.width  = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, SIZE, SIZE);

  // Gambar semua modul
  ctx.fillStyle = fg;
  for (let r = 0; r < count; r++) {
    for (let c = 0; c < count; c++) {
      if (!matrix[r][c]) continue;
      const finder = isFinderPattern(r, c, count);
      const x = PAD + c * CELL;
      const y = PAD + r * CELL;
      drawModule(ctx, selectedShape, x, y, CELL, finder);
    }
  }

  document.getElementById('qrLabel').textContent = text;
  document.getElementById('qrOutput').classList.add('visible');
}

// ─── DOWNLOAD ───────────────────────────────────────────────────────────────
function downloadQR() {
  const src = document.getElementById('qrCanvas');
  // Export langsung dari canvas QR (sudah include quiet zone)
  const a = document.createElement('a');
  a.download = 'qrcode-' + selectedShape + '.png';
  a.href = src.toDataURL('image/png');
  a.click();
}

document.addEventListener('keydown', e => {
  if (e.key === 'Enter') generateQR();
});

