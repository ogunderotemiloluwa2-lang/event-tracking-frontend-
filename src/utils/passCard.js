// Attendee pass-card generator.
//
// Renders a premium, printable event pass onto a <canvas> and lets the
// attendee save it as a PNG image or a PDF. Both are produced with zero
// external dependencies: the PDF is assembled by hand as a single-page
// document that embeds the canvas as a JPEG (DCTDecode) image stream.

const BRAND = '#D97706';
const BRAND_DARK = '#B45309';
const BRAND_LIGHT = '#F59E0B';
const INK = '#1f2937';
const MUTED = '#6b7280';
const LIGHT_BG = '#faf7f2';
const BORDER = '#eadfce';

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.crossOrigin = 'anonymous';
    img.src = src;
  });
}

function triggerDownload(url, filename) {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = String(text || '').split(/\s+/);
  let line = '';
  let cursorY = y;
  for (const word of words) {
    const test = line ? line + ' ' + word : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, cursorY);
      line = word;
      cursorY += lineHeight;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, cursorY);
  return cursorY + lineHeight;
}

function formatDate(date) {
  if (!date) return 'Date TBA';
  try {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'short', year: 'numeric', month: 'long', day: 'numeric'
    });
  } catch {
    return String(date);
  }
}

function formatTime(start, end) {
  if (!start) return 'TBA';
  let t = start;
  if (end) t += ' – ' + end;
  return t;
}

// Draw the pass onto a fresh canvas and return it.
export async function renderPassCard({ event = {}, passId, attendeeName, attendeeNumber }) {
  const W = 800;
  const H = 1200;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  // ── Card background ──────────────────────────────────────────────
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);

  // Subtle background pattern (diagonal lines)
  ctx.save();
  ctx.strokeStyle = 'rgba(217, 119, 6, 0.04)';
  ctx.lineWidth = 1;
  for (let i = -H; i < W + H; i += 24) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i - H, H);
    ctx.stroke();
  }
  ctx.restore();

  // ── Top decorative band ──────────────────────────────────────────
  const grad = ctx.createLinearGradient(0, 0, W, 0);
  grad.addColorStop(0, BRAND);
  grad.addColorStop(0.5, BRAND_LIGHT);
  grad.addColorStop(1, BRAND_DARK);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, 8);

  // ── Header section ───────────────────────────────────────────────
  // Gold accent bar
  ctx.fillStyle = BRAND;
  ctx.fillRect(48, 48, 6, 100);

  ctx.fillStyle = MUTED;
  ctx.font = '600 18px "Segoe UI", Arial, sans-serif';
  ctx.textBaseline = 'top';
  ctx.fillText('EVENT PASS', 72, 52);

  ctx.fillStyle = INK;
  ctx.font = '700 42px "Segoe UI", Arial, sans-serif';
  wrapText(ctx, event.title || 'Event', 72, 80, W - 144, 48);

  // ── Hosted by line ───────────────────────────────────────────────
  ctx.fillStyle = MUTED;
  ctx.font = '400 18px "Segoe UI", Arial, sans-serif';
  ctx.fillText(`Hosted by ${event.createdBy?.name || event.organizer?.name || 'Organizer'}`, 72, 170);

  // ── Divider ──────────────────────────────────────────────────────
  ctx.strokeStyle = BORDER;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(48, 210);
  ctx.lineTo(W - 48, 210);
  ctx.stroke();

  // ── Attendee info section ────────────────────────────────────────
  ctx.fillStyle = LIGHT_BG;
  ctx.fillRect(48, 230, W - 96, 130);
  ctx.strokeStyle = BORDER;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(48, 230, W - 96, 130);

  // Attendee name
  ctx.fillStyle = MUTED;
  ctx.font = '600 16px "Segoe UI", Arial, sans-serif';
  ctx.fillText('ATTENDEE', 72, 252);

  ctx.fillStyle = INK;
  ctx.font = '700 32px "Segoe UI", Arial, sans-serif';
  ctx.fillText(attendeeName || '—', 72, 278);

  // Attendee number (right side)
  if (attendeeNumber) {
    ctx.textAlign = 'right';
    ctx.fillStyle = MUTED;
    ctx.font = '600 14px "Segoe UI", Arial, sans-serif';
    ctx.fillText('ATTENDEE NO.', W - 72, 252);
    ctx.fillStyle = BRAND_DARK;
    ctx.font = '700 36px "Segoe UI", Arial, sans-serif';
    ctx.fillText(`#${attendeeNumber}`, W - 72, 280);
    ctx.textAlign = 'left';
  }

  // ── Event details grid ───────────────────────────────────────────
  const details = [
    { label: 'DATE', value: formatDate(event.date) },
    { label: 'TIME', value: formatTime(event.startTime, event.endTime) },
    { label: 'VENUE', value: event.venue || event.location || 'TBA' },
    { label: 'LOCATION', value: event.location || 'TBA' },
    { label: 'DRESS CODE', value: event.dressCode || 'No dress code' },
  ];

  let y = 400;
  const col1X = 72;
  const col2X = W / 2 + 24;
  const rowH = 72;

  for (let i = 0; i < details.length; i++) {
    const x = i < 3 ? col1X : col2X;
    const idx = i < 3 ? i : i - 3;
    const rowY = y + idx * rowH;

    ctx.fillStyle = MUTED;
    ctx.font = '600 14px "Segoe UI", Arial, sans-serif';
    ctx.fillText(details[i].label, x, rowY);

    ctx.fillStyle = INK;
    ctx.font = '500 22px "Segoe UI", Arial, sans-serif';
    wrapText(ctx, details[i].value, x, rowY + 24, (W / 2) - 96, 26);
  }

  // ── Pass ID section ──────────────────────────────────────────────
  const passY = y + 3 * rowH + 20;
  ctx.fillStyle = LIGHT_BG;
  ctx.fillRect(48, passY, W - 96, 100);
  ctx.strokeStyle = BORDER;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(48, passY, W - 96, 100);

  ctx.fillStyle = MUTED;
  ctx.font = '600 16px "Segoe UI", Arial, sans-serif';
  ctx.fillText('PASS ID', 72, passY + 22);

  ctx.fillStyle = BRAND_DARK;
  ctx.font = '700 44px "Courier New", monospace';
  ctx.fillText(passId || event.passId || '', 72, passY + 72);

  // ── QR Code ──────────────────────────────────────────────────────
  const qrSrc = event.qrCode;
  const qrSize = 200;
  const qrX = (W - qrSize) / 2;
  const qrY = passY + 140;
  if (qrSrc) {
    try {
      const qrImg = await loadImage(qrSrc);
      // White background behind QR
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(qrX - 8, qrY - 8, qrSize + 16, qrSize + 16);
      ctx.strokeStyle = BORDER;
      ctx.lineWidth = 1;
      ctx.strokeRect(qrX - 8, qrY - 8, qrSize + 16, qrSize + 16);
      ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
    } catch {
      /* QR optional */
    }
  }

  // ── Footer text ──────────────────────────────────────────────────
  ctx.fillStyle = MUTED;
  ctx.font = '400 16px "Segoe UI", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Show this pass at the entrance', W / 2, qrY + qrSize + 50);

  // Bottom decorative band
  const grad2 = ctx.createLinearGradient(0, 0, W, 0);
  grad2.addColorStop(0, BRAND);
  grad2.addColorStop(0.5, BRAND_LIGHT);
  grad2.addColorStop(1, BRAND_DARK);
  ctx.fillStyle = grad2;
  ctx.fillRect(0, H - 8, W, 8);

  ctx.textAlign = 'left';

  return canvas;
}

