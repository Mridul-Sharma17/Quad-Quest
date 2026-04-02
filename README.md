# Quest Quads Learn

Quest Quads Learn is a theory-first, adaptive chapter experience for Class 8 quadrilaterals built on the OATutor runtime.

This README documents our chapter implementation: content scope, learner model, adaptation logic, workflow, and deployment.

## Chapter Scope

- Course: Class 8 Quadrilaterals
- Lesson: Lesson 1 - Quadrilateral Basics
- Learning objectives:
  - `quad.classify`
  - `quad.properties`
  - `quad.reasoning`

## Chapter Content

### Item Bank (Adaptive Assessment)

The chapter currently uses 10 adaptive questions (1 step each):

1. `qq8quad001`: Identify the quadrilateral by properties
2. `qq8quad002`: Identify a square
3. `qq8quad003`: Identify a rhombus
4. `qq8quad004`: Identify a trapezium
5. `qq8quad005`: Identify a kite
6. `qq8quad006`: Sum of interior angles
7. `qq8quad007`: Opposite angles in parallelogram
8. `qq8quad008`: Adjacent angles in parallelogram
9. `qq8quad009`: Quadrilateral hierarchy check
10. `qq8quad010`: Perimeter of a rectangle

Answer formats are mixed (`TextBox` and `MultipleChoice`) with string and numeric evaluation.

### Theory Cards

Theory is authored per objective in `src/content-sources/oatutor/theoryCards.json` and includes:

- summary + key points
- deep-dive explanations
- worked examples
- common errors
- revisit/recovery actions
- quick checks

## Core Features

### 1) Theory-First Flow

Learners always begin in a structured theory stage before adaptive assessment:

- Dashboard
- Skill pages (Classification, Properties, Reasoning)
- Visual Lab
- Ready Check

This is implemented in `src/components/TheoryLessonStage.js` and launched from `src/platform-logic/Platform.js`.

### 2) Interactive Visual Lab

`src/components/QuadrilateralPropertyLab.js` provides interactive shape morphing and challenge modes for concept reinforcement.

### 3) Adaptive Question Selection

Questions are selected with BKT-informed heuristics (default: weakest mastery first) using:

- `src/models/BKT/problem-select-heuristics/defaultHeuristic.js`
- `src/platform-logic/Platform.js`

### 4) Step-Level Hinting and Remediation

Inside `src/components/problem-layout/Problem.js`:

- First wrong attempt: targeted pre-remedial hint
- Repeated wrong attempt: remediation zone with quick actions, quick check, and theory revisit action
- Correct completion: auto-advance to the next adaptive question

### 5) Behavior-Aware Theory Interventions

`Platform.recordSkillOutcome` tracks per-skill difficulty patterns:

- accuracy triggers (recent/total incorrect trends)
- behavior triggers (long response-time streaks)

When thresholds are crossed, the learner is routed back to a targeted theory stage before continuing.

### 6) Learner Gate + Progress Persistence

- Learner login gate (`LearnerLoginGate`) is required unless LMS JWT is present.
- Mastery and lesson progress are persisted in browser storage and optionally logged to Firebase.

## Learner Model and Logic

### Bayesian Knowledge Tracing (BKT)

Skill mastery is updated on answer submission using `src/models/BKT/BKT-brain.js`:

- posterior update from correctness + slip/guess
- transition update via `probTransit`

Mastery target is controlled by `MASTERY_THRESHOLD` (currently `0.95`) in `src/config/config.js`.

### Adaptive Trace

For every selected question, the platform computes an adaptive trace that includes:

- target skill
- target mastery
- rationale for why this question was chosen
- recommended action (practice vs theory revisit)

This drives explainable adaptation in both theory and assessment stages.

## End-to-End Workflow

1. Learner logs in (or enters via LMS).
2. Lesson starts in Theory Stage.
3. Learner navigates structured theory pages.
4. Learner begins Stage 2 adaptive assessment.
5. System selects question based on weakest objective mastery.
6. Learner attempts step; BKT updates on submit.
7. If errors persist or behavior indicates struggle, targeted intervention routes learner to theory.
8. Correct completion auto-advances to next item.
9. Session ends on mastery completion or pool exhaustion.

## Content Pipeline

Raw chapter problems/hints are stored in:

- `src/content-sources/oatutor/content-pool/*`

Before start/build, preprocessing runs:

- `src/tools/preprocessProblemPool.js`

This generates:

- `generated/processed-content-pool/oatutor.json`
- static figure assets under `public/static/images/figures/oatutor`

## Local Development

```bash
npm install
npm start
```

App runs on `http://localhost:3001`.

Build:

```bash
npm run build
```

## Deployment Setup (Vercel + Firebase CLI)

This repo now includes:

- `vercel.json` for production static deploys
- `firebase.json` for Firebase Hosting SPA rewrites
- npm scripts for login and deploy flows

### One-time setup

```bash
npm install
npm run vercel:login
npm run firebase:login
npm run firebase:use
```

`firebase:use` links your Firebase project and creates local project mapping.

### Deploy to Vercel (public by default)

```bash
npm run deploy:vercel
```

### Deploy to Firebase Hosting

```bash
npm run build
npm run deploy:firebase
```

### Deploy both

```bash
npm run deploy:all
```

## Public URL Verification

After deployment:

- Vercel prints a production URL in terminal output.
- Firebase Hosting URL format is `https://<project-id>.web.app` (and `firebaseapp.com` mirror).

Verify with:

```bash
curl -I <your-deployed-url>
```

Look for an HTTP `200` response.

## Important Env Options

- `REACT_APP_FIREBASE_CONFIG` (optional, base64 JSON) for runtime Firebase config injection
- `AI_HINT_GENERATION_AWS_ENDPOINT` (optional) for dynamic hint generation

## Relevant Files

- `src/App.js`
- `src/platform-logic/Platform.js`
- `src/components/TheoryLessonStage.js`
- `src/components/QuadrilateralPropertyLab.js`
- `src/components/problem-layout/Problem.js`
- `src/models/BKT/BKT-brain.js`
- `src/models/BKT/problem-select-heuristics/defaultHeuristic.js`
- `src/content-sources/oatutor/coursePlans.json`
- `src/content-sources/oatutor/skillModel.json`
- `src/content-sources/oatutor/theoryCards.json`
- `src/content-sources/interventionMap.json`
