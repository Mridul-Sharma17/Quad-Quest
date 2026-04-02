import fs from 'node:fs/promises';
import path from 'node:path';

const outDir = path.resolve('src/tools/quadrilateral-intake/out');
const outPath = path.join(outDir, 'discovery.class8.json');

const sources = [
  {
    id: 'siyavula-grade8',
    url: 'https://www.siyavula.com/read/maths/grade-8',
    includeAny: [
      'quadrilateral',
      'construction-of-geometric-figures/11-construction-of-geometric-figures?id=toc-id-16',
      'construction-of-geometric-figures/11-construction-of-geometric-figures?id=toc-id-17',
      'geometry-of-shapes/12-geometry-of-shapes?id=toc-id-21',
      'geometry-of-shapes/12-geometry-of-shapes?id=toc-id-22'
    ],
    manualSeeds: [
      'https://www.siyavula.com/read-partner/Ukuqonda/za/mathematics/grade-8/construction-of-geometric-figures/11-construction-of-geometric-figures?id=toc-id-16#toc-id-16',
      'https://www.siyavula.com/read-partner/Ukuqonda/za/mathematics/grade-8/construction-of-geometric-figures/11-construction-of-geometric-figures?id=toc-id-17#toc-id-17',
      'https://www.siyavula.com/read-partner/Ukuqonda/za/mathematics/grade-8/geometry-of-shapes/12-geometry-of-shapes?id=toc-id-21#toc-id-21',
      'https://www.siyavula.com/read-partner/Ukuqonda/za/mathematics/grade-8/geometry-of-shapes/12-geometry-of-shapes?id=toc-id-22#toc-id-22'
    ]
  },
  {
    id: 'openstax-math',
    url: 'https://openstax.org/subjects/math',
    includeAny: ['prealgebra', 'algebra-1', 'geometry'],
    manualSeeds: [
      'https://openstax.org/subjects/math',
      'https://openstax.org/details/books/prealgebra-2e',
      'https://openstax.org/license'
    ]
  },
  {
    id: 'khan-ncert',
    url: 'https://www.khanacademy.org/math/in-math-ncert',
    includeAny: ['class-8', 'ncert-class-8', 'quadrilateral', 'geometry'],
    manualSeeds: [
      'https://www.khanacademy.org/math/in-math-ncert',
      'https://www.khanacademy.org/math/cc-fifth-grade-math/imp-geometry/imp-quadrilaterals'
    ]
  },
  {
    id: 'ncert-textbook',
    url: 'https://ncert.nic.in/textbook.php',
    includeAny: ['textbook', 'chapter', 'class-8', 'math'],
    manualSeeds: [
      'https://ncert.nic.in/textbook.php',
      'https://ncert.nic.in/textbook/pdf/hemh103.pdf',
      'https://ncert.nic.in/textbook.php?hemh1=3-16'
    ]
  }
];

function unique(list) {
  return [...new Set(list)];
}

function extractLinks(html, baseUrl) {
  const hrefs = [];
  const hrefRegex = /href\s*=\s*["']([^"']+)["']/gi;
  let match;
  while ((match = hrefRegex.exec(html))) {
    hrefs.push(match[1]);
  }

  const absolute = hrefs
    .map((href) => {
      try {
        return new URL(href, baseUrl).toString();
      } catch {
        return null;
      }
    })
    .filter(Boolean);

  return unique(absolute);
}

function filterCandidates(links, keywords) {
  const lowered = keywords.map((k) => k.toLowerCase());
  return links.filter((link) => lowered.some((k) => link.toLowerCase().includes(k)));
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      'user-agent': 'quest-quads-intake/1.0'
    }
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return await response.text();
}

const report = {
  generatedAt: new Date().toISOString(),
  sources: []
};

for (const source of sources) {
  const row = {
    id: source.id,
    url: source.url,
    status: 'ok',
    error: null,
    linkCount: 0,
    candidateCount: 0,
    candidates: []
  };

  let candidates = [];

  try {
    const html = await fetchText(source.url);
    const links = extractLinks(html, source.url);
    candidates = filterCandidates(links, source.includeAny);

    row.linkCount = links.length;
  } catch (error) {
    row.status = 'error';
    row.error = String(error?.message || error);
  }

  if (Array.isArray(source.manualSeeds) && source.manualSeeds.length > 0) {
    candidates = unique([...candidates, ...source.manualSeeds]);
    if (row.status === 'error') {
      row.status = 'seed-only';
    }
  }

  row.candidateCount = candidates.length;
  row.candidates = candidates.slice(0, 200);

  report.sources.push(row);
}

await fs.mkdir(outDir, { recursive: true });
await fs.writeFile(outPath, JSON.stringify(report, null, 2));

console.log(`Wrote discovery report to ${outPath}`);
for (const s of report.sources) {
  console.log(`${s.id}: status=${s.status} links=${s.linkCount} candidates=${s.candidateCount}`);
}
