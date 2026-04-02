import fs from 'node:fs/promises';
import path from 'node:path';

const rawDir = path.resolve('src/tools/quadrilateral-intake/out/raw/siyavula-grade8');
const outPath = path.resolve('src/tools/quadrilateral-intake/out/siyavula-quadrilateral-notes.json');

const keywords = [
  'quadrilateral',
  'parallelogram',
  'rectangle',
  'square',
  'rhombus',
  'trapez',
  'kite',
  'diagonal',
  'opposite side',
  'opposite angle'
];

function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractSnippets(text) {
  const pieces = text
    .split(/[.!?]\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const hits = [];
  for (const piece of pieces) {
    const lower = piece.toLowerCase();
    if (keywords.some((k) => lower.includes(k))) {
      hits.push(piece);
    }
  }

  return [...new Set(hits)].slice(0, 160);
}

const files = (await fs.readdir(rawDir))
  .filter((name) => name.endsWith('.html'))
  .map((name) => path.join(rawDir, name));

const report = {
  generatedAt: new Date().toISOString(),
  source: 'siyavula-grade8',
  keywordList: keywords,
  files: []
};

for (const filePath of files) {
  const html = await fs.readFile(filePath, 'utf8');
  const text = stripHtml(html);
  const snippets = extractSnippets(text);

  report.files.push({
    filePath,
    snippetCount: snippets.length,
    snippets
  });
}

await fs.writeFile(outPath, JSON.stringify(report, null, 2));

console.log(`Wrote extracted notes to ${outPath}`);
for (const file of report.files) {
  console.log(`${path.basename(file.filePath)} snippets=${file.snippetCount}`);
}
