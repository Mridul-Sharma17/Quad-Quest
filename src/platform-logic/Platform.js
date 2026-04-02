import React from "react";
import Button from "@material-ui/core/Button";
import LinearProgress from "@material-ui/core/LinearProgress";
import ProblemWrapper from "@components/problem-layout/ProblemWrapper.js";
import TheoryLessonStage from "@components/TheoryLessonStage.js";
import { withRouter } from "react-router-dom";

import {
    coursePlans,
    findLessonById,
    LESSON_PROGRESS_STORAGE_KEY,
    MIDDLEWARE_URL,
    SITE_NAME,
    ThemeContext,
    MASTERY_THRESHOLD,
    SHOW_NOT_CANVAS_WARNING,
    CANVAS_WARNING_STORAGE_KEY,
} from "../config/config.js";
import to from "await-to-js";
import { toast } from "react-toastify";
import ToastID from "../util/toastIds";
import { cleanArray } from "../util/cleanObject";
import ErrorBoundary from "@components/ErrorBoundary";
import { CONTENT_SOURCE } from "@common/global-config";
import withTranslation from '../util/withTranslation';
import { LocalizationConsumer } from '../util/LocalizationContext';
import interventionMap from "../content-sources/interventionMap.json";

let problemPool = require(`@generated/processed-content-pool/${CONTENT_SOURCE}.json`);

const THEORY_STAGE_LABELS = {
    overview: "Stage A: Concept Map",
    lab: "Stage B: Visual Lab",
    practice: "Stage C: Worked Reasoning",
};

const DEFAULT_TARGET_STAGE_BY_SKILL = {
    "quad.classify": "overview",
    "quad.properties": "lab",
    "quad.reasoning": "practice",
};

const BEHAVIOR_LONG_RESPONSE_MS = 15000;
const BEHAVIOR_LONG_RESPONSE_STREAK_FOR_INTERVENTION = 2;

let seed = Date.now().toString();
console.log("Generated seed");

class Platform extends React.Component {
    static contextType = ThemeContext;

    constructor(props, context) {
        super(props);
        
        this.problemIndex = {
            problems: problemPool,
        };
        this.completedProbs = new Set();
        this.lesson = null;

        this.user = context.user || {};
        console.debug("USER: ", this.user)
        this.isPrivileged = !!this.user.privileged;
        this.context = context;

        // Add each Q Matrix skill model attribute to each step
        for (const problem of this.problemIndex.problems) {
            for (
                let stepIndex = 0;
                stepIndex < problem.steps.length;
                stepIndex++
            ) {
                const step = problem.steps[stepIndex];
                step.knowledgeComponents = cleanArray(
                    context.skillModel[step.id] || []
                );
            }
        }
        this.state = {
            currProblem: null,
            status: "courseSelection",
            seed: seed,
            adaptiveTrace: null,
            revisitSkill: null,
            interventionMessage: "",
            pendingTheoryIntervention: null,
            skillDifficultyMap: {},
        };

        this.selectLesson = this.selectLesson.bind(this);
        this.restartLesson = this.restartLesson.bind(this);
        this.startAssessmentStage = this.startAssessmentStage.bind(this);
        this.requestTheoryRevisit = this.requestTheoryRevisit.bind(this);
        this.recordSkillOutcome = this.recordSkillOutcome.bind(this);
    }

    getLessonStorageKey = () => {
        return LESSON_PROGRESS_STORAGE_KEY(
            this.lesson?.id,
            this.context?.learnerID || ""
        );
    };

    componentDidMount() {
        this._isMounted = true;

        const { enterCourse, exitCourse} = this.props;

        const isHomePage = this.props.history.location.pathname === '/';
        if (isHomePage) {
            exitCourse();
            this.onComponentUpdate(null, null, null);
            return;
        }

        if (this.props.lessonID != null) {
            console.log("calling selectLesson from componentDidMount...") 
            const lesson = findLessonById(this.props.lessonID)
            console.debug("lesson: ", lesson)
            this.selectLesson(lesson).then(
                (_) => {
                    console.debug(
                        "loaded lesson " + this.props.lessonID,
                        this.lesson
                    );
                }
            );

            // const { setLanguage } = this.props;
            
            // if (lesson.courseName == 'Matematik 4') {
            //     setLanguage('se')
            // } else {
            //     const defaultLocale = localStorage.getItem('defaultLocale');
            //     setLanguage(defaultLocale)
            // }

            const course = coursePlans.find(c => 
                c.lessons.some(l => l.id === this.props.lessonID)
            );
            
            if (course) {
                // Pass course ID and language from coursePlans.json
                enterCourse(course.courseName, course.language);
            }

        } else if (this.props.courseNum != null) {

            const course = coursePlans[parseInt(this.props.courseNum)];
            if (course) {
                enterCourse(course.courseName, course.language);
            }

            this.selectCourse(coursePlans[parseInt(this.props.courseNum)]);
        }


        this.onComponentUpdate(null, null, null);
    }

