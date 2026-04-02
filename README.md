# Quad-Quests

Quad-Quests is a theory-first, adaptive learning experience for Class 8 Quadrilaterals.

Learners do not jump straight into random questions. They read concept blocks, interact with visual tools, and then move into an adaptive quiz that reacts to both mistakes and behavior.

## What Makes Quad-Quests Different

- Structured theory stage before assessment
- Interactive visual lab for geometry intuition
- Adaptive question selection based on learner performance
- Step-level hints and remedial support
- Behavior-based interventions (not just correctness-based)
- Learner-tagged persistence in Firestore for cross-device continuity

## Chapter Snapshot

- Course: Class 8 Quadrilaterals
- Lesson: `class8-quad-lesson-1`
- Skills:
  - `quad.classify`
  - `quad.properties`
  - `quad.reasoning`
- Adaptive item bank: `qq8quad001` to `qq8quad010`

## Learner Journey

1. Login with learner ID.
2. Enter theory flow (dashboard, subtopics, visual lab, ready check).
3. Start adaptive quiz.
4. Receive question-level hints on struggle.
5. Trigger remedial zone when difficulty persists.
6. Revisit targeted subtopic with explicit reason:
   - repeated mistakes
   - spending more time on a subtopic
7. Continue quiz with adaptive next-question selection.

## Adaptive Engine Behavior

The platform updates skill estimates continuously and uses them to choose what comes next.

- Correctness signal:
  - repeated incorrect attempts trigger accuracy-based remediation.
- Behavior signal:
  - long response durations on same subtopic trigger behavior-based remediation.
- Selection strategy:
  - next questions are chosen to probe weaker areas more frequently.

## Remediation and Explainability

When intervention is triggered, learners see:

- Which skill is weak
- Which section to revisit
- Why revisit is being suggested
- Quick action checklist before retry

This is designed to make the adaptation explainable, not opaque.

## Learner Data Persistence (Database-Backed)

Quad-Quests stores learner state in Firestore by learner ID so progress survives:

- page refresh
- logout/login
- device changes

Stored state includes:

- skill progress (`bktProgress`)
- lesson progress (`lessonProgressByLesson`)
- behavior metrics (`behaviorMetricsByLesson`)
- optional mastery snapshots (`masteryByLesson`)

Collection used:

- `learnerProgress` (doc ID = encoded learner_id)

## Instructor Demo Checklist (10-15 min)

Use this checklist for walkthrough/demo sessions:

1. Open the app and login with a learner ID.
2. Read one theory section carefully.
3. Interact with visual tools in the visual lab.
4. Start the adaptive quiz.
5. Use hints once on a question.
6. Submit wrong answers twice on the same step to trigger remedial zone.
7. Observe suggested subtopic + explicit reason message.
8. Spend ~15 seconds each on two questions from same subtopic.
9. Observe behavior-based intervention trigger.
10. Continue solving and observe adaptive variation in question sequence.

## Local Development

```bash
npm install
npm start
```

Default local URL:

- `http://localhost:3001`

Production build check:

```bash
npm run build
```

## Deployment

Vercel:

```bash
npm run deploy:vercel -- --archive=tgz
```

Firebase Hosting:

```bash
npm run deploy:firebase
```

Deploy both:

```bash
npm run deploy:all
```

## Project Structure (Core)

- `src/App.js`: app shell, learner login state, progress load/save hooks
- `src/platform-logic/Platform.js`: lesson orchestration, adaptation, progression, interventions
- `src/components/problem-layout/Problem.js`: step attempts, hints, remedial zone, next-problem transition
- `src/components/TheoryLessonStage.js`: theory flow and targeted revisit UI
- `src/components/Firebase.js`: logging + learner progress persistence APIs
- `src/content-sources/interventionMap.json`: subtopic intervention mapping
- `generated/processed-content-pool/oatutor.json`: runtime processed adaptive pool

## Quick QA Scenarios

1. Login as learner A, solve 2-3 questions, refresh, verify state restored.
2. Logout, login as learner B, verify learner A data is not shown.
3. Login learner A on another device/browser, verify continuity.
4. Trigger both intervention paths:
   - repeated wrong attempts
   - long response behavior
5. Verify next-question transitions work by click and auto-advance.
