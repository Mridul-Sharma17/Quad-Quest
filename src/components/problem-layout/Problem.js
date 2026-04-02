import React from "react";
import { withStyles } from "@material-ui/core/styles";
import Button from "@material-ui/core/Button";
import Card from "@material-ui/core/Card";
import CardContent from "@material-ui/core/CardContent";
import ProblemCardWrapper from "./ProblemCardWrapper";
import Grid from "@material-ui/core/Grid";
import { animateScroll as scroll, Element, scroller } from "react-scroll";
import update from "../../models/BKT/BKT-brain.js";
import {
    chooseVariables,
    renderText,
} from "../../platform-logic/renderText.js";
import styles from "./common-styles.js";
import { NavLink } from "react-router-dom";
import withTranslation from "../../util/withTranslation.js"

import {
    CANVAS_WARNING_STORAGE_KEY,
    MIDDLEWARE_URL,
    SHOW_NOT_CANVAS_WARNING,
    ThemeContext,
} from "../../config/config.js";
import { toast } from "react-toastify";
import to from "await-to-js";
import ToastID from "../../util/toastIds";
import Spacer from "../Spacer";
import { stagingProp } from "../../util/addStagingProperty";
import { cleanArray } from "../../util/cleanObject";
import theoryCards from "../../content-sources/runtime-oatutor/theoryCards.json";
import interventionMap from "../../content-sources/interventionMap.json";
import QuadrilateralPropertyLab from "../QuadrilateralPropertyLab";

class Problem extends React.Component {
    static defaultProps = {
        autoScroll: true
      };
    static contextType = ThemeContext;

    constructor(props, context) {
        super(props);

        // const { setLanguage } = props;
        // if (props.lesson.courseName == "Matematik 4") {
        //     setLanguage('se')
        // }
        
        this.bktParams = context.bktParams;
        this.heuristic = context.heuristic;

        const giveStuFeedback = this.props.lesson?.giveStuFeedback;
        const giveStuHints = this.props.lesson?.giveStuHints;
        const keepMCOrder = this.props.lesson?.keepMCOrder;
        const giveHintOnIncorrect = this.props.lesson?.giveHintOnIncorrect;
        const keyboardType = this.props.lesson?.keyboardType;
        const doMasteryUpdate = this.props.lesson?.doMasteryUpdate;
        const unlockFirstHint = this.props.lesson?.unlockFirstHint;
        const giveStuBottomHint = this.props.lesson?.giveStuBottomHint;

        this.giveHintOnIncorrect = giveHintOnIncorrect != null && giveHintOnIncorrect;
        this.giveStuFeedback = giveStuFeedback == null || giveStuFeedback;
        this.keepMCOrder = keepMCOrder != null && keepMCOrder;
        this.keyboardType = keyboardType != null && keyboardType;
        this.giveStuHints = giveStuHints == null || giveStuHints;
        this.doMasteryUpdate = doMasteryUpdate == null || doMasteryUpdate;
        this.unlockFirstHint = unlockFirstHint != null && unlockFirstHint;
        this.giveStuBottomHint = giveStuBottomHint == null || giveStuBottomHint;
        this.giveDynamicHint = this.props.lesson?.allowDynamicHint;
        this.prompt_template = this.props.lesson?.prompt_template
            ? this.props.lesson?.prompt_template
            : "";

        this.state = {
            stepStates: {},
            firstAttempts: {},
            incorrectStepCounts: {},
            problemFinished: false,
            preRemedialHint: null,
            remediationZone: null,
        };

        this.autoAdvanceHandle = null;
        this.isMovingToNextProblem = false;
    }

    componentDidMount() {
        const { lesson, setLanguage } = this.props;
        if (lesson) setLanguage(lesson.language);

        document["oats-meta-courseName"] = lesson?.courseName || "";
        document["oats-meta-textbookName"] =
            lesson?.courseName
                .substring((lesson?.courseName || "").indexOf(":") + 1)
                .trim() || "";

        // query selects all katex annotation and adds aria label attribute to it
        for (const annotation of document.querySelectorAll("annotation")) {
            annotation.ariaLabel = annotation.textContent;
        }
    }

