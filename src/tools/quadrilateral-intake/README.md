Quadrilateral Intake Toolkit (Class 8)

Purpose
- Discover relevant class-8 quadrilateral links from approved sources.
- Keep licensing boundaries explicit during extraction.
- Convert manually curated items into OATutor-compatible staging JSON.

Why this is structured as semi-automated
- Source pages and licenses differ by provider.
- Some sources are reference-only for wording and sequence.
- Human review is required before generating final tutoring items.

Workflow
1. Discover candidate links:
   node src/tools/quadrilateral-intake/discover-class8-links.mjs

2. Review source policy:
   src/tools/quadrilateral-intake/source-policy.json

3. Fill curated content sheet:
   Copy manual-curation-template.json to manual-curation.json and fill items.

4. Build OATutor staging bundle:
   node src/tools/quadrilateral-intake/build-oatutor-staging.mjs src/tools/quadrilateral-intake/manual-curation.json

5. Inspect output:
   src/tools/quadrilateral-intake/out/oatutor-staging

Output notes
- This toolkit does not auto-publish into the active OATutor content source.
- It generates a staging bundle so you can review pedagogy and licensing first.