export async function downloadPassImage(opts) {
  const canvas = await renderPassCard(opts);
  const url = canvas.toDataURL('image/png');
  triggerDownload(url, `event-pass-${opts.passId || 'card'}.png`);
}

export async function downloadPassPdf(opts) {
  const canvas = await renderPassCard(opts);
  const jpegUrl = canvas.toDataURL('image/jpeg', 0.92);
  const jpegBytes = dataUrlToBytes(jpegUrl);
  const blob = buildPdfFromJpeg(jpegBytes, canvas.width, canvas.height);
  const url = URL.createObjectURL(blob);
  triggerDownload(url, `event-pass-${opts.passId || 'card'}.pdf`);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

// ── raw helpers ─────────────────────────────────────────────────────

function dataUrlToBytes(dataUrl) {
  const base64 = dataUrl.split(',')[1];
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function strToBytes(str) {
  const bytes = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) bytes[i] = str.charCodeAt(i) & 0xff;
  return bytes;
}

// Build a minimal, valid single-page PDF that draws the given JPEG full-page.
function buildPdfFromJpeg(jpegBytes, imgW, imgH) {
  const pageW = 500;
  const pageH = Math.round((imgH / imgW) * pageW);

  const pieces = [];
  let length = 0;
  const offsets = [];

  const push = (data) => {
    const bytes = data instanceof Uint8Array ? data : strToBytes(data);
    pieces.push(bytes);
    length += bytes.length;
  };

  push('%PDF-1.4\n%\xFF\xFF\xFF\xFF\n');

  offsets[1] = length;
  push('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');

  offsets[2] = length;
  push('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n');

  offsets[3] = length;
  push(`3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW} ${pageH}] ` +
       `/Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>\nendobj\n`);

  offsets[4] = length;
  push(`4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${imgW} /Height ${imgH} ` +
       `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>\nstream\n`);
  push(jpegBytes);
  push('\nendstream\nendobj\n');

  const content = `q\n${pageW} 0 0 ${pageH} 0 0 cm\n/Im0 Do\nQ\n`;
  offsets[5] = length;
  push(`5 0 obj\n<< /Length ${content.length} >>\nstream\n${content}endstream\nendobj\n`);

  const xrefStart = length;
  let xref = 'xref\n0 6\n0000000000 65535 f \n';
  for (let n = 1; n <= 5; n++) {
    xref += String(offsets[n]).padStart(10, '0') + ' 00000 n \n';
  }
  push(xref);
  push(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`);

  return new Blob(pieces, { type: 'application/pdf' });
}