    componentDidUpdate(prevProps) {
        if (prevProps.problem?.id !== this.props.problem?.id) {
            this.clearAutoAdvanceTimer();
            this.isMovingToNextProblem = false;
            this.setState({
                incorrectStepCounts: {},
                preRemedialHint: null,
                remediationZone: null,
            });
        }
    }

    componentWillUnmount() {
        this.clearAutoAdvanceTimer();
        document["oats-meta-courseName"] = "";
        document["oats-meta-textbookName"] = "";
    }

    clearAutoAdvanceTimer = () => {
        if (this.autoAdvanceHandle != null) {
            window.clearTimeout(this.autoAdvanceHandle);
            this.autoAdvanceHandle = null;
        }
    };

    scheduleAutoAdvance = () => {
        if (this.context.debug || this.isMovingToNextProblem) {
            return;
        }
        if (this.autoAdvanceHandle != null) {
            return;
        }

        this.autoAdvanceHandle = window.setTimeout(() => {
            this.autoAdvanceHandle = null;
            this.clickNextProblem();
        }, 900);
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

    answerMade = (cardIndex, kcArray, isCorrect, attemptMeta = {}) => {
        const { stepStates, firstAttempts, incorrectStepCounts } = this.state;
        const { lesson, problem } = this.props;
        const normalizedKcArray = cleanArray(kcArray || []);
        const attemptSource = String(attemptMeta?.source || "submit").toLowerCase();
        const isSubmissionAttempt = attemptSource === "submit";
        const stepId = String(problem?.steps?.[cardIndex]?.id || "");
        const interventionConfig = interventionMap[stepId] || null;

        console.debug(`answer made and is correct: ${isCorrect}`);

        if (stepStates[cardIndex] === true) {
            return;
        }

        if (!isSubmissionAttempt) {
            return;
        }

        if (typeof this.props.onSkillOutcome === "function") {
            this.props.onSkillOutcome(
                normalizedKcArray,
                isCorrect,
                stepId,
                attemptMeta
            );
        }

        if (stepStates[cardIndex] == null) {
            for (const kc of normalizedKcArray) {
                if (!this.bktParams[kc]) {
                    console.debug("invalid KC", kc);
                    this.context.firebase.submitSiteLog(
                        "site-warning",
                        "missing-kc",
                        {
                            kc,
                            cardIndex,
                        },
                        this.context.problemID
                    );
                    continue;
                }
                if (this.doMasteryUpdate && (firstAttempts[cardIndex] === undefined || firstAttempts[cardIndex] === false)) {
                    firstAttempts[cardIndex] = true;
                    update(this.bktParams[kc], isCorrect);
                }
            }
        }

        if (!this.context.debug) {
            const objectives = Object.keys(lesson.learningObjectives);
            objectives.unshift(0);
            let score = objectives.reduce((x, y) => {
                return x + this.bktParams[y].probMastery;
            });
            score /= objectives.length - 1;
            //console.log(this.context.studentName + " " + score);
            this.props.displayMastery(score);

            const relevantKc = {};
            Object.keys(lesson.learningObjectives).forEach((x) => {
                relevantKc[x] = this.bktParams[x].probMastery;
            });

            this.updateCanvas(score, relevantKc);
        }

        if (typeof this.props.saveProgress === "function") {
            this.props.saveProgress();
        }

        const nextStepStates = {
            ...stepStates,
            [cardIndex]: isCorrect,
        };
        const nextIncorrectStepCounts = {
            ...(incorrectStepCounts || {}),
        };

        let nextPreRemedialHint = null;
        let nextRemediationZone = null;
        if (isCorrect) {
            nextIncorrectStepCounts[cardIndex] = 0;
        } else {
            const nextWrongCount =
                (nextIncorrectStepCounts[cardIndex] || 0) + 1;
            nextIncorrectStepCounts[cardIndex] = nextWrongCount;

            if (nextWrongCount === 1) {
                nextPreRemedialHint = this.buildPreRemedialHint(
                    cardIndex,
                    normalizedKcArray,
                    interventionConfig
                );
            } else {
                nextRemediationZone = this.buildRemediationZone(
                    cardIndex,
                    normalizedKcArray,
                    isCorrect,
                    interventionConfig
                );
            }
        }

        const giveStuFeedback = this.giveStuFeedback;
        const numSteps = problem.steps.length;

        if (!giveStuFeedback) {
            const numAttempted = Object.values(nextStepStates).filter(
                (stepState) => stepState != null
            ).length;
            const allCorrect = Object.values(nextStepStates).every(
                (stepState) => stepState === true
            );
            // console.log("num attempted: ", numAttempted);
            // console.log("num steps: ", numSteps);
            // console.log("step states: ", Object.values(nextStepStates));
            this.setState({
                stepStates: nextStepStates,
                incorrectStepCounts: nextIncorrectStepCounts,
                preRemedialHint: nextPreRemedialHint,
                remediationZone: nextRemediationZone,
            });
            if (numAttempted === numSteps) {
                this.setState({
                    problemFinished: true,
                    stepStates: nextStepStates,
                    incorrectStepCounts: nextIncorrectStepCounts,
                    preRemedialHint: nextPreRemedialHint,
                    remediationZone: nextRemediationZone,
                }, () => {
                    if (allCorrect) {
                        this.scheduleAutoAdvance();
                    }
                });
            }
            // don't attempt to auto scroll to next step
            return;
        }

        if (isCorrect) {
            const numCorrect = Object.values(nextStepStates).filter(
                (stepState) => stepState === true
            ).length;
            if (numSteps !== numCorrect) {
                console.debug(
                    "not last step so not done w/ problem, step states:",
                    nextStepStates
                );
                if (this.props.autoScroll) {
                    scroller.scrollTo((cardIndex + 1).toString(), {
                        duration: 500,
                        smooth: true,
                        offset: -100,
                    });
                }
                this.setState({
                    stepStates: nextStepStates,
                    incorrectStepCounts: nextIncorrectStepCounts,
                    preRemedialHint: nextPreRemedialHint,
                    remediationZone: nextRemediationZone,
                });
            } else {
                this.setState({
                    problemFinished: true,
                    stepStates: nextStepStates,
                    incorrectStepCounts: nextIncorrectStepCounts,
                    preRemedialHint: nextPreRemedialHint,
                    remediationZone: nextRemediationZone,
                }, () => {
                    this.scheduleAutoAdvance();
                });
            }
        } else {
            this.setState({
                stepStates: nextStepStates,
                incorrectStepCounts: nextIncorrectStepCounts,
                preRemedialHint: nextPreRemedialHint,
                remediationZone: nextRemediationZone,
            });
        }
    };

    getStepHintText = (step) => {
        if (!step || !step.hints || typeof step.hints !== "object") {
            return "";
        }

        const defaultPathway = Array.isArray(step.hints.DefaultPathway)
            ? step.hints.DefaultPathway
            : null;
        const selectedPathway =
            defaultPathway ||
            Object.values(step.hints).find((pathway) =>
                Array.isArray(pathway)
            );

        if (!Array.isArray(selectedPathway) || selectedPathway.length === 0) {
            return "";
        }

        const firstHintWithText =
            selectedPathway.find((hintNode) =>
                Boolean(String(hintNode?.text || "").trim())
            ) || selectedPathway[0];

        return String(firstHintWithText?.text || "").trim();
    };

    getTheorySection = (theoryCard, sectionId) => {
        const normalizedSectionId = String(sectionId || "").trim();
        if (
            !normalizedSectionId ||
            !theoryCard ||
            !Array.isArray(theoryCard.sections)
        ) {
            return null;
        }

        return (
            theoryCard.sections.find(
                (section) =>
                    String(section?.id || "").trim() === normalizedSectionId
            ) || null
        );
    };

    buildPreRemedialHint = (cardIndex, kcArray, interventionConfig = null) => {
        const adaptiveViewData = this.getAdaptiveViewData();
        const fallbackSkill = this.getProblemSkills(this.props.problem)[0] || "";
        const targetSkill =
            interventionConfig?.targetSkill ||
            kcArray[0] ||
            adaptiveViewData?.targetSkill ||
            fallbackSkill;
        const theoryCard = targetSkill ? theoryCards[targetSkill] || null : null;
        const targetSection =
            String(interventionConfig?.targetSection || "").trim() || null;
        const targetSectionMeta = this.getTheorySection(theoryCard, targetSection);
        const step = this.props.problem?.steps?.[cardIndex];
        const stepHint = this.getStepHintText(step);

        return {
            cardIndex,
            targetSkill,
            targetStage: interventionConfig?.targetStage || null,
            targetSection,
            targetSectionLabel: targetSectionMeta?.label || "",
            title: theoryCard?.title || "Hint before remedial support",
            hintText:
                interventionConfig?.preRemedialHint ||
                targetSectionMeta?.focus ||
                stepHint ||
                theoryCard?.quickCheck ||
                theoryCard?.keyPoints?.[0] ||
                "Re-read the property clues and retry this step once.",
        };
    };

    buildRemediationZone = (
        cardIndex,
        kcArray,
        isCorrect,
        interventionConfig = null
    ) => {
        if (isCorrect) {
            return null;
        }

        const adaptiveViewData = this.getAdaptiveViewData();
        const fallbackSkill = this.getProblemSkills(this.props.problem)[0] || "";
        const targetSkill =
            interventionConfig?.targetSkill ||
            kcArray[0] ||
            adaptiveViewData?.targetSkill ||
            fallbackSkill;
        const theoryCard = targetSkill ? theoryCards[targetSkill] || null : null;
        const targetSection =
            String(interventionConfig?.targetSection || "").trim() || null;
        const targetSectionMeta = this.getTheorySection(theoryCard, targetSection);
        const baseSuggestedSections =
            Array.isArray(theoryCard?.revisitSections) &&
            theoryCard.revisitSections.length > 0
                ? theoryCard.revisitSections.slice(0, 3)
                : [];
        const suggestedSections = [];
        if (targetSectionMeta?.label) {
            suggestedSections.push(targetSectionMeta.label);
        }
        for (const sectionLabel of baseSuggestedSections) {
            if (
                sectionLabel &&
                !suggestedSections.includes(sectionLabel)
            ) {
                suggestedSections.push(sectionLabel);
            }
        }

        return {
            cardIndex,
            targetSkill,
            targetStage: interventionConfig?.targetStage || null,
            targetSection,
            targetSectionLabel: targetSectionMeta?.label || "",
            interventionReason:
                interventionConfig?.interventionMessage ||
                "Because you are facing repeated mistakes on this step, revisit the related theory section before continuing.",
            title: theoryCard?.title || "Targeted skill support",
            suggestedSections,
            quickActions: Array.isArray(targetSectionMeta?.quickActions)
                ? targetSectionMeta.quickActions.slice(0, 2)
                : Array.isArray(theoryCard?.recoveryPlan)
                ? theoryCard.recoveryPlan.slice(0, 2)
                : Array.isArray(theoryCard?.keyPoints)
                ? theoryCard.keyPoints.slice(0, 2)
                : [
                      "Re-read the property clues in the question.",
                      "Write one rule before computing the answer.",
                  ],
            quickCheck:
                interventionConfig?.quickCheck ||
                targetSectionMeta?.microPractice ||
                theoryCard?.quickCheck ||
                "Review the theory points and retry this step.",
        };
    };

    clickNextProblem = async () => {
        if (this.isMovingToNextProblem) {
            return;
        }

        this.isMovingToNextProblem = true;
        this.clearAutoAdvanceTimer();
        scroll.scrollToTop({ duration: 900, smooth: true });
        try {
            await this.props.problemComplete(this.context);

            this.setState({
                stepStates: {},
                firstAttempts: {},
                incorrectStepCounts: {},
                problemFinished: false,
                preRemedialHint: null,
                remediationZone: null,
            });
        } finally {
            this.isMovingToNextProblem = false;
        }
    };

    _getNextDebug = (offset) => {
        return (
            this.context.problemIDs[
                this.context.problemIDs.indexOf(this.props.problem.id) + offset
            ] || "/"
        );
    };

    getProblemSkills = (problem) => {
        if (!problem || !Array.isArray(problem.steps)) {
            return [];
        }

        const skills = new Set();
        for (const step of problem.steps) {
            for (const kc of step.knowledgeComponents || []) {
                if (kc) {
                    skills.add(kc);
                }
            }
        }

        return Array.from(skills);
    };

    getAdaptiveViewData = () => {
        const { problem, adaptiveTrace } = this.props;
        const fallbackSkill = this.getProblemSkills(problem)[0] || null;
        const targetSkill = adaptiveTrace?.targetSkill || fallbackSkill;
        const theoryCard = targetSkill ? theoryCards[targetSkill] || null : null;
        const targetMastery = adaptiveTrace?.targetMastery;

        if (!targetSkill && !adaptiveTrace?.rationale && !theoryCard) {
            return null;
        }

        return {
            targetSkill,
            targetMastery,
            rationale:
                adaptiveTrace?.rationale ||
                "This question is selected from your current lesson objectives.",
            recommendedAction:
                adaptiveTrace?.recommendedAction ||
                "Read the theory first and then attempt the step.",
            theoryCard,
        };
    };

    normalizeProblemText = (value) => {
        return String(value || "")
            .toLowerCase()
            .replace(/<[^>]*>/g, " ")
            .replace(/[^a-z0-9\s]/g, " ")
            .replace(/\s+/g, " ")
            .trim();
    };

    flattenStepAnswers = (stepAnswer) => {
        if (Array.isArray(stepAnswer)) {
            return stepAnswer;
        }
        if (stepAnswer == null) {
            return [];
        }
        return [stepAnswer];
    };

    getDisplayProblemTitle = (problem) => {
        const rawTitle = String(problem?.title || "").trim();
        if (!rawTitle) {
            return "Quadrilateral Challenge";
        }

        const normalizedTitle = this.normalizeProblemText(rawTitle);
        const hasSpoiler = (problem?.steps || []).some((step) => {
            if (step?.problemType !== "MultipleChoice") {
                return false;
            }

            const choices = Array.isArray(step?.choices)
                ? step.choices
                      .map((item) => this.normalizeProblemText(item))
                      .filter(Boolean)
                : [];
            if (choices.length === 0) {
                return false;
            }

            const answers = this.flattenStepAnswers(step?.stepAnswer)
                .map((answer) => this.normalizeProblemText(answer))
                .filter((answer) => answer.length >= 3);

            return answers.some(
                (answer) =>
                    choices.includes(answer) &&
                    normalizedTitle.includes(answer)
            );
        });

        if (hasSpoiler) {
            return "Identify the correct quadrilateral";
        }

        return rawTitle;
    };

    render() {
        const { translate } = this.props;
        const { classes, problem, seed } = this.props;
        const assessmentFormats = Array.from(
            new Set(
                (problem?.steps || []).map((step) => {
                    if (step.problemType === "MultipleChoice") {
                        return "Multiple Choice";
                    }
                    if (step.answerType === "numeric") {
                        return "Numeric";
                    }
                    return "Text Response";
                })
            )
        );
        const lessonQuestionTypes = Array.isArray(this.props.lessonQuestionTypes)
            ? this.props.lessonQuestionTypes
            : assessmentFormats;
        const { preRemedialHint, remediationZone } = this.state;
        if (problem == null) {
            return <div></div>;
        }
        const displayProblemTitle = this.getDisplayProblemTitle(problem);

        return (
            <>
                <div>
                    <div className={classes.prompt} role={"banner"}>
                        <Card className={classes.titleCard}>
                            <CardContent
                                {...stagingProp({
                                    "data-selenium-target": "problem-header",
                                })}
                            >
                                <div className="qq-assessment-hero-grid">
                                    <div>
                                        <h1 className={classes.problemHeader}>
                                            {renderText(
                                                displayProblemTitle,
                                                problem.id,
                                                chooseVariables(
                                                    problem.variabilization,
                                                    seed
                                                ),
                                                this.context
                                            )}
                                        </h1>
                                        <div className={classes.problemBody}>
                                            {renderText(
                                                problem.body,
                                                problem.id,
                                                chooseVariables(
                                                    problem.variabilization,
                                                    seed
                                                ),
                                                this.context
                                            )}
                                        </div>
                                        <div className="qq-assessment-metrics">
                                            <span className="qq-metric-pill">
                                                Current Stage: Adaptive Assessment
                                            </span>
                                            {lessonQuestionTypes.length > 0 ? (
                                                <span className="qq-metric-pill">
                                                    Formats: {lessonQuestionTypes.join(", ")}
                                                </span>
                                            ) : null}
                                        </div>
                                    </div>
                                    <div className="qq-assessment-visual" aria-hidden="true">
                                        <svg width="100%" height="150" viewBox="0 0 280 150" role="img" aria-label="Quadrilateral assessment illustration">
                                            <polygon points="20,112 120,112 148,42 6,42" fill="#d8f7f0" stroke="#1e9f86" strokeWidth="2" />
                                            <polygon points="162,108 256,108 274,54 186,34" fill="#eef7ff" stroke="#1d4ed8" strokeWidth="2" />
                                            <line x1="20" y1="112" x2="120" y2="112" stroke="#167c67" strokeWidth="3" />
                                            <line x1="6" y1="42" x2="148" y2="42" stroke="#167c67" strokeWidth="3" />
                                            <text x="16" y="132" fontSize="11" fill="#2d4f4a">Observe properties, then solve.</text>
                                        </svg>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Spacer height={10} />
                    </div>
                    <div role={"main"}>
                        {preRemedialHint ? (
                            <Card className={classes.titleCard} style={{ marginBottom: 10 }}>
                                <CardContent>
                                    <h3 style={{ marginTop: 0, marginBottom: 8 }}>
                                        Hint Before Remedial Support
                                    </h3>
                                    <p style={{ marginTop: 0, marginBottom: 8 }}>
                                        Try this hint once before opening the remedial session.
                                    </p>
                                    <div style={{ fontWeight: 700, marginBottom: 6 }}>
                                        Focus skill: {preRemedialHint.targetSkill || "quadrilateral reasoning"}
                                    </div>
                                    <div style={{ marginBottom: 8 }}>
                                        {preRemedialHint.title}
                                    </div>
                                    <div style={{ marginBottom: 8 }}>
                                        {preRemedialHint.hintText}
                                    </div>
                                    <div style={{ fontSize: 12, color: "#475569" }}>
                                        If this step is still incorrect on the next try, targeted remedial support will open automatically.
                                    </div>
                                </CardContent>
                            </Card>
                        ) : null}
                        {remediationZone ? (
                            <Card className={classes.titleCard} style={{ marginBottom: 10 }}>
                                <CardContent>
                                    <h3 style={{ marginTop: 0, marginBottom: 8 }}>
                                        Remedial Zone
                                    </h3>
                                    <p style={{ marginTop: 0 }}>
                                        You missed this step. Try this targeted support and retry.
                                    </p>
                                    <div style={{ fontWeight: 700, marginBottom: 6 }}>
                                        Focus skill: {remediationZone.targetSkill || "quadrilateral reasoning"}
                                    </div>
                                    {remediationZone.targetSectionLabel ? (
                                        <div style={{ marginBottom: 6 }}>
                                            Target section: {remediationZone.targetSectionLabel}
                                        </div>
                                    ) : null}
                                    {remediationZone.interventionReason ? (
                                        <div style={{ marginBottom: 8, color: "#7c2d12", fontWeight: 600 }}>
                                            Reason: {remediationZone.interventionReason}
                                        </div>
                                    ) : null}
                                    <div style={{ marginBottom: 6 }}>
                                        {remediationZone.title}
                                    </div>
                                    {Array.isArray(remediationZone.suggestedSections) &&
                                    remediationZone.suggestedSections.length > 0 ? (
                                        <div style={{ marginBottom: 8 }}>
                                            Suggested revisit:
                                            <ul style={{ marginTop: 4, marginBottom: 0 }}>
                                                {remediationZone.suggestedSections.map((section) => (
                                                    <li key={section}>{section}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    ) : null}
                                    <ul style={{ marginTop: 0 }}>
                                        {(remediationZone.quickActions || []).map((action) => (
                                            <li key={action}>{action}</li>
                                        ))}
                                    </ul>
                                    <div style={{ marginBottom: 12 }}>
                                        Quick check: {remediationZone.quickCheck}
                                    </div>
                                    <QuadrilateralPropertyLab
                                        skillId={remediationZone.targetSkill}
                                        compact={true}
                                    />
                                    <Spacer height={8} />
                                    <Button
                                        className={classes.button}
                                        onClick={() => {
                                            if (
                                                typeof this.props.onRequestTheoryRevisit ===
                                                "function"
                                            ) {
                                                this.props.onRequestTheoryRevisit(
                                                    remediationZone.targetSkill,
                                                    remediationZone.targetStage,
                                                    remediationZone.targetSection,
                                                    {
                                                        reasonType: "accuracy",
                                                        message:
                                                            remediationZone.interventionReason,
                                                    }
                                                );
                                            }
                                        }}
                                    >
                                        Revisit Theory Stage
                                    </Button>
                                </CardContent>
                            </Card>
                        ) : null}
                        {problem.steps.map((step, idx) => (
                            <Element
                                name={idx.toString()}
                                key={`${problem.id}-${step.id}`}
                            >
                                <ProblemCardWrapper
                                    problemID={problem.id}
                                    step={step}
                                    index={idx}
                                    answerMade={this.answerMade}
                                    seed={seed}
                                    problemVars={problem.variabilization}
                                    lesson={problem.lesson}
                                    courseName={problem.courseName}
                                    problemTitle={problem.title}
                                    problemSubTitle={problem.body}
                                    giveStuFeedback={this.giveStuFeedback}
                                    giveStuHints={this.giveStuHints}
                                    keepMCOrder={this.keepMCOrder}
                                    keyboardType={this.keyboardType}
                                    giveHintOnIncorrect={
                                        this.giveHintOnIncorrect
                                    }
                                    unlockFirstHint={this.unlockFirstHint}
                                    giveStuBottomHint={this.giveStuBottomHint}
                                    giveDynamicHint={this.giveDynamicHint}
                                    prompt_template={this.prompt_template}
                                />
                            </Element>
                        ))}
                    </div>
                    <div width="100%">
                        {this.context.debug ? (
                            <Grid container spacing={0}>
                                <Grid item xs={2} key={0} />
                                <Grid item xs={2} key={1}>
                                    <NavLink
                                        activeClassName="active"
                                        className="link"
                                        to={this._getNextDebug(-1)}
                                        type="menu"
                                        style={{ marginRight: "10px" }}
                                    >
                                        <Button
                                            className={classes.button}
                                            style={{ width: "100%" }}
                                            size="small"
                                            onClick={() =>
                                                (this.context.needRefresh = true)
                                            }
                                        >
                                            {translate('problem.PreviousProblem')}
                                        </Button>
                                    </NavLink>
                                </Grid>
                                <Grid item xs={4} key={2} />
                                <Grid item xs={2} key={3}>
                                    <NavLink
                                        activeClassName="active"
                                        className="link"
                                        to={this._getNextDebug(1)}
                                        type="menu"
                                        style={{ marginRight: "10px" }}
                                    >
                                        <Button
                                            className={classes.button}
                                            style={{ width: "100%" }}
                                            size="small"
                                            onClick={() =>
                                                (this.context.needRefresh = true)
                                            }
                                        >
                                           {translate('problem.NextProblem')}
                                        </Button>
                                    </NavLink>
                                </Grid>
                                <Grid item xs={2} key={4} />
                            </Grid>
                        ) : (
                            <div className="qq-next-wrap">
                                    <Button
                                        className={classes.button}
                                        style={{ width: "auto", minWidth: 170 }}
                                        size="small"
                                        onClick={this.clickNextProblem}
                                        disabled={!this.state.problemFinished}
                                    >
                                        {translate('problem.NextProblem')}
                                    </Button>
                            </div>
                        )}
                        {this.state.problemFinished && !this.context.debug ? (
                            <div className="qq-auto-advance-note">
                                Great work. Moving to the next question...
                            </div>
                        ) : null}
                    </div>
                </div>
            </>
        );
    }
}

export default withTranslation(withStyles(styles)(Problem));
