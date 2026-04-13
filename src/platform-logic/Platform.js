import React from "react";
import Button from "@material-ui/core/Button";
import ProblemWrapper from "@components/problem-layout/ProblemWrapper.js";
import TheoryLessonStage from "@components/TheoryLessonStage.js";
import { withRouter } from "react-router-dom";

import {
    coursePlans,
    findLessonById,
    LESSON_PROGRESS_STORAGE_KEY,
    MIDDLEWARE_URL,
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
const DEFAULT_ACCURACY_INTERVENTION_MESSAGE =
    "Because you are facing repeated mistakes in this subtopic, revisit this theory section before the next question.";
const DEFAULT_BEHAVIOR_INTERVENTION_MESSAGE =
    "Because you are spending more time on this subtopic, revisit this theory section before the next question.";
const MERGE_INTERACTIONS_URL = "https://kaushik-dev.online/api/recommend/";
const MERGE_STUDENT_ID_SESSION_KEY = "merge_student_id";
const MERGE_SESSION_ID_SESSION_KEY = "merge_session_id";
const MERGE_CHAPTER_ID = "grade8_understanding_quadrilaterals";

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
        this.mergePayloadSent = false;
        this.isPageUnloading = false;
        this.resetUnloadIntentHandle = null;

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
            mastery: 0,
            adaptiveTrace: null,
            revisitSkill: null,
            revisitSection: null,
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
        return LESSON_PROGRESS_STORAGE_KEY(this.lesson?.id);
    };

    getBehaviorMetricsStorageKey = () => {
        return `${this.getLessonStorageKey()}:behavior`;
    };

    getActiveLearnerID = () => {
        const learnerID = String(this.context?.learnerID || "").trim();
        if (learnerID) {
            return learnerID;
        }

        const lmsUserID = String(this.context?.user?.user_id || "").trim();
        return lmsUserID;
    };

    shouldUseLearnerDatabase = () => {
        return (
            Boolean(this.getActiveLearnerID()) &&
            typeof this.context?.firebase?.loadLearnerProgress === "function" &&
            typeof this.context?.firebase?.saveLearnerProgress === "function"
        );
    };

    loadLearnerProgressSnapshot = async () => {
        const activeLearnerID = this.getActiveLearnerID();
        if (!activeLearnerID) {
            return null;
        }

        if (typeof this.context?.firebase?.loadLearnerProgress !== "function") {
            return null;
        }

        return await this.context.firebase
            .loadLearnerProgress(activeLearnerID)
            .catch(() => null);
    };

    saveLearnerProgressPatch = async (patch = {}) => {
        const activeLearnerID = this.getActiveLearnerID();
        if (!activeLearnerID) {
            return false;
        }

        if (typeof this.context?.firebase?.saveLearnerProgress !== "function") {
            return false;
        }

        const didSave = await this.context.firebase
            .saveLearnerProgress(activeLearnerID, patch)
            .then(() => true)
            .catch(() => false);
        return didSave;
    };

    calculateLessonMastery = (context = this.context, lesson = this.lesson) => {
        const objectives = Object.keys(lesson?.learningObjectives || {});
        if (objectives.length === 0) {
            return 0;
        }

        const objectiveMasteries = objectives
            .map((skill) => Number(context?.bktParams?.[skill]?.probMastery))
            .filter((mastery) => Number.isFinite(mastery));

        if (objectiveMasteries.length === 0) {
            return 0;
        }

        return (
            objectiveMasteries.reduce((sum, mastery) => sum + mastery, 0) /
            objectiveMasteries.length
        );
    };

    loadBehaviorMetrics = async () => {
        const lessonStorageKey = this.getLessonStorageKey();
        if (this.shouldUseLearnerDatabase()) {
            const learnerSnapshot = await this.loadLearnerProgressSnapshot();
            if (learnerSnapshot?.behaviorMetricsByLesson) {
                return learnerSnapshot.behaviorMetricsByLesson[lessonStorageKey] || null;
            }
            return null;
        }

        const { getByKey } = this.context.browserStorage;
        return await getByKey(this.getBehaviorMetricsStorageKey()).catch(() => null);
    };

    persistBehaviorMetrics = async () => {
        if (!this.lesson) {
            return;
        }

        const lessonStorageKey = this.getLessonStorageKey();
        const payload = {
            skillDifficultyMap: this.state.skillDifficultyMap || {},
            pendingTheoryIntervention:
                this.state.pendingTheoryIntervention || null,
        };

        if (this.shouldUseLearnerDatabase()) {
            await this.saveLearnerProgressPatch({
                behaviorMetricsByLesson: {
                    [lessonStorageKey]: payload,
                },
            });
            return;
        }

        const { setByKey } = this.context.browserStorage;
        await setByKey(this.getBehaviorMetricsStorageKey(), payload).catch(() => {});
    };

    getMergePortalSessionIdentifiers = () => {
        try {
            return {
                studentId: String(
                    sessionStorage.getItem(MERGE_STUDENT_ID_SESSION_KEY) ||
                        sessionStorage.getItem("student_id") ||
                        ""
                ).trim(),
                sessionId: String(
                    sessionStorage.getItem(MERGE_SESSION_ID_SESSION_KEY) ||
                        sessionStorage.getItem("session_id") ||
                        ""
                ).trim(),
            };
        } catch (_error) {
            return {
                studentId: "",
                sessionId: "",
            };
        }
    };

    getMergePortalToken = () => {
        try {
            return String(sessionStorage.getItem("token") || "").trim();
        } catch (_error) {
            return "";
        }
    };

    isSessionComplete = () => {
        return (
            this.state.status === "graduated" ||
            this.state.status === "exhausted"
        );
    };

    componentDidMount() {
        this._isMounted = true;
        window.addEventListener("beforeunload", this.handleBeforeUnload);
        window.addEventListener("unload", this.handleUnload);

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
        window.removeEventListener("beforeunload", this.handleBeforeUnload);
        window.removeEventListener("unload", this.handleUnload);
        if (this.resetUnloadIntentHandle != null) {
            window.clearTimeout(this.resetUnloadIntentHandle);
            this.resetUnloadIntentHandle = null;
        }

        const isHardUnload =
            this.isPageUnloading || document.visibilityState === "hidden";
        if (!isHardUnload && !this.isSessionComplete()) {
            this.sendSessionToMerge("exited_midway");
        }
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

    getLessonProblems = (lesson = this.lesson) => {
        if (!lesson) {
            return [];
        }

        const lessonToken = this.getLessonSearchToken(lesson);
        const lessonCourseName = String(lesson.courseName || "").trim();
        return this.problemIndex.problems.filter(({ lesson, courseName }) => {
            const lessonMatches = lessonToken
                ? String(lesson || "").includes(lessonToken)
                : false;
            const courseMatches = lessonCourseName
                ? String(courseName || "").trim() === lessonCourseName
                : true;
            return lessonMatches && courseMatches;
        });
    };

    getProgressBarData() {
        if (!this.lesson) return { completed: 0, total: 0, percent: 0 };

        const problems = this.getLessonProblems(this.lesson);
        const completed = this.completedProbs.size;
        const total = problems.length;
        const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
        return { completed, total, percent };
    }

    getLessonQuestionTypes() {
        if (!this.lesson) {
            return [];
        }

        const problems = this.getLessonProblems(this.lesson);

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

    getTotalHintsEmbedded = () => {
        const problems = this.getLessonProblems(this.lesson);
        return problems.reduce((problemTotal, problem) => {
            const stepHintCount = (problem.steps || []).reduce(
                (stepTotal, step) => {
                    const pathways = step?.hints || {};
                    const selectedPathway =
                        (Array.isArray(pathways.DefaultPathway) &&
                            pathways.DefaultPathway) ||
                        Object.values(pathways).find((pathway) =>
                            Array.isArray(pathway)
                        ) ||
                        [];

                    const hintNodeCount = selectedPathway.reduce(
                        (hintTotal, hintNode) => {
                            return (
                                hintTotal +
                                1 +
                                (Array.isArray(hintNode?.subHints)
                                    ? hintNode.subHints.length
                                    : 0)
                            );
                        },
                        0
                    );

                    return stepTotal + hintNodeCount;
                },
                0
            );
            return problemTotal + stepHintCount;
        }, 0);
    };

    buildMergeSessionPayload = (sessionStatus) => {
        const { studentId, sessionId } = this.getMergePortalSessionIdentifiers();
        if (!studentId || !sessionId) {
            return null;
        }

        const skillDifficultyMap = this.state.skillDifficultyMap || {};
        let totalAttempts = 0;
        let totalIncorrect = 0;
        let totalHintsUsed = 0;
        let totalResponseMs = 0;

        Object.entries(skillDifficultyMap).forEach(([, metrics]) => {
            const attempts = Number(metrics?.totalAttempts || 0);
            const incorrect = Number(metrics?.totalIncorrect || 0);
            const hintsUsed = Number(metrics?.hintInteractions || 0);
            const responseMs = Number(metrics?.totalResponseMs || 0);

            totalAttempts += attempts;
            totalIncorrect += incorrect;
            totalHintsUsed += hintsUsed;
            totalResponseMs += responseMs;
        });

        const lessonProblems = this.getLessonProblems(this.lesson);
        const totalQuestions = lessonProblems.reduce(
            (sum, problem) => sum + (problem.steps || []).length,
            0
        );
        const progressData = this.getProgressBarData();
        const topicCompletionRatio =
            progressData.total > 0
                ? Number((progressData.completed / progressData.total).toFixed(4))
                : 0;
        const questionsAttempted = Math.max(0, totalAttempts);
        const wrongAnswers = Math.max(0, totalIncorrect);
        const correctAnswers = Math.max(0, totalAttempts - totalIncorrect);
        const retryCount = Math.max(0, totalIncorrect);

        return {
            student_id: studentId,
            session_id: sessionId,
            chapter_id: MERGE_CHAPTER_ID,
            timestamp: new Date().toISOString(),
            session_status:
                sessionStatus === "completed" ? "completed" : "exited_midway",
            correct_answers: correctAnswers,
            wrong_answers: wrongAnswers,
            questions_attempted: questionsAttempted,
            total_questions: Math.max(0, totalQuestions),
            hints_used: Math.max(0, totalHintsUsed),
            total_hints_embedded: Math.max(0, this.getTotalHintsEmbedded()),
            retry_count: retryCount,
            time_spent_seconds: Math.max(0, Math.round(totalResponseMs / 1000)),
            topic_completion_ratio: topicCompletionRatio,
        };
    };

    sendSessionToMerge = async (sessionStatus = "completed", options = {}) => {
        if (this.mergePayloadSent) {
            return;
        }

        const payload = this.buildMergeSessionPayload(sessionStatus);
        if (!payload) {
            return;
        }

        this.mergePayloadSent = true;

        const requestBody = JSON.stringify(payload);
        const preferBeacon = Boolean(options?.preferBeacon);

        try {
            if (
                preferBeacon &&
                typeof navigator !== "undefined" &&
                typeof navigator.sendBeacon === "function"
            ) {
                const blob = new Blob([requestBody], {
                    type: "application/json",
                });
                const queued = navigator.sendBeacon(MERGE_INTERACTIONS_URL, blob);
                if (queued) {
                    return;
                }
            }

            const response = await fetch(MERGE_INTERACTIONS_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${this.getMergePortalToken()}`,
                },
                body: requestBody,
                keepalive: true,
            });

            if (!response.ok) {
                console.error(
                    "Failed to send session data to Merge",
                    response.status,
                    response.statusText
                );
            }
        } catch (error) {
            console.error("Failed to send session data to Merge", error);
        }
    };

    handleBeforeUnload = (event) => {
        if (this.isSessionComplete() || this.mergePayloadSent) {
            return;
        }

        this.isPageUnloading = true;
        if (this.resetUnloadIntentHandle != null) {
            window.clearTimeout(this.resetUnloadIntentHandle);
        }
        this.resetUnloadIntentHandle = window.setTimeout(() => {
            this.isPageUnloading = false;
            this.resetUnloadIntentHandle = null;
        }, 0);

        event.preventDefault();
        event.returnValue =
            "Your progress will be saved. Are you sure you want to leave?";
        return event.returnValue;
    };

    handleUnload = () => {
        this.isPageUnloading = true;
        if (this.isSessionComplete() || this.mergePayloadSent) {
            return;
        }

        const payload = this.buildMergeSessionPayload("exited_midway");
        if (!payload) {
            return;
        }

        try {
            if (
                typeof navigator === "undefined" ||
                typeof navigator.sendBeacon !== "function"
            ) {
                return;
            }

            const didQueue = navigator.sendBeacon(
                MERGE_INTERACTIONS_URL,
                JSON.stringify(payload)
            );

            if (didQueue) {
                this.mergePayloadSent = true;
            }
        } catch (error) {
            console.error("Failed to send unload beacon to Merge", error);
        }
    };
    
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

        await this.props.loadBktProgress();

        const lessonStorageKey = this.getLessonStorageKey();
        const learnerSnapshot = await this.loadLearnerProgressSnapshot();
        let prevCompletedProbs = null;
        let persistedBehaviorMetrics = null;

        if (learnerSnapshot?.lessonProgressByLesson) {
            prevCompletedProbs =
                learnerSnapshot.lessonProgressByLesson[lessonStorageKey] || null;
        }
        if (learnerSnapshot?.behaviorMetricsByLesson) {
            persistedBehaviorMetrics =
                learnerSnapshot.behaviorMetricsByLesson[lessonStorageKey] || null;
        }

        if (!Array.isArray(prevCompletedProbs) && !this.shouldUseLearnerDatabase()) {
            const { getByKey } = this.context.browserStorage;
            prevCompletedProbs = await getByKey(lessonStorageKey).catch(() => null);
        }

        if (!persistedBehaviorMetrics && !this.shouldUseLearnerDatabase()) {
            persistedBehaviorMetrics = await this.loadBehaviorMetrics();
        }

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
        const restoredMastery = this.calculateLessonMastery(
            this.context,
            this.lesson
        );

        this.setState(
            {
                currProblem: null,
                status: "theory",
                mastery: restoredMastery,
                adaptiveTrace: initialAdaptiveTrace,
                revisitSkill: null,
                revisitSection: null,
                interventionMessage: "",
                pendingTheoryIntervention: null,
                skillDifficultyMap:
                    persistedBehaviorMetrics?.skillDifficultyMap || {},
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
        const isSubmitAttempt = attemptSource === "submit";
        const isHintInteraction = attemptSource === "hint";
        if (!isSubmitAttempt && !isHintInteraction) {
            return;
        }

        const normalizedSkillIds = cleanArray(skillIds || []);
        const responseTimeMs = isSubmitAttempt
            ? Math.max(0, Number(attemptMeta?.responseTimeMs || 0))
            : 0;
        const isLongResponse = responseTimeMs >= BEHAVIOR_LONG_RESPONSE_MS;

        const normalizedStepId = String(stepId || "").trim();
        const interventionConfig = interventionMap[normalizedStepId] || null;
        const mappedSkill = String(interventionConfig?.targetSkill || "").trim() || null;

        let resolvedSkill = mappedSkill;
        if (!resolvedSkill) {
            if (!Array.isArray(normalizedSkillIds) || normalizedSkillIds.length === 0) {
                return;
            }
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
        const resolvedTargetSection =
            String(interventionConfig?.targetSection || "").trim() || null;

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
                hintInteractions: 0,
            };

            const next = {
                totalAttempts: Number(prev.totalAttempts || 0) + (isSubmitAttempt ? 1 : 0),
                totalIncorrect:
                    Number(prev.totalIncorrect || 0) +
                    (isSubmitAttempt && !isCorrect ? 1 : 0),
                recentIncorrect:
                    isSubmitAttempt && isCorrect
                        ? 0
                        : Number(prev.recentIncorrect || 0) +
                          (isSubmitAttempt && !isCorrect ? 1 : 0),
                responseSamples:
                    Number(prev.responseSamples || 0) +
                    (isSubmitAttempt && responseTimeMs > 0 ? 1 : 0),
                totalResponseMs:
                    Number(prev.totalResponseMs || 0) +
                    (isSubmitAttempt ? responseTimeMs : 0),
                longResponseCount:
                    Number(prev.longResponseCount || 0) +
                    (isSubmitAttempt && isLongResponse ? 1 : 0),
                longResponseStreak:
                    !isSubmitAttempt || responseTimeMs <= 0
                        ? Number(prev.longResponseStreak || 0)
                        : isLongResponse
                        ? Number(prev.longResponseStreak || 0) + 1
                        : 0,
                hintInteractions:
                    Number(prev.hintInteractions || 0) + (isHintInteraction ? 1 : 0),
            };
            nextSkillDifficultyMap[resolvedSkill] = next;

            if (!isSubmitAttempt) {
                return {
                    skillDifficultyMap: nextSkillDifficultyMap,
                };
            }

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
                                                            DEFAULT_BEHAVIOR_INTERVENTION_MESSAGE
                            : interventionConfig?.interventionMessage ||
                                                            DEFAULT_ACCURACY_INTERVENTION_MESSAGE,
                    targetStage: resolvedTargetStage,
                    targetSection: resolvedTargetSection,
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
        }, () => {
            this.persistBehaviorMetrics();
        });
    };

    requestTheoryRevisit = (
        skillId,
        targetStage = "",
        targetSection = "",
        reasonDetails = null
    ) => {
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
        const normalizedSection = String(targetSection || "").trim();
        const normalizedReasonType = String(
            reasonDetails?.reasonType || reasonDetails?.triggerType || ""
        )
            .trim()
            .toLowerCase();
        const explicitReasonMessage = String(reasonDetails?.message || "").trim();
        const resolvedReasonMessage =
            explicitReasonMessage ||
            (normalizedReasonType === "behavior"
                ? DEFAULT_BEHAVIOR_INTERVENTION_MESSAGE
                : DEFAULT_ACCURACY_INTERVENTION_MESSAGE);
        const reasonLead =
            normalizedReasonType === "behavior"
                ? "because you are spending more time on this topic"
                : "because you are facing repeated mistakes in this step";
        const targetStageLabel =
            THEORY_STAGE_LABELS[normalizedStage] || "the recommended stage";
        let nextTrace = adaptiveTrace;
        if (nextTrace && normalizedSkill) {
            nextTrace = {
                ...nextTrace,
                targetSkill: normalizedSkill,
                targetStage: normalizedStage || null,
                targetSection: normalizedSection || null,
                triggerType: normalizedReasonType || "accuracy",
                interventionReason: resolvedReasonMessage,
                rationale: `Revisit ${normalizedSkill} ${reasonLead} before continuing.`,
                recommendedAction: normalizedStage
                    ? normalizedSection
                        ? `Review ${normalizedSkill} in ${targetStageLabel} (${normalizedSection}), then continue with another adaptive question.`
                        : `Review ${normalizedSkill} in ${targetStageLabel}, then continue with another adaptive question.`
                    : `Review ${normalizedSkill} and then continue with another adaptive question.`,
            };
        }

        this.setState({
            status: "theory",
            revisitSkill: normalizedSkill || null,
            revisitSection: normalizedSection || null,
            adaptiveTrace: nextTrace,
            interventionMessage: resolvedReasonMessage,
            pendingTheoryIntervention: null,
        }, () => {
            this.persistBehaviorMetrics();
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
            this.setState(
                { status: "graduated", adaptiveTrace: null },
                () => {
                    this.sendSessionToMerge("completed");
                }
            );
            console.log("Graduated");
            return null;
        } else if (chosenProblem == null) {
            console.debug("no problems were chosen");
            // We have finished all the problems
            if (this.lesson && !this.lesson.allowRecycle) {
                // If we do not allow problem recycle then we have exhausted the pool
                this.setState(
                    { status: "exhausted", adaptiveTrace: null },
                    () => {
                        this.sendSessionToMerge("completed");
                    }
                );
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
                revisitSection: null,
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
        const lessonStorageKey = this.getLessonStorageKey();
        const completedProblemIDs = Array.from(this.completedProbs);
        if (this.shouldUseLearnerDatabase()) {
            this.saveLearnerProgressPatch({
                lessonProgressByLesson: {
                    [lessonStorageKey]: completedProblemIDs,
                },
            }).catch(() => {});
        } else {
            const { setByKey } = this.context.browserStorage;
            await setByKey(lessonStorageKey, completedProblemIDs).catch(
                (error) => {
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
                }
            );
        }

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
            const targetSection =
                this.state.pendingTheoryIntervention.targetSection || null;
            const triggerType =
                this.state.pendingTheoryIntervention.triggerType || "accuracy";
            const reasonMessage =
                this.state.pendingTheoryIntervention.message ||
                (triggerType === "behavior"
                    ? DEFAULT_BEHAVIOR_INTERVENTION_MESSAGE
                    : DEFAULT_ACCURACY_INTERVENTION_MESSAGE);
            const reasonLead =
                triggerType === "behavior"
                    ? "because you are spending more time on this topic"
                    : triggerType === "mixed"
                    ? "because you are facing repeated mistakes and spending more time on this topic"
                    : "because you are facing repeated mistakes in this step";
            const targetStageLabel =
                THEORY_STAGE_LABELS[targetStage] || "the recommended stage";
            const nextTrace = adaptiveTrace
                ? {
                      ...adaptiveTrace,
                      targetSkill: skill,
                      targetStage,
                      targetSection,
                      triggerType,
                      interventionReason: reasonMessage,
                      rationale: `Revisit ${skill} ${reasonLead} before the next question.`,
                      recommendedAction: targetStage
                          ? targetSection
                              ? `Complete ${targetStageLabel} for ${skill} (section: ${targetSection}), then continue.`
                              : `Complete ${targetStageLabel} for ${skill}, then continue.`
                          : `Complete the visual lab and worked examples for ${skill}, then continue.`,
                  }
                : null;

            this.setState({
                status: "theory",
                currProblem: null,
                revisitSkill: skill,
                revisitSection: targetSection,
                adaptiveTrace: nextTrace,
                interventionMessage: reasonMessage,
                pendingTheoryIntervention: null,
            }, () => {
                this.persistBehaviorMetrics();
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
        const lessonStorageKey = this.getLessonStorageKey();
        if (this.shouldUseLearnerDatabase()) {
            await this.saveLearnerProgressPatch({
                lessonProgressByLesson: {
                    [lessonStorageKey]: [],
                },
                behaviorMetricsByLesson: {
                    [lessonStorageKey]: null,
                },
            });
        } else {
            const { removeByKey } = this.context.browserStorage;
            await removeByKey(lessonStorageKey).catch(() => {});
            await removeByKey(this.getBehaviorMetricsStorageKey()).catch(() => {});
        }

        const objectives = Object.keys(this.lesson.learningObjectives || {});
        const adaptiveTrace = this.buildAdaptiveTrace(
            this.context,
            null,
            objectives
        );

        this.setState({
            status: "theory",
            currProblem: null,
            mastery: 0,
            adaptiveTrace,
            revisitSkill: null,
            revisitSection: null,
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
                console.debug("postScore analytics request failed", err, response);
                return;
            }

            if (response.status !== 200) {
                const responseText = await response
                    .text()
                    .catch(() => "unable to read response body");
                console.debug(
                    "postScore analytics request returned non-200",
                    response.status,
                    responseText
                );
                return;
            }

            console.debug("successfully submitted grade to Canvas");
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
        if (this.lesson?.id) {
            this.saveLearnerProgressPatch({
                masteryByLesson: {
                    [this.getLessonStorageKey()]: mastery,
                },
            });
        }
    };

    render() {
        const lessonTitle = this.lesson
            ? `${this.lesson.name} ${this.lesson.topics}`
            : "Understanding Quadrilaterals";
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
                            saveProgress={this.props.saveProgress}
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
                        revisitSection={this.state.revisitSection}
                        interventionMessage={this.state.interventionMessage}
                        onBeginAssessment={this.startAssessmentStage}
                    />
                ) : (
                    ""
                )}
                {this.state.status === "exhausted" ? (
                    <center>
                        <h2>
                            You have finished all questions. Great work!
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
                            You have finished all questions. Great work!
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