    componentWillUnmount() {
        this._isMounted = false;
        this.context.problemID = "n/a";
    }

    componentDidUpdate(prevProps, prevState, snapshot) {
        
        const { enterCourse, exitCourse } = this.props;
        
        // If navigating to home, exit course context
        if (this.props.history.location.pathname === '/' && 
            prevProps.history.location.pathname !== '/') {
            exitCourse();
        }
        
        // If lesson changed, update course context
        if (this.props.lessonID !== prevProps.lessonID && this.props.lessonID != null) {
            const lesson = findLessonById(this.props.lessonID);
            const course = coursePlans.find(c => 
                c.lessons.some(l => l.id === this.props.lessonID)
            );
            
            if (course) {
                enterCourse(course.courseName, course.language);
            }
            if (lesson) {
                this.selectLesson(lesson, false);
            }
        }
        
        // If course changed
        if (this.props.courseNum !== prevProps.courseNum && this.props.courseNum != null) {
            const course = coursePlans[parseInt(this.props.courseNum)];
            if (course) {
                enterCourse(course.courseName, course.language);
            }
        }

        this.onComponentUpdate(prevProps, prevState, snapshot);
    }

    
    onComponentUpdate(prevProps, prevState, snapshot) {
        if (
            Boolean(this.state.currProblem?.id) &&
            this.context.problemID !== this.state.currProblem.id
        ) {
            this.context.problemID = this.state.currProblem.id;
        }
        if (this.state.status !== "learning") {
            this.context.problemID = "n/a";
        }
    }

    getLessonSearchToken = (lesson = this.lesson) => {
        if (!lesson) {
            return "";
        }

        const lessonName = String(lesson.name || "")
            .replace(/^Lesson\s*/i, "")
            .trim();
        const topics = String(lesson.topics || "").trim();
        return [lessonName, topics].filter(Boolean).join(" ").trim();
    };

    deriveFallbackLessonFromProblemPool = () => {
        const allProblems = Array.isArray(this.problemIndex?.problems)
            ? this.problemIndex.problems
            : [];
        if (allProblems.length === 0) {
            return null;
        }

        const preferredCourseName = "Class 8 Quadrilaterals";
        const preferredProblem =
            allProblems.find(
                (problem) =>
                    String(problem?.courseName || "").trim() ===
                    preferredCourseName
            ) || allProblems[0];

        const rawLesson = String(preferredProblem?.lesson || "").trim();
        let derivedName = "Lesson 1";
        let derivedTopics = rawLesson || "Quadrilateral Basics";

        const lessonMatch = rawLesson.match(/^Lesson\s+([^\s]+)\s*(.*)$/i);
        if (lessonMatch) {
            derivedName = `Lesson ${lessonMatch[1]}`;
            derivedTopics = lessonMatch[2].trim() || "Quadrilateral Basics";
        }

        return {
            id: "class8-quad-lesson-1",
            name: derivedName,
            topics: derivedTopics,
            allowRecycle: false,
            enableCompletionMode: true,
            learningObjectives: {},
            courseName: String(
                preferredProblem?.courseName || preferredCourseName
            ),
            courseOER: "",
            courseLicense: "",
        };
    };

    getProgressBarData() {
        if (!this.lesson) return { completed: 0, total: 0, percent: 0 };

        const lessonToken = this.getLessonSearchToken(this.lesson);
        const lessonCourseName = String(this.lesson.courseName || "").trim();
        const problems = this.problemIndex.problems.filter(({ lesson, courseName }) => {
            const lessonMatches = lessonToken
                ? String(lesson || "").includes(lessonToken)
                : false;
            const courseMatches = lessonCourseName
                ? String(courseName || "").trim() === lessonCourseName
                : true;
            return lessonMatches && courseMatches;
        });
        const completed = this.completedProbs.size;
        const total = problems.length;
        const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
        return { completed, total, percent };
    }

    getLessonQuestionTypes() {
        if (!this.lesson) {
            return [];
        }

        const lessonToken = this.getLessonSearchToken(this.lesson);
        const lessonCourseName = String(this.lesson.courseName || "").trim();
        const problems = this.problemIndex.problems.filter(({ lesson, courseName }) => {
            const lessonMatches = lessonToken
                ? String(lesson || "").includes(lessonToken)
                : false;
            const courseMatches = lessonCourseName
                ? String(courseName || "").trim() === lessonCourseName
                : true;
            return lessonMatches && courseMatches;
        });

        const types = new Set();
        for (const problem of problems) {
            for (const step of problem.steps || []) {
                if (step.problemType === "MultipleChoice") {
                    types.add("Multiple Choice");
                } else if (step.answerType === "numeric") {
                    types.add("Numeric");
                } else {
                    types.add("Text Response");
                }
            }
        }

        return Array.from(types);
    }
    
