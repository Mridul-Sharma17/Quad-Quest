import fs from 'node:fs/promises';
import path from 'node:path';

const discoveryPath = path.resolve('src/tools/quadrilateral-intake/out/discovery.class8.json');
const rawRoot = path.resolve('src/tools/quadrilateral-intake/out/raw');
const indexPath = path.resolve('src/tools/quadrilateral-intake/out/source-snapshots.index.json');

function sanitizeFileName(value) {
  return value.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 120);
}

function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function fetchWithTimeout(url, timeoutMs = 25000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'user-agent': 'quest-quads-intake/1.0'
      }
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.text();
  } finally {
    clearTimeout(timer);
  }
}

const discoveryRaw = await fs.readFile(discoveryPath, 'utf8');
const discovery = JSON.parse(discoveryRaw);

const report = {
  generatedAt: new Date().toISOString(),
  sourceCount: discovery.sources.length,
  snapshots: []
};

for (const source of discovery.sources) {
  const sourceDir = path.join(rawRoot, source.id);
  await fs.mkdir(sourceDir, { recursive: true });

  for (let i = 0; i < source.candidates.length; i += 1) {
    const url = source.candidates[i];
    const fileBase = sanitizeFileName(`${String(i + 1).padStart(3, '0')}_${new URL(url).hostname}_${new URL(url).pathname}`);
    const htmlPath = path.join(sourceDir, `${fileBase}.html`);

    const row = {
      sourceId: source.id,
      url,
      status: 'ok',
      error: null,
      htmlPath,
      textPreview: ''
    };

    try {
      const html = await fetchWithTimeout(url);
      await fs.writeFile(htmlPath, html);
      const text = stripHtml(html);
      row.textPreview = text.slice(0, 280);
    } catch (error) {
      row.status = 'error';
      row.error = String(error?.message || error);
    }

    report.snapshots.push(row);
  }
}

await fs.mkdir(path.dirname(indexPath), { recursive: true });
await fs.writeFile(indexPath, JSON.stringify(report, null, 2));

console.log(`Wrote snapshot index to ${indexPath}`);
const ok = report.snapshots.filter((s) => s.status === 'ok').length;
const bad = report.snapshots.filter((s) => s.status !== 'ok').length;
console.log(`Snapshots: ok=${ok} error=${bad}`);
