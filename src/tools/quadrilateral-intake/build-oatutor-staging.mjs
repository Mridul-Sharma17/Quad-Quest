import fs from 'node:fs/promises';
import path from 'node:path';

const inputArg = process.argv[2] || 'src/tools/quadrilateral-intake/manual-curation-template.json';
const inputPath = path.resolve(inputArg);

const outRoot = path.resolve('src/tools/quadrilateral-intake/out/oatutor-staging');
const outPool = path.join(outRoot, 'content-pool');

function required(value, name) {
  if (value === undefined || value === null || value === '') {
    throw new Error(`Missing required field: ${name}`);
  }
}

async function writeJson(filePath, data) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

async function main() {
  const raw = await fs.readFile(inputPath, 'utf8');
  const doc = JSON.parse(raw);

  required(doc.courseName, 'courseName');
  required(doc.lessonId, 'lessonId');
  required(doc.lessonName, 'lessonName');
  required(Array.isArray(doc.items) ? doc.items.length : 0, 'items');

  const skillModel = {};

  for (const item of doc.items) {
    required(item.problemId, 'item.problemId');
    required(item.stepId, 'item.stepId');
    required(item.title, 'item.title');
    required(item.stepTitle, 'item.stepTitle');
    required(item.answerType, 'item.answerType');
    required(item.problemType, 'item.problemType');

    const problemJson = {
      id: item.problemId,
      title: item.title,
      body: item.body || '',
      variabilization: {},
      oer: item.oer || doc.defaultProblemMeta?.oer || '',
      license: item.license || doc.defaultProblemMeta?.license || '',
      lesson: doc.defaultProblemMeta?.lesson || 'Class 8 - Quadrilaterals',
      courseName: doc.courseName
    };

    const stepJson = {
      id: item.stepId,
      stepAnswer: item.stepAnswer || [],
      problemType: item.problemType,
      stepTitle: item.stepTitle,
      stepBody: item.stepBody || '',
      answerType: item.answerType,
      variabilization: {}
    };

    if (Array.isArray(item.choices) && item.choices.length > 0) {
      stepJson.choices = item.choices;
    }

    const hints = (item.hints || []).map((hint) => ({
      id: hint.id,
      type: hint.type,
      title: hint.title,
      text: hint.text,
      dependencies: hint.dependencies || [],
      variabilization: {},
      ...(hint.problemType ? { problemType: hint.problemType } : {}),
      ...(hint.answerType ? { answerType: hint.answerType } : {}),
      ...(hint.hintAnswer ? { hintAnswer: hint.hintAnswer } : {}),
      ...(hint.oer ? { oer: hint.oer } : {}),
      ...(hint.license ? { license: hint.license } : {})
    }));

    const problemDir = path.join(outPool, item.problemId);
    const stepDir = path.join(problemDir, 'steps', item.stepId);

    await writeJson(path.join(problemDir, `${item.problemId}.json`), problemJson);
    await writeJson(path.join(stepDir, `${item.stepId}.json`), stepJson);
    await writeJson(path.join(stepDir, 'tutoring', `${item.stepId}DefaultPathway.json`), hints);

    skillModel[item.stepId] = item.skillTags || [];
  }

  const coursePlans = [
    {
      id: doc.lessonId,
      name: doc.lessonName,
      topics: doc.lessonTopics || 'Quadrilaterals',
      allowRecycle: doc.allowRecycle == null ? false : !!doc.allowRecycle,
      learningObjectives: doc.learningObjectives || {}
    }
  ];

  await writeJson(path.join(outRoot, 'skillModel.json'), skillModel);
  await writeJson(path.join(outRoot, 'coursePlans.json'), coursePlans);

  console.log(`Staging bundle created at ${outRoot}`);
  console.log(`Problems generated: ${doc.items.length}`);
  console.log(`Skill entries generated: ${Object.keys(skillModel).length}`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