    async selectLesson(lesson, updateServer=true) {
        const context = this.context;
        let resolvedLesson = lesson;
        if (!resolvedLesson) {
            resolvedLesson = this.deriveFallbackLessonFromProblemPool();
            if (!resolvedLesson) {
                toast.error("Unable to load lesson content. Please reload the page.");
                this.setState({ status: "exhausted", adaptiveTrace: null });
                return;
            }
            console.debug("Resolved missing lesson via fallback", resolvedLesson);
        }
        console.debug("lesson: ", context)
        console.debug("update server: ", updateServer)
        console.debug("context: ", context)
        if (!this._isMounted) {
            console.debug("component not mounted, returning early (1)");
            return;
        }
        if (this.isPrivileged) {
            // from canvas or other LTI Consumers
            console.log("valid privilege")
            let err, response;
            [err, response] = await to(
                fetch(`${MIDDLEWARE_URL}/setLesson`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        token: context?.jwt || this.context?.jwt || "",
                        lesson: resolvedLesson,
                    }),
                })
            );
            if (err || !response) {
                toast.error(
                    `Error setting lesson for assignment "${this.user.resource_link_title}"`
                );
                console.debug(err, response);
                return;
            } else {
                if (response.status !== 200) {
                    switch (response.status) {
                        case 400:
                            const responseText = await response.text();
                            let [message, ...addInfo] = responseText.split("|");
                            if (
                                Array.isArray(addInfo) &&
                                addInfo[0].length > 1
                            ) {
                                addInfo = JSON.parse(addInfo[0]);
                            }
                            switch (message) {
                                case "resource_already_linked":
                                    toast.error(
                                        `${addInfo.from} has already been linked to lesson ${addInfo.to}. Please create a new assignment.`,
                                        {
                                            toastId:
                                                ToastID.set_lesson_duplicate_error.toString(),
                                        }
                                    );
                                    return;
                                default:
                                    toast.error(`Error: ${responseText}`, {
                                        toastId:
                                            ToastID.expired_session.toString(),
                                        closeOnClick: true,
                                    });
                                    return;
                            }
                        case 401:
                            toast.error(
                                `Your session has either expired or been invalidated, please reload the page to try again.`,
                                {
                                    toastId: ToastID.expired_session.toString(),
                                }
                            );
                            this.props.history.push("/session-expired");
                            return;
                        case 403:
                            toast.error(
                                `You are not authorized to make this action. (Are you an instructor?)`,
                                {
                                    toastId: ToastID.not_authorized.toString(),
                                }
                            );
                            return;
                        default:
                            toast.error(
                                `Error setting lesson for assignment "${this.user.resource_link_title}." If reloading does not work, please contact us.`,
                                {
                                    toastId:
                                        ToastID.set_lesson_unknown_error.toString(),
                                }
                            );
                            return;
                    }
                } else {
                    toast.success(
                        `Successfully linked assignment "${this.user.resource_link_title}" to lesson ${resolvedLesson.id} "${resolvedLesson.topics}"`,
                        {
                            toastId: ToastID.set_lesson_success.toString(),
                        }
                    );
                    const responseText = await response.text();
                    let [, ...addInfo] = responseText.split("|");
                    this.props.history.push(
                        `/assignment-already-linked?to=${addInfo.to}`
                    );
                }
            }
        }

        this.lesson = resolvedLesson;

        const loadLessonProgress = async () => {
            const { getByKey } = this.context.browserStorage;
            return await getByKey(this.getLessonStorageKey()).catch(
                (err) => {}
            );
        };

        const [, prevCompletedProbs] = await Promise.all([
            this.props.loadBktProgress(),
            loadLessonProgress(),
        ]);
        if (!this._isMounted) {
            console.debug("component not mounted, returning early (2)");
            return;
        }
        if (Array.isArray(prevCompletedProbs) && prevCompletedProbs.length > 0) {
            console.debug(
                "student has already made progress w/ problems in this lesson before",
                prevCompletedProbs
            );
            this.completedProbs = new Set(prevCompletedProbs);
        } else {
            this.completedProbs = new Set();
        }

        const objectives = Object.keys(this.lesson?.learningObjectives || {});
        const initialAdaptiveTrace = this.buildAdaptiveTrace(
            this.context ? this.context : context,
            null,
            objectives
        );

        this.setState(
            {
                currProblem: null,
                status: "theory",
                adaptiveTrace: initialAdaptiveTrace,
                revisitSkill: null,
                interventionMessage: "",
                pendingTheoryIntervention: null,
                skillDifficultyMap: {},
            },
            () => {
                //console.log(this.state.currProblem);
                //console.log(this.lesson);
            }
        );
    }

    selectCourse = (course, context) => {
        this.course = course;
        this.setState({
            status: "lessonSelection",
        });
    };

    startAssessmentStage = () => {
        this._nextProblem(this.context);
    };

    recordSkillOutcome = (skillIds, isCorrect, stepId = "", attemptMeta = {}) => {
        const attemptSource = String(attemptMeta?.source || "submit").toLowerCase();
        if (attemptSource !== "submit") {
            return;
        }

        const normalizedSkillIds = cleanArray(skillIds || []);
        if (!Array.isArray(normalizedSkillIds) || normalizedSkillIds.length === 0) {
            return;
        }

        const responseTimeMs = Math.max(
            0,
            Number(attemptMeta?.responseTimeMs || 0)
        );
        const isLongResponse = responseTimeMs >= BEHAVIOR_LONG_RESPONSE_MS;

        const normalizedStepId = String(stepId || "").trim();
        const interventionConfig = interventionMap[normalizedStepId] || null;
        const mappedSkill = String(interventionConfig?.targetSkill || "").trim() || null;

        let resolvedSkill = mappedSkill;
        if (!resolvedSkill) {
            resolvedSkill = normalizedSkillIds.reduce((weakestSkill, candidateSkill) => {
                if (!candidateSkill) {
                    return weakestSkill;
                }
                if (!weakestSkill) {
                    return candidateSkill;
                }

                const weakestMastery = Number(
                    this.context?.bktParams?.[weakestSkill]?.probMastery ?? 1
                );
                const candidateMastery = Number(
                    this.context?.bktParams?.[candidateSkill]?.probMastery ?? 1
                );
                return candidateMastery < weakestMastery
                    ? candidateSkill
                    : weakestSkill;
            }, null);
        }

        if (!resolvedSkill) {
            return;
        }

        const resolvedTargetStage =
            interventionConfig?.targetStage ||
            DEFAULT_TARGET_STAGE_BY_SKILL[resolvedSkill] ||
            null;

        const defaultInterventionMessage =
            "You are making frequent mistakes like this in this subtopic, so it is better to revisit this theory resource before the next question.";
        const defaultBehaviorInterventionMessage =
            "You are spending more time on this topic, try this and you will feel more comfortable.";

        this.setState((prevState) => {
            const nextSkillDifficultyMap = {
                ...(prevState.skillDifficultyMap || {}),
            };

            const prev = nextSkillDifficultyMap[resolvedSkill] || {
                totalAttempts: 0,
                totalIncorrect: 0,
                recentIncorrect: 0,
                responseSamples: 0,
                totalResponseMs: 0,
                longResponseCount: 0,
                longResponseStreak: 0,
            };

            const next = {
                totalAttempts: prev.totalAttempts + 1,
                totalIncorrect: prev.totalIncorrect + (isCorrect ? 0 : 1),
                recentIncorrect: isCorrect ? 0 : prev.recentIncorrect + 1,
                responseSamples: prev.responseSamples + (responseTimeMs > 0 ? 1 : 0),
                totalResponseMs: prev.totalResponseMs + responseTimeMs,
                longResponseCount: prev.longResponseCount + (isLongResponse ? 1 : 0),
                longResponseStreak:
                    responseTimeMs <= 0
                        ? prev.longResponseStreak
                        : isLongResponse
                        ? prev.longResponseStreak + 1
                        : 0,
            };
            nextSkillDifficultyMap[resolvedSkill] = next;

            const shouldInterveneByAccuracy =
                !isCorrect &&
                (next.recentIncorrect >= 2 || next.totalIncorrect >= 3);
            const shouldInterveneByBehavior =
                responseTimeMs > 0 &&
                (next.longResponseStreak >=
                    BEHAVIOR_LONG_RESPONSE_STREAK_FOR_INTERVENTION ||
                    next.longResponseCount >=
                        BEHAVIOR_LONG_RESPONSE_STREAK_FOR_INTERVENTION);

            let candidateIntervention = prevState.pendingTheoryIntervention;
            if (shouldInterveneByAccuracy || shouldInterveneByBehavior) {
                const preferBehaviorMessage =
                    shouldInterveneByBehavior && !shouldInterveneByAccuracy;
                candidateIntervention = {
                    skill: resolvedSkill,
                    recentIncorrect: next.recentIncorrect,
                    totalIncorrect: next.totalIncorrect,
                    message:
                        preferBehaviorMessage
                            ? interventionConfig?.behaviorInterventionMessage ||
                              defaultBehaviorInterventionMessage
                            : interventionConfig?.interventionMessage ||
                              defaultInterventionMessage,
                    targetStage: resolvedTargetStage,
                    stepId: normalizedStepId || null,
                    triggerType: preferBehaviorMessage
                        ? "behavior"
                        : shouldInterveneByAccuracy && shouldInterveneByBehavior
                        ? "mixed"
                        : "accuracy",
                };
            }

            return {
                skillDifficultyMap: nextSkillDifficultyMap,
                pendingTheoryIntervention: candidateIntervention,
            };
        });
    };

    requestTheoryRevisit = (skillId, targetStage = "") => {
        if (!this.lesson) {
            return;
        }

        const objectives = Object.keys(this.lesson.learningObjectives || {});
        const adaptiveTrace = this.buildAdaptiveTrace(
            this.context,
            null,
            objectives
        );

        const normalizedSkill = String(skillId || "").trim();
        const normalizedStage = String(targetStage || "").trim();
        const targetStageLabel =
            THEORY_STAGE_LABELS[normalizedStage] || "the recommended stage";
        let nextTrace = adaptiveTrace;
        if (nextTrace && normalizedSkill) {
            nextTrace = {
                ...nextTrace,
                targetSkill: normalizedSkill,
                targetStage: normalizedStage || null,
                rationale: `Based on your response, revisit ${normalizedSkill} before continuing.`,
                recommendedAction: normalizedStage
                    ? `Review ${normalizedSkill} in ${targetStageLabel}, then continue with another adaptive question.`
                    : `Review ${normalizedSkill} and then continue with another adaptive question.`,
            };
        }

        this.setState({
            status: "theory",
            revisitSkill: normalizedSkill || null,
            adaptiveTrace: nextTrace,
            interventionMessage:
                "You are making frequent mistakes like this in this subtopic, so it is better to revisit this theory resource before the next question.",
            pendingTheoryIntervention: null,
        });
    };

    buildAdaptiveTrace = (context, chosenProblem, objectives) => {
        const objectiveMastery = objectives.map((skill) => {
            const mastery = context.bktParams[skill]?.probMastery ?? 0;
            return {
                skill,
                mastery,
            };
        });

        objectiveMastery.sort((a, b) => a.mastery - b.mastery);
        const weakestObjective = objectiveMastery[0] || null;

        if (!weakestObjective) {
            return null;
        }

        const targetSkill = weakestObjective.skill;
        const targetMastery = weakestObjective.mastery;
        const percent = Math.round(targetMastery * 100);
        const rationale = chosenProblem
            ? `We selected this question to strengthen ${targetSkill} (current mastery ${percent}%).`
            : `Your current focus skill is ${targetSkill} (current mastery ${percent}%).`;

        let recommendedAction = `Practice this item and check hints only if needed for ${targetSkill}.`;
        if (targetMastery < 0.6) {
            recommendedAction = `Review the theory card for ${targetSkill} first, then solve the question.`;
        } else if (targetMastery >= MASTERY_THRESHOLD) {
            recommendedAction = `You are near mastery for ${targetSkill}; this question checks consistency.`;
        }

        return {
            targetSkill,
            targetMastery,
            selectedProblemId: chosenProblem?.id || null,
            objectiveMastery,
            rationale,
            recommendedAction,
        };
    };

    _nextProblem = (context) => {
        seed = Date.now().toString();
        this.setState({ seed: seed });
        this.props.saveProgress();
        const problems = this.problemIndex.problems.filter(
            ({ courseName }) => !courseName.toString().startsWith("!!")
        );
        const objectives = Object.keys(this.lesson?.learningObjectives || {});
        const hasLessonObjectives = objectives.length > 0;
        const lessonToken = this.getLessonSearchToken(this.lesson);
        const lessonCourseName = String(this.lesson?.courseName || "").trim();
        let chosenProblem;

        console.debug(
            "Platform.js: sample of available problems",
            problems.slice(0, 10)
        );

        for (const problem of problems) {
            const isLessonMatch =
                (!!lessonToken &&
                    String(problem.lesson || "").includes(lessonToken)) &&
                (!lessonCourseName ||
                    String(problem.courseName || "").trim() ===
                        lessonCourseName);
            // Calculate the mastery for this problem
            let probMastery = 1;
            let isRelevant = false;
            for (const step of problem.steps) {
                if (typeof step.knowledgeComponents === "undefined") {
                    continue;
                }
                for (const kc of step.knowledgeComponents) {
                    if (typeof context.bktParams[kc] === "undefined") {
                        console.log("BKT Parameter " + kc + " does not exist.");
                        continue;
                    }
                    if (hasLessonObjectives && kc in this.lesson.learningObjectives) {
                        isRelevant = true;
                    }
                    // Multiply all the mastery priors
                    if (!(kc in context.bktParams)) {
                        console.log("Missing BKT parameter: " + kc);
                    }
                    probMastery *= context.bktParams[kc].probMastery;
                }
            }
            if (isRelevant) {
                problem.probMastery = probMastery;
            } else if (!hasLessonObjectives && isLessonMatch) {
                // If no learning-objective metadata is wired for this lesson,
                // still allow lesson-matched problems to be served adaptively.
                problem.probMastery = 0;
            } else {
                problem.probMastery = null;
            }
        }

        console.debug(
            `Platform.js: available problems ${problems.length}, completed problems ${this.completedProbs.size}`
        );
        chosenProblem = context.heuristic(problems, this.completedProbs);
        console.debug("Platform.js: chosen problem", chosenProblem);

        console.debug("Platform.js: objectives", objectives);
        const objectiveMasteries = objectives
            .map((skill) => context.bktParams?.[skill]?.probMastery)
            .filter((mastery) => typeof mastery === "number");
        const score =
            objectiveMasteries.length > 0
                ? objectiveMasteries.reduce((sum, mastery) => sum + mastery, 0) /
                  objectiveMasteries.length
                : 0;
        this.displayMastery(score);
        //console.log(Object.keys(context.bktParams).map((skill) => (context.bktParams[skill].probMastery <= this.lesson.learningObjectives[skill])));

        // There exists a skill that has not yet been mastered (a True)
        // Note (number <= null) returns false
        if (
            objectiveMasteries.length > 0 &&
            !objectives.some(
                (skill) =>
                    (context.bktParams?.[skill]?.probMastery ?? 0) <=
                    MASTERY_THRESHOLD
            )
        ) {
            this.setState({ status: "graduated", adaptiveTrace: null });
            console.log("Graduated");
            return null;
        } else if (chosenProblem == null) {
            console.debug("no problems were chosen");
            // We have finished all the problems
            if (this.lesson && !this.lesson.allowRecycle) {
                // If we do not allow problem recycle then we have exhausted the pool
                this.setState({ status: "exhausted", adaptiveTrace: null });
                return null;
            } else {
                this.completedProbs = new Set();
                chosenProblem = context.heuristic(
                    problems,
                    this.completedProbs
                );
            }
        }

        if (chosenProblem) {
            const adaptiveTrace = this.buildAdaptiveTrace(
                context,
                chosenProblem,
                objectives
            );
            this.setState({
                currProblem: chosenProblem,
                status: "learning",
                adaptiveTrace,
                revisitSkill: null,
                interventionMessage: "",
            });
            // console.log("Next problem: ", chosenProblem.id);
            console.debug("problem information", chosenProblem);
            this.context.firebase.startedProblem(
                chosenProblem.id,
                chosenProblem.courseName,
                chosenProblem.lesson,
                this.lesson.learningObjectives
            );
            return chosenProblem;
        } else {
            console.debug("still no chosen problem..? must be an error");
        }
    };

    problemComplete = async (context) => {
        this.completedProbs.add(this.state.currProblem.id);
        const { setByKey } = this.context.browserStorage;
        await setByKey(
            this.getLessonStorageKey(),
            this.completedProbs
        ).catch((error) => {
            this.context.firebase.submitSiteLog(
                "site-error",
                `componentName: Platform.js`,
                {
                    errorName: error.name || "n/a",
                    errorCode: error.code || "n/a",
                    errorMsg: error.message || "n/a",
                    errorStack: error.stack || "n/a",
                },
                this.state.currProblem.id
            );
        });

        if (this.state.pendingTheoryIntervention?.skill) {
            const objectives = Object.keys(this.lesson.learningObjectives || {});
            const adaptiveTrace = this.buildAdaptiveTrace(
                context,
                null,
                objectives
            );
            const skill = this.state.pendingTheoryIntervention.skill;
            const targetStage =
                this.state.pendingTheoryIntervention.targetStage || null;
            const targetStageLabel =
                THEORY_STAGE_LABELS[targetStage] || "the recommended stage";
            const nextTrace = adaptiveTrace
                ? {
                      ...adaptiveTrace,
                      targetSkill: skill,
                      targetStage,
                      rationale: `You are repeatedly struggling with ${skill}. Review theory before the next question.`,
                      recommendedAction: targetStage
                          ? `Complete ${targetStageLabel} for ${skill}, then continue.`
                          : `Complete the visual lab and worked examples for ${skill}, then continue.`,
                  }
                : null;

            this.setState({
                status: "theory",
                currProblem: null,
                revisitSkill: skill,
                adaptiveTrace: nextTrace,
                interventionMessage:
                    this.state.pendingTheoryIntervention.message,
                pendingTheoryIntervention: null,
            });
            return;
        }

        if (this.lesson.enableCompletionMode) {
            const relevantKc = {};
            Object.keys(this.lesson.learningObjectives).forEach((x) => {
                relevantKc[x] = context.bktParams[x]?.probMastery ?? 0;
            });

            // Check if all problems are completed or all skills 
            const progressData = this.getProgressBarData();
            const progressPercent = progressData.percent / 100;

            const allProblemsCompleted = progressData.completed === progressData.total;
            if (allProblemsCompleted) {
                console.debug("updateCanvas called because lesson is complete");
            }

            this.updateCanvas(progressPercent, relevantKc);
            this._nextProblem(context);
        } else {
            this._nextProblem(context);
        }
    };

    restartLesson = async () => {
        if (!this.lesson) {
            return;
        }

        this.completedProbs = new Set();
        const { removeByKey } = this.context.browserStorage;
        await removeByKey(this.getLessonStorageKey()).catch(() => {});

        const objectives = Object.keys(this.lesson.learningObjectives || {});
        const adaptiveTrace = this.buildAdaptiveTrace(
            this.context,
            null,
            objectives
        );

        this.setState({
            status: "theory",
            currProblem: null,
            adaptiveTrace,
            revisitSkill: null,
            interventionMessage: "",
            pendingTheoryIntervention: null,
            skillDifficultyMap: {},
        });
    };

    handleLogout = () => {
        if (typeof this.props.onLogout === "function") {
            this.props.onLogout();
        }
        if (typeof this.props.exitCourse === "function") {
            this.props.exitCourse();
        }
        if (this.props.history?.push) {
            this.props.history.push("/");
        }
    };

    updateCanvas = async (mastery, components) => {
        if (this.context.jwt) {
            console.debug("updating canvas with problem score");

            let err, response;
            [err, response] = await to(
                fetch(`${MIDDLEWARE_URL}/postScore`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        token: this.context?.jwt || "",
                        mastery,
                        components,
                    }),
                })
            );
            if (err || !response) {
                toast.error(
                    `An unknown error occurred trying to submit this problem. If reloading does not work, please contact us.`,
                    {
                        toastId: ToastID.submit_grade_unknown_error.toString(),
                    }
                );
                console.debug(err, response);
            } else {
                if (response.status !== 200) {
                    switch (response.status) {
                        case 400:
                            const responseText = await response.text();
                            let [message, ...addInfo] = responseText.split("|");
                            if (
                                Array.isArray(addInfo) &&
                                addInfo.length > 0 &&
                                addInfo[0]
                            ) {
                                addInfo = JSON.parse(addInfo[0]);
                            }
                            switch (message) {
                                case "lost_link_to_lms":
                                    toast.error(
                                        "It seems like the link back to your LMS has been lost. Please re-open the assignment to make sure your score is saved.",
                                        {
                                            toastId:
                                                ToastID.submit_grade_link_lost.toString(),
                                        }
                                    );
                                    return;
                                case "unable_to_handle_score":
                                    toast.warn(
                                        "Something went wrong and we can't update your score right now. Your progress will be saved locally so you may continue working.",
                                        {
                                            toastId:
                                                ToastID.submit_grade_unable.toString(),
                                            closeOnClick: true,
                                        }
                                    );
                                    return;
                                default:
                                    toast.error(`Error: ${responseText}`, {
                                        closeOnClick: true,
                                    });
                                    return;
                            }
                        case 401:
                            toast.error(
                                `Your session has either expired or been invalidated, please reload the page to try again.`,
                                {
                                    toastId: ToastID.expired_session.toString(),
                                }
                            );
                            return;
                        case 403:
                            toast.error(
                                `You are not authorized to make this action. (Are you a registered student?)`,
                                {
                                    toastId: ToastID.not_authorized.toString(),
                                }
                            );
                            return;
                        default:
                            toast.error(
                                `An unknown error occurred trying to submit this problem. If reloading does not work, please contact us.`,
                                {
                                    toastId:
                                        ToastID.set_lesson_unknown_error.toString(),
                                }
                            );
                            return;
                    }
                } else {
                    console.debug("successfully submitted grade to Canvas");
                }
            }
        } else {
            const { getByKey, setByKey } = this.context.browserStorage;
            const showWarning =
                !(await getByKey(CANVAS_WARNING_STORAGE_KEY)) &&
                SHOW_NOT_CANVAS_WARNING;
            if (showWarning) {
                toast.warn(
                    "No credentials found (did you launch this assignment from Canvas?)",
                    {
                        toastId: ToastID.warn_not_from_canvas.toString(),
                        autoClose: false,
                        onClick: () => {
                            toast.dismiss(
                                ToastID.warn_not_from_canvas.toString()
                            );
                        },
                        onClose: () => {
                            setByKey(CANVAS_WARNING_STORAGE_KEY, 1);
                        },
                    }
                );
            } else {
                // can ignore
            }
        }
    };


    displayMastery = (mastery) => {
        this.setState({ mastery: mastery });
        if (mastery >= MASTERY_THRESHOLD) {
            toast.success("You've successfully completed this assignment!", {
                toastId: ToastID.successfully_completed_lesson.toString(),
            });
        }
    };

    render() {
        const { translate } = this.props;
        const learnerIDText = String(this.context.learnerID || "").trim();
        const studentNameText = String(this.context.studentName || "").trim();
        const shouldShowStudentName =
            studentNameText.length > 0 && studentNameText !== learnerIDText;
        this.studentNameDisplay = shouldShowStudentName
            ? decodeURIComponent(studentNameText) + " | "
            : "";
        this.learnerIDDisplay = learnerIDText
            ? `Learner ${learnerIDText} | `
            : "";
        const lessonTitle = this.lesson
            ? `${this.lesson.name} ${this.lesson.topics}`
            : "Understanding Quadrilaterals";
        const showMasteryText =
            this.state.status !== "courseSelection" &&
            this.state.status !== "lessonSelection" &&
            (this.lesson?.showStuMastery == null || this.lesson?.showStuMastery);
        const masteryPercent = Math.round((this.state.mastery || 0) * 100);
        return (
            <div
                className="qq-shell"
                style={{
                    backgroundColor: "transparent",
                    paddingBottom: 20,
                    display: "flex",
                    flexDirection: "column",
                }}
            >
                <div className="qq-hero-header">
                    <div className="qq-hero-left">
                        <div className="qq-hero-kicker">Personalized Chapter</div>
                        <h1 className="qq-hero-title">{lessonTitle}</h1>
                        <div className="qq-hero-subtitle">
                            Theory-first adaptive learning with interactive visual lab.
                        </div>
                    </div>
                    <div className="qq-hero-right">
                        {showMasteryText ? (
                            <div className="qq-mastery-chip">
                                {this.learnerIDDisplay}
                                {this.studentNameDisplay}
                                {translate("platform.Mastery")}
                                {masteryPercent}%
                            </div>
                        ) : null}
                        <Button
                            variant="outlined"
                            color="primary"
                            className="qq-logout-btn"
                            onClick={this.handleLogout}
                        >
                            Logout
                        </Button>
                    </div>
                </div>

                {/* Progress Bar */}
                {this.lesson?.enableCompletionMode && (
                    <div className="qq-progress-card" style={{ padding: "10px 20px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 8 }}>
                            <span>Progress</span>
                            <span>{this.getProgressBarData().percent}% ({this.getProgressBarData().completed}/{this.getProgressBarData().total})</span>
                        </div>
                        <LinearProgress
                            variant="determinate"
                            value={this.getProgressBarData().percent}
                            style={{ height: 10, borderRadius: 999 }}
                        />
                    </div>
                )}

                {(this.state.status === "courseSelection" ||
                    this.state.status === "lessonSelection") && (
                    <div className="qq-loading-card">
                        Preparing your personalized quadrilateral chapter...
                    </div>
                )}
                {this.state.status === "learning" ? (
                    <ErrorBoundary
                        componentName={"Problem"}
                        descriptor={"problem"}
                    >
                        <ProblemWrapper
                            problem={this.state.currProblem}
                            problemComplete={this.problemComplete}
                            lesson={this.lesson}
                            seed={this.state.seed}
                            lessonID={this.props.lessonID}
                            displayMastery={this.displayMastery}
                            progressPercent={this.getProgressBarData().percent / 100}
                            adaptiveTrace={this.state.adaptiveTrace}
                            lessonQuestionTypes={this.getLessonQuestionTypes()}
                            onRequestTheoryRevisit={this.requestTheoryRevisit}
                            onSkillOutcome={this.recordSkillOutcome}
                        />
                    </ErrorBoundary>
                ) : (
                    ""
                )}
                {this.state.status === "theory" ? (
                    <TheoryLessonStage
                        lesson={this.lesson}
                        adaptiveTrace={this.state.adaptiveTrace}
                        revisitSkill={this.state.revisitSkill}
                        interventionMessage={this.state.interventionMessage}
                        onBeginAssessment={this.startAssessmentStage}
                    />
                ) : (
                    ""
                )}
                {this.state.status === "exhausted" ? (
                    <center>
                        <h2>
                            Thank you for learning with {SITE_NAME}. You have
                            finished all problems.
                        </h2>
                        <Button
                            variant="contained"
                            color="primary"
                            onClick={this.restartLesson}
                        >
                            Restart Lesson
                        </Button>
                    </center>
                ) : (
                    ""
                )}
                {this.state.status === "graduated" ? (
                    <center>
                        <h2>
                            Thank you for learning with {SITE_NAME}. You have
                            mastered all the skills for this session!
                        </h2>
                    </center>
                ) : (
                    ""
                )}
            </div>
        );
    }
}

// export default withRouter(withTranslation(Platform));

export default withRouter(withTranslation((props) => (
    <LocalizationConsumer>
        {({ language, enterCourse, exitCourse }) => (
            <Platform
                {...props}
                language={language}
                enterCourse={enterCourse}
                exitCourse={exitCourse}
            />
        )}
    </LocalizationConsumer>
)));
