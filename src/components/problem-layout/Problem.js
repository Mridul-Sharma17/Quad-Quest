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
import IconButton from "@material-ui/core/IconButton";
import TextField from "@material-ui/core/TextField";
import { NavLink } from "react-router-dom";
import HelpOutlineOutlinedIcon from "@material-ui/icons/HelpOutlineOutlined";
import FeedbackOutlinedIcon from "@material-ui/icons/FeedbackOutlined";
import withTranslation from "../../util/withTranslation.js"

import {
    CANVAS_WARNING_STORAGE_KEY,
    MIDDLEWARE_URL,
    SHOW_NOT_CANVAS_WARNING,
    SITE_NAME,
    ThemeContext,
} from "../../config/config.js";
import { toast } from "react-toastify";
import to from "await-to-js";
import ToastID from "../../util/toastIds";
import Spacer from "../Spacer";
import { stagingProp } from "../../util/addStagingProperty";
import { cleanArray } from "../../util/cleanObject";
import Popup from '../Popup/Popup.js';
import About from '../../pages/Posts/About.js';
import theoryCards from "../../content-sources/oatutor/theoryCards.json";
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
            showFeedback: false,
            feedback: "",
            feedbackSubmitted: false,
            showPopup: false,
            preRemedialHint: null,
            remediationZone: null,
        };
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
            this.setState({
                incorrectStepCounts: {},
                preRemedialHint: null,
                remediationZone: null,
            });
        }
    }

    componentWillUnmount() {
        document["oats-meta-courseName"] = "";
        document["oats-meta-textbookName"] = "";
    }

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
        const stepId = String(problem?.steps?.[cardIndex]?.id || "");
        const interventionConfig = interventionMap[stepId] || null;

        console.debug(`answer made and is correct: ${isCorrect}`);

        if (stepStates[cardIndex] === true) {
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

    buildPreRemedialHint = (cardIndex, kcArray, interventionConfig = null) => {
        const adaptiveViewData = this.getAdaptiveViewData();
        const fallbackSkill = this.getProblemSkills(this.props.problem)[0] || "";
        const targetSkill =
            interventionConfig?.targetSkill ||
            kcArray[0] ||
            adaptiveViewData?.targetSkill ||
            fallbackSkill;
        const theoryCard = targetSkill ? theoryCards[targetSkill] || null : null;
        const step = this.props.problem?.steps?.[cardIndex];
        const stepHint = this.getStepHintText(step);

        return {
            cardIndex,
            targetSkill,
            targetStage: interventionConfig?.targetStage || null,
            title: theoryCard?.title || "Hint before remedial support",
            hintText:
                interventionConfig?.preRemedialHint ||
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

        return {
            cardIndex,
            targetSkill,
            targetStage: interventionConfig?.targetStage || null,
            title: theoryCard?.title || "Targeted skill support",
            suggestedSections:
                Array.isArray(theoryCard?.revisitSections) &&
                theoryCard.revisitSections.length > 0
                    ? theoryCard.revisitSections.slice(0, 2)
                    : [],
            quickActions: Array.isArray(theoryCard?.recoveryPlan)
                ? theoryCard.recoveryPlan.slice(0, 2)
                : Array.isArray(theoryCard?.keyPoints)
                ? theoryCard.keyPoints.slice(0, 2)
                : [
                      "Re-read the property clues in the question.",
                      "Write one rule before computing the answer.",
                  ],
            quickCheck:
                interventionConfig?.quickCheck ||
                theoryCard?.quickCheck ||
                "Review the theory points and retry this step.",
        };
    };

    clickNextProblem = async () => {
        scroll.scrollToTop({ duration: 900, smooth: true });

        await this.props.problemComplete(this.context);

        this.setState({
            stepStates: {},
            firstAttempts: {},
            incorrectStepCounts: {},
            problemFinished: false,
            feedback: "",
            feedbackSubmitted: false,
            preRemedialHint: null,
            remediationZone: null,
        });
    };

    submitFeedback = () => {
        const { problem } = this.props;

        console.debug("problem when submitting feedback", problem);
        this.context.firebase.submitFeedback(
            problem.id,
            this.state.feedback,
            this.state.problemFinished,
            chooseVariables(problem.variabilization, this.props.seed),
            problem.courseName,
            problem.steps,
            problem.lesson
        );
        this.setState({ feedback: "", feedbackSubmitted: true });
    };

    toggleFeedback = () => {
        scroll.scrollToBottom({ duration: 500, smooth: true });
        this.setState((prevState) => ({
            showFeedback: !prevState.showFeedback,
        }));
    };
    
    togglePopup = () => {
        console.log("Toggling popup visibility");
        this.setState((prevState) => ({
          showPopup: !prevState.showPopup,
        }));
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

    getOerLicense = () => {
        const { lesson, problem } = this.props;
        const parseLinkAndName = (raw) => {
            if (!raw) {
                return ["", ""];
            }

            const value = String(raw).trim();
            const match = value.match(/^([^<]+?)\s*<([^>]+)>$/);
            if (match) {
                return [match[1].trim(), match[2].trim()];
            }

            if (/^https?:\/\//i.test(value)) {
                return [value, value];
            }

            // Plain text notes are valid but not clickable links.
            return ["", value];
        };

        const [oerLink, oerName] = parseLinkAndName(
            problem.oer || lesson.courseOER
        );
        const [licenseLink, licenseName] = parseLinkAndName(
            problem.license || lesson.courseLicense
        );

        return [oerLink, oerName, licenseLink, licenseName];
    };

    render() {
        const { translate } = this.props;
        const { classes, problem, seed } = this.props;
        const [oerLink, oerName, licenseLink, licenseName] =
            this.getOerLicense();
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
        const { showPopup, preRemedialHint, remediationZone } = this.state;
        if (problem == null) {
            return <div></div>;
        }

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
                                <h1 className={classes.problemHeader}>
                                    {renderText(
                                        problem.title,
                                        problem.id,
                                        chooseVariables(
                                            problem.variabilization,
                                            seed
                                        ),
                                        this.context
                                    )}
                                    <hr />
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
                                <div
                                    style={{
                                        marginTop: 10,
                                        fontSize: 13,
                                        color: "#475569",
                                    }}
                                >
                                    Current Stage: Adaptive Assessment
                                    {lessonQuestionTypes.length > 0
                                        ? ` | Lesson formats: ${lessonQuestionTypes.join(", ")}`
                                        : ""}
                                </div>
                            </CardContent>
                        </Card>
                        <Spacer height={8} />
                        <hr />
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
                                                    remediationZone.targetStage
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
                            
                            <Grid container spacing={0}>
                                <Grid item xs={3} sm={3} md={5} key={1} />
                                <Grid item xs={6} sm={6} md={2} key={2}>
                                    <Button
                                        className={classes.button}
                                        style={{ width: "100%" }}
                                        size="small"
                                        onClick={this.clickNextProblem}
                                        disabled={
                                            !(
                                                this.state.problemFinished ||
                                                this.state.feedbackSubmitted
                                            )
                                        }
                                    >
                                        {translate('problem.NextProblem')}
                                    </Button>
                                </Grid>
                                <Grid item xs={3} sm={3} md={5} key={3} />
                            </Grid>
                        )}
                    </div>
                </div>
                <footer>
                    <div
                        style={{
                            display: "flex",
                            flexDirection: "row",
                            alignItems: "center",
                        }}
                    >
                        <div style={{ marginLeft: 20, fontSize: 12 }}>
                            {licenseName !== "" && licenseLink !== "" ? (
                                <div>
                                    "{problem.title}" {translate('problem.Derivative')}&nbsp;
                                    <a
                                        href={oerLink}
                                        target="_blank"
                                        rel="noreferrer"
                                    >
                                        "{oerName}"
                                    </a>
                                    {translate('problem.Used')}&nbsp;
                                    <a
                                        href={licenseLink}
                                        target="_blank"
                                        rel="noreferrer"
                                    >
                                        {licenseName}
                                    </a>
                                </div>
                            ) : (
                                <div>
                                {oerName !== "" && oerLink !== "" ? (
                                <div>
                                    "{problem.title}" {translate('problem.Derivative')}&nbsp;
                                    <a
                                        href={oerLink}
                                        target="_blank"
                                        rel="noreferrer"
                                    >
                                        "{oerName}"
                                    </a>
                                </div>
                            ) : (
                                <></>
                            )}
                            </div>
                            )}
                        </div>
                        <div
                            style={{
                                display: "flex",
                                flexGrow: 1,
                                marginRight: 20,
                                justifyContent: "flex-end",
                            }}
                        >
                            <IconButton
                                aria-label="about"
                                title={`About ${SITE_NAME}`}
                                onClick={this.togglePopup}
                            >
                                <HelpOutlineOutlinedIcon
                                    htmlColor={"#000"}
                                    style={{
                                        fontSize: 36,
                                        margin: -2,
                                    }}
                                />
                            </IconButton>
                            <IconButton
                                aria-label="report problem"
                                onClick={this.toggleFeedback}
                                title={"Report Problem"}
                            >
                                <FeedbackOutlinedIcon
                                    htmlColor={"#000"}
                                    style={{
                                        fontSize: 32,
                                    }}
                                />
                            </IconButton>
                        </div>
                        <Popup isOpen={showPopup} onClose={this.togglePopup}>
                            <About />
                        </Popup>
                    </div>
                    {this.state.showFeedback ? (
                        <div className="Feedback">
                            <center>
                                <h1>{translate('problem.Feedback')}</h1>
                            </center>
                            <div className={classes.textBox}>
                                <div className={classes.textBoxHeader}>
                                    <center>
                                        {this.state.feedbackSubmitted
                                            ? translate('problem.Thanks')
                                            : translate('problem.Description')}
                                    </center>
                                </div>
                                {this.state.feedbackSubmitted ? (
                                    <Spacer />
                                ) : (
                                    <Grid container spacing={0}>
                                        <Grid
                                            item
                                            xs={1}
                                            sm={2}
                                            md={2}
                                            key={1}
                                        />
                                        <Grid
                                            item
                                            xs={10}
                                            sm={8}
                                            md={8}
                                            key={2}
                                        >
                                            <TextField
                                                id="outlined-multiline-flexible"
                                                label={translate('problem.Response')}
                                                multiline
                                                fullWidth
                                                minRows="6"
                                                maxRows="20"
                                                value={this.state.feedback}
                                                onChange={(event) =>
                                                    this.setState({
                                                        feedback:
                                                            event.target.value,
                                                    })
                                                }
                                                className={classes.textField}
                                                margin="normal"
                                                variant="outlined"
                                            />{" "}
                                        </Grid>
                                        <Grid
                                            item
                                            xs={1}
                                            sm={2}
                                            md={2}
                                            key={3}
                                        />
                                    </Grid>
                                )}
                            </div>
                            {this.state.feedbackSubmitted ? (
                                ""
                            ) : (
                                <div className="submitFeedback">
                                    <Grid container spacing={0}>
                                        <Grid
                                            item
                                            xs={3}
                                            sm={3}
                                            md={5}
                                            key={1}
                                        />
                                        <Grid item xs={6} sm={6} md={2} key={2}>
                                            <Button
                                                className={classes.button}
                                                style={{ width: "100%" }}
                                                size="small"
                                                onClick={this.submitFeedback}
                                                disabled={
                                                    this.state.feedback === ""
                                                }
                                            >
                                                {translate('problem.Submit')}
                                            </Button>
                                        </Grid>
                                        <Grid
                                            item
                                            xs={3}
                                            sm={3}
                                            md={5}
                                            key={3}
                                        />
                                    </Grid>
                                    <Spacer />
                                </div>
                            )}
                        </div>
                    ) : (
                        ""
                    )}
                </footer>
            </>
        );
    }
}

export default withTranslation(withStyles(styles)(Problem));
