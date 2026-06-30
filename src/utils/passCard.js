// Attendee pass-card generator.
//
// Renders a printable event pass onto a <canvas> and lets the attendee save it
// as a PNG image or a PDF. Both are produced with zero external dependencies:
// the PDF is assembled by hand as a single-page document that embeds the
// canvas as a JPEG (DCTDecode) image stream.

const BRAND = '#D97706';
const BRAND_DARK = '#B45309';
const INK = '#1f2937';
const MUTED = '#6b7280';

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
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
  return cursorY;
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

// Draw the pass onto a fresh canvas and return it.
export async function renderPassCard({ event = {}, passId, attendeeName }) {
  const W = 760;
  const H = 1140;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  // Card background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);

  // Header band
  const grad = ctx.createLinearGradient(0, 0, W, 220);
  grad.addColorStop(0, BRAND);
  grad.addColorStop(1, BRAND_DARK);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, 220);

  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = '600 26px Arial, sans-serif';
  ctx.fillText('EVENT PASS', 48, 70);

  ctx.fillStyle = '#ffffff';
  ctx.font = '700 44px Arial, sans-serif';
  wrapText(ctx, event.title || 'Event', 48, 130, W - 96, 50);

  // Hosted by
  ctx.fillStyle = INK;
  ctx.font = '400 22px Arial, sans-serif';
  ctx.fillText(`Hosted by ${event.createdBy?.name || event.organizer?.name || 'Organizer'}`, 48, 280);

  // Detail rows
  const rows = [
    ['Attendee', attendeeName || '—'],
    ['Date', formatDate(event.date)],
    ['Time', event.startTime ? `${event.startTime}${event.endTime ? ' – ' + event.endTime : ''}` : 'TBA'],
    ['Venue', event.venue || event.location || 'TBA'],
    ['Location', event.location || 'TBA'],
    ['Dress Code', event.dressCode || 'No dress code'],
  ];

  let y = 340;
  ctx.textBaseline = 'alphabetic';
  for (const [label, value] of rows) {
    ctx.fillStyle = MUTED;
    ctx.font = '600 18px Arial, sans-serif';
    ctx.fillText(label.toUpperCase(), 48, y);
    ctx.fillStyle = INK;
    ctx.font = '500 26px Arial, sans-serif';
    wrapText(ctx, value, 48, y + 32, W - 96, 30);
    y += 78;
  }

  // Pass ID block
  const boxY = y + 10;
  ctx.fillStyle = '#faf7f2';
  ctx.fillRect(48, boxY, W - 96, 120);
  ctx.strokeStyle = '#eadfce';
  ctx.lineWidth = 2;
  ctx.strokeRect(48, boxY, W - 96, 120);

  ctx.fillStyle = MUTED;
  ctx.font = '600 18px Arial, sans-serif';
  ctx.fillText('PASS ID', 72, boxY + 42);
  ctx.fillStyle = BRAND_DARK;
  ctx.font = '700 48px "Courier New", monospace';
  ctx.fillText(passId || event.passId || '', 72, boxY + 96);

  // QR code (bottom). event.qrCode is a PNG data URL.
  const qrSrc = event.qrCode;
  const qrSize = 240;
  const qrX = (W - qrSize) / 2;
  const qrY = boxY + 170;
  if (qrSrc) {
    try {
      const qrImg = await loadImage(qrSrc);
      ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
    } catch {
      /* QR optional — skip if it fails to load */
    }
  }

  ctx.fillStyle = MUTED;
  ctx.font = '400 18px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Show this pass at the entrance', W / 2, qrY + qrSize + 40);
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

// --- raw helpers -----------------------------------------------------------

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
  // Scale the page to a sensible width (in PDF points) while keeping aspect.
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
