import React, { useEffect, useMemo, useState } from "react";
import Button from "@material-ui/core/Button";
import Card from "@material-ui/core/Card";
import CardContent from "@material-ui/core/CardContent";
import theoryCards from "../content-sources/runtime-oatutor/theoryCards.json";
import QuadrilateralPropertyLab from "./QuadrilateralPropertyLab";

const SKILL_LABELS = {
    "quad.classify": "Classification",
    "quad.properties": "Properties",
    "quad.reasoning": "Reasoning",
};

const SKILL_ORDER = ["quad.classify", "quad.properties", "quad.reasoning"];

const STAGE_LABELS = {
    overview: "Concept Studio",
    lab: "Visual Lab",
    practice: "Reasoning Workshop",
};

const inferStageForSkill = (skillId) => {
    if (skillId === "quad.classify") {
        return "overview";
    }
    if (skillId === "quad.properties") {
        return "lab";
    }
    return "practice";
};

const fallbackTheoryCard = (skillId) => ({
    title: SKILL_LABELS[skillId] || "Quadrilateral Focus",
    summary: "Review this concept before moving to adaptive questions.",
    keyPoints: [],
    quickCheck: "Explain one rule in your own words.",
});

const calloutStyle = {
    borderRadius: 14,
    padding: "10px 12px",
    marginBottom: 10,
    border: "1px solid rgba(22,124,103,0.24)",
    background: "rgba(255,255,255,0.76)",
    color: "#204c45",
};

const sectionTitleStyle = {
    marginTop: 12,
    marginBottom: 6,
    color: "#365f58",
    letterSpacing: "0.03em",
    textTransform: "uppercase",
    fontSize: 12,
    fontWeight: 700,
};

const getTheoryResumeStorageKey = (lessonId) => {
    return `qq-theory-last-section:${String(lessonId || "default")}`;
};

const readTheoryResumePage = (lessonId) => {
    try {
        return String(
            window.localStorage.getItem(getTheoryResumeStorageKey(lessonId)) || ""
        ).trim();
    } catch (error) {
        return "";
    }
};

const writeTheoryResumePage = (lessonId, pageId) => {
    if (!pageId) {
        return;
    }
    try {
        window.localStorage.setItem(
            getTheoryResumeStorageKey(lessonId),
            String(pageId)
        );
    } catch (error) {
        // ignore storage failures in restricted browser modes
    }
};

const visualCardStyle = {
    borderRadius: 14,
    border: "1px solid rgba(22,124,103,0.2)",
    background: "rgba(255,255,255,0.74)",
    padding: 10,
};

const visualCaptionStyle = {
    marginTop: 8,
    fontSize: 12,
    lineHeight: 1.5,
    color: "#496762",
};

const renderSkillVisualization = (skillId) => {
    if (skillId === "quad.classify") {
        return (
            <svg width="100%" height="130" viewBox="0 0 320 130" role="img" aria-label="Classification map of quadrilaterals">
                <rect x="8" y="12" width="78" height="54" rx="8" fill="#e9fff8" stroke="#1e9f86" strokeWidth="2" />
                <rect x="120" y="12" width="78" height="54" rx="8" fill="#eff6ff" stroke="#1d4ed8" strokeWidth="2" />
                <rect x="232" y="12" width="78" height="54" rx="8" fill="#fff7ed" stroke="#ea580c" strokeWidth="2" />
                <polygon points="46,95 78,72 110,95 88,118 24,118" fill="#f0fdf4" stroke="#15803d" strokeWidth="2" />
                <line x1="46" y1="66" x2="46" y2="88" stroke="#2d5a53" strokeWidth="1.5" />
                <line x1="160" y1="66" x2="160" y2="96" stroke="#2d5a53" strokeWidth="1.5" />
                <line x1="272" y1="66" x2="272" y2="96" stroke="#2d5a53" strokeWidth="1.5" />
                <text x="20" y="44" fontSize="11" fill="#115e59">Trapezium</text>
                <text x="137" y="44" fontSize="11" fill="#1e3a8a">Rectangle</text>
                <text x="258" y="44" fontSize="11" fill="#9a3412">Rhombus</text>
                <text x="58" y="112" fontSize="11" fill="#14532d">Kite</text>
                <text x="180" y="109" fontSize="11" fill="#334155">Property-first classification map</text>
            </svg>
        );
    }

    if (skillId === "quad.properties") {
        return (
            <svg width="100%" height="130" viewBox="0 0 320 130" role="img" aria-label="Properties of quadrilateral with angle and side relations">
                <polygon points="24,20 130,20 154,94 8,94" fill="#e0f2fe" stroke="#0c4a6e" strokeWidth="2" />
                <line x1="24" y1="20" x2="130" y2="20" stroke="#0c4a6e" strokeWidth="3" />
                <line x1="8" y1="94" x2="154" y2="94" stroke="#0c4a6e" strokeWidth="3" />
                <text x="172" y="34" fontSize="12" fill="#0f172a">A + B + C + D = 360°</text>
                <text x="172" y="56" fontSize="12" fill="#0f172a">Opposite angles are equal</text>
                <text x="172" y="78" fontSize="12" fill="#0f172a">Adjacent angles sum to 180°</text>
                <text x="172" y="102" fontSize="11" fill="#334155">Equation before calculation</text>
            </svg>
        );
    }

    return (
        <svg width="100%" height="130" viewBox="0 0 320 130" role="img" aria-label="Reasoning flow from rule to equation to verification">
            <rect x="8" y="34" width="92" height="42" rx="8" fill="#ecfeff" stroke="#0f766e" strokeWidth="2" />
            <rect x="114" y="34" width="92" height="42" rx="8" fill="#eff6ff" stroke="#1d4ed8" strokeWidth="2" />
            <rect x="220" y="34" width="92" height="42" rx="8" fill="#fef2f2" stroke="#b91c1c" strokeWidth="2" />
            <line x1="100" y1="55" x2="114" y2="55" stroke="#334155" strokeWidth="2" />
            <line x1="206" y1="55" x2="220" y2="55" stroke="#334155" strokeWidth="2" />
            <text x="24" y="59" fontSize="12" fill="#115e59">Rule</text>
            <text x="130" y="59" fontSize="12" fill="#1d4ed8">Equation</text>
            <text x="236" y="59" fontSize="12" fill="#991b1b">Verify</text>
            <text x="12" y="103" fontSize="11" fill="#334155">{"R-I-D-E cycle: Read -> Identify -> Derive -> Evaluate"}</text>
        </svg>
    );
};

const getAnimationPrompt = (skillId) => {
    if (skillId === "quad.classify") {
        return "Watch which single property change moves a shape from one class to another.";
    }
    if (skillId === "quad.properties") {
        return "Track angle and side changes visually, then write the matching equation.";
    }
    return "Build a chain: property statement -> equation -> consistency check.";
};

const ClassificationStretchExercise = () => {
    const [shear, setShear] = useState(22);
    const [topShift, setTopShift] = useState(0);

    const points = useMemo(() => {
        const baseY = 132;
        const leftX = 18;
        const width = 172;
        const height = 88;
        const a = { x: leftX, y: baseY };
        const b = { x: leftX + width, y: baseY };
        const c = { x: leftX + width + shear - topShift, y: baseY - height };
        const d = { x: leftX + shear + topShift, y: baseY - height };
        return { a, b, c, d };
    }, [shear, topShift]);

    const topParallel = Math.abs(topShift) <= 8;
    const sideParallel = Math.abs(shear) <= 8;

    let profile = "General quadrilateral behavior";
    if (topParallel && sideParallel) {
        profile = "Parallelogram-family behavior";
    } else if (topParallel && !sideParallel) {
        profile = "One-parallel-pair behavior (trapezium-like)";
    } else if (!topParallel && sideParallel) {
        profile = "Two side directions are close, but top-base relation changed";
    }

    return (
        <div style={visualCardStyle}>
            <div style={{ fontSize: 12, color: "#244f48", marginBottom: 8 }}>
                Stretch the shape and observe class-pattern transitions.
            </div>
            <svg width="100%" height="160" viewBox="0 0 240 150" role="img" aria-label="Shape stretch exercise">
                <polygon
                    points={`${points.a.x},${points.a.y} ${points.b.x},${points.b.y} ${points.c.x},${points.c.y} ${points.d.x},${points.d.y}`}
                    fill="#d8fff5"
                    stroke="#1e9f86"
                    strokeWidth="2"
                />
            </svg>
            <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 12, color: "#3d6760", marginBottom: 2 }}>
                    Side orientation: <strong>{shear}</strong>
                </div>
                <input
                    type="range"
                    min={-40}
                    max={45}
                    value={shear}
                    onChange={(event) => setShear(Number(event.target.value))}
                    style={{ width: "100%" }}
                />
            </div>
            <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 12, color: "#3d6760", marginBottom: 2 }}>
                    Top shift: <strong>{topShift}</strong>
                </div>
                <input
                    type="range"
                    min={-35}
                    max={35}
                    value={topShift}
                    onChange={(event) => setTopShift(Number(event.target.value))}
                    style={{ width: "100%" }}
                />
            </div>
            <div style={{ ...calloutStyle, marginTop: 8, marginBottom: 0 }}>
                Observed profile: <strong>{profile}</strong>
            </div>
        </div>
    );
};

const PropertiesAngleExercise = () => {
    const [angleA, setAngleA] = useState(112);
    const angleB = 180 - angleA;
    const angleC = angleA;
    const angleD = angleB;
    const challengeSolved = Math.abs(angleB - 65) <= 1;

    return (
        <div style={visualCardStyle}>
            <div style={{ fontSize: 12, color: "#244f48", marginBottom: 8 }}>
                Angle relation explorer for a parallelogram.
            </div>
            <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 12, color: "#3d6760", marginBottom: 2 }}>
                    Set angle A: <strong>{angleA}deg</strong>
                </div>
                <input
                    type="range"
                    min={35}
                    max={145}
                    value={angleA}
                    onChange={(event) => setAngleA(Number(event.target.value))}
                    style={{ width: "100%" }}
                />
            </div>
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(4, minmax(52px, 1fr))",
                    gap: 8,
                    marginBottom: 8,
                }}
            >
                {["A", "B", "C", "D"].map((name, index) => {
                    const value = [angleA, angleB, angleC, angleD][index];
                    return (
                        <div
                            key={name}
                            style={{
                                borderRadius: 10,
                                border: "1px solid rgba(22,124,103,0.24)",
                                background: "rgba(255,255,255,0.78)",
                                padding: "8px 6px",
                                textAlign: "center",
                                fontSize: 12,
                            }}
                        >
                            <div style={{ color: "#4d7771" }}>{name}</div>
                            <strong>{value}deg</strong>
                        </div>
                    );
                })}
            </div>
            <div style={{ ...calloutStyle, marginBottom: 8 }}>
                Equation check: A + B = 180, A + B + C + D = {angleA + angleB + angleC + angleD}
            </div>
            <div style={{ fontSize: 12, color: challengeSolved ? "#166534" : "#7c2d12" }}>
                Challenge: make adjacent angle B close to 65deg. {challengeSolved ? "Solved." : "Keep adjusting A."}
            </div>
        </div>
    );
};

const REASONING_CHAIN = [
    {
        prompt: "Choose the best first step when one angle in a parallelogram is 112deg.",
        options: [
            "Write: adjacent angles in a parallelogram sum to 180deg.",
            "Assume all angles are 90deg.",
            "Use perimeter formula directly.",
        ],
        correct: "Write: adjacent angles in a parallelogram sum to 180deg.",
    },
    {
        prompt: "Now pick the correct equation.",
        options: [
            "x + 112 = 180",
            "x + 112 = 360",
            "2x = 112",
        ],
        correct: "x + 112 = 180",
    },
    {
        prompt: "Choose the final validation statement.",
        options: [
            "Check all four angles add to 360deg and opposite angles match.",
            "No validation is needed once x is found.",
            "Only verify one angle and stop.",
        ],
        correct: "Check all four angles add to 360deg and opposite angles match.",
    },
];

const ReasoningBuilderExercise = () => {
    const [stepIndex, setStepIndex] = useState(0);
    const [feedback, setFeedback] = useState("");
    const completed = stepIndex >= REASONING_CHAIN.length;
    const step = REASONING_CHAIN[Math.min(stepIndex, REASONING_CHAIN.length - 1)];

    const handleOption = (option) => {
        if (option === step.correct) {
            setFeedback("Correct. Move to the next reasoning checkpoint.");
            setStepIndex((prev) => prev + 1);
            return;
        }
        setFeedback("Try again. Pick the statement that uses a valid quadrilateral property.");
    };

    return (
        <div style={visualCardStyle}>
            <div style={{ fontSize: 12, color: "#244f48", marginBottom: 8 }}>
                Build a correct reasoning chain.
            </div>

            {completed ? (
                <div style={{ ...calloutStyle, marginBottom: 8 }}>
                    Reasoning chain complete. You can now resume the adaptive quiz confidently.
                </div>
            ) : (
                <>
                    <div style={{ marginBottom: 8, lineHeight: 1.6 }}>{step.prompt}</div>
                    <div style={{ display: "grid", gap: 8 }}>
                        {step.options.map((option) => (
                            <Button
                                key={option}
                                size="small"
                                variant="outlined"
                                color="primary"
                                onClick={() => handleOption(option)}
                            >
                                {option}
                            </Button>
                        ))}
                    </div>
                </>
            )}

            {feedback ? (
                <div style={{ marginTop: 10, fontSize: 12, color: "#365f58" }}>{feedback}</div>
            ) : null}

            <div style={{ marginTop: 10, display: "flex", justifyContent: "flex-end" }}>
                <Button
                    size="small"
                    variant="outlined"
                    color="primary"
                    onClick={() => {
                        setStepIndex(0);
                        setFeedback("");
                    }}
                >
                    Reset Exercise
                </Button>
            </div>
        </div>
    );
};

const TheoryLessonStage = ({
    lesson,
    adaptiveTrace,
    revisitSkill,
    revisitSection,
    interventionMessage,
    onBeginAssessment,
}) => {
    const learningObjectives = lesson?.learningObjectives || {};
    const objectiveKeys = Object.keys(learningObjectives);

    const objectiveSkills = useMemo(() => {
        const ordered = SKILL_ORDER.filter((skillId) =>
            objectiveKeys.includes(skillId)
        );
        if (ordered.length > 0) {
            return ordered;
        }
        if (objectiveKeys.length > 0) {
            return objectiveKeys;
        }
        return SKILL_ORDER;
    }, [objectiveKeys]);

    const focusSkill =
        revisitSkill ||
        adaptiveTrace?.targetSkill ||
        objectiveSkills[0] ||
        "quad.classify";
    const focusSectionId =
        String(revisitSection || adaptiveTrace?.targetSection || "").trim();
    const focusStage =
        adaptiveTrace?.targetStage || inferStageForSkill(focusSkill);
    const isRevisitMode = Boolean(revisitSkill);
    const revisitReason = useMemo(() => {
        const rawReason = String(
            interventionMessage || adaptiveTrace?.interventionReason || ""
        ).trim();
        if (!rawReason) {
            return "";
        }
        if (/^because\b/i.test(rawReason)) {
            return rawReason;
        }
        if (/^(you|your)\b/i.test(rawReason)) {
            return `Because ${rawReason.charAt(0).toLowerCase()}${rawReason.slice(
                1
            )}`;
        }
        return `Because ${rawReason}`;
    }, [interventionMessage, adaptiveTrace]);

    const flowPages = useMemo(() => {
        return [
            { id: "dashboard", label: "Dashboard" },
            ...objectiveSkills.map((skillId) => ({
                id: `skill-${skillId}`,
                label: SKILL_LABELS[skillId] || skillId,
                skillId,
            })),
            { id: "lab", label: "Visual Lab" },
            { id: "ready", label: "Ready Check" },
        ];
    }, [objectiveSkills]);

    const highlightedSectionIndex = useMemo(() => {
        if (focusStage === "lab") {
            const labIndex = flowPages.findIndex((page) => page.id === "lab");
            return labIndex >= 0 ? labIndex : 0;
        }

        const bySkill = flowPages.findIndex((page) => page.skillId === focusSkill);
        if (bySkill >= 0) {
            return bySkill;
        }

        return 0;
    }, [flowPages, focusSkill, focusStage]);

    const firstSectionIndex = useMemo(() => {
        const index = flowPages.findIndex((page) => Boolean(page.skillId));
        return index >= 0 ? index : 0;
    }, [flowPages]);

    const revisitStartIndex = useMemo(() => {
        if (!isRevisitMode) {
            return 0;
        }
        const skillIndex = flowPages.findIndex((page) => page.skillId === focusSkill);
        if (skillIndex >= 0) {
            return skillIndex;
        }
        return highlightedSectionIndex >= 0 ? highlightedSectionIndex : 0;
    }, [isRevisitMode, flowPages, focusSkill, highlightedSectionIndex]);

    const resumePageId = useMemo(() => {
        return readTheoryResumePage(lesson?.id);
    }, [lesson?.id]);

    const resumePageIndex = useMemo(() => {
        const storedIndex = flowPages.findIndex((page) => page.id === resumePageId);
        if (storedIndex >= 0) {
            return storedIndex;
        }
        return firstSectionIndex;
    }, [flowPages, resumePageId, firstSectionIndex]);

    const hasSavedSection = useMemo(() => {
        return flowPages.some((page) => page.id === resumePageId);
    }, [flowPages, resumePageId]);

    const [pageIndex, setPageIndex] = useState(
        isRevisitMode ? Math.max(0, revisitStartIndex) : Math.max(0, resumePageIndex)
    );

    useEffect(() => {
        if (isRevisitMode) {
            setPageIndex(Math.max(0, revisitStartIndex));
            return;
        }
        setPageIndex(Math.max(0, resumePageIndex));
    }, [isRevisitMode, revisitStartIndex, resumePageIndex, lesson?.id]);

    const activePage = flowPages[pageIndex] || flowPages[0];
    const totalPages = flowPages.length;
    const hasPrevious = pageIndex > 0;
    const hasNext = pageIndex < totalPages - 1;
    const recommendedStageLabel = STAGE_LABELS[focusStage] || "Focused review";

    useEffect(() => {
        const activePageId = flowPages[pageIndex]?.id;
        if (!activePageId || activePageId === "dashboard") {
            return;
        }
        writeTheoryResumePage(lesson?.id, activePageId);
    }, [flowPages, pageIndex, lesson?.id]);

    const renderSkillExercise = (skillId) => {
        if (skillId === "quad.classify") {
            return <ClassificationStretchExercise />;
        }
        if (skillId === "quad.properties") {
            return <PropertiesAngleExercise />;
        }
        return <ReasoningBuilderExercise />;
    };

    const activeTheoryCard = useMemo(() => {
        const skillId = activePage?.skillId;
        if (!skillId) {
            return null;
        }
        return theoryCards?.[skillId] || fallbackTheoryCard(skillId);
    }, [activePage]);

    const resolveSectionMeta = (skillId, sectionId) => {
        if (!skillId || !sectionId) {
            return null;
        }
        const skillCard = theoryCards?.[skillId];
        if (!skillCard || !Array.isArray(skillCard.sections)) {
            return null;
        }
        return (
            skillCard.sections.find(
                (section) => String(section?.id || "").trim() === sectionId
            ) || null
        );
    };

    const focusSectionMeta = useMemo(() => {
        return resolveSectionMeta(focusSkill, focusSectionId);
    }, [focusSkill, focusSectionId]);

    const focusSectionLabel = focusSectionMeta?.label || "";

    const renderSkillPage = (skillId) => {
        const card = activeTheoryCard || fallbackTheoryCard(skillId);
        const sectionCards = Array.isArray(card.sections) ? card.sections : [];
        const highlightedSection =
            skillId === focusSkill
                ? sectionCards.find(
                      (section) =>
                          String(section?.id || "").trim() === focusSectionId
                  ) || null
                : null;

        return (
            <Card style={{ borderRadius: 18, marginBottom: 12 }}>
                <CardContent>
                    <div style={{ fontSize: 12, color: "#4b7a72", marginBottom: 6 }}>
                        {SKILL_LABELS[skillId] || skillId}
                    </div>
                    <h3 style={{ marginTop: 0, marginBottom: 8, color: "#153a34" }}>
                        {card.title}
                    </h3>
                    <p style={{ marginTop: 0, lineHeight: 1.65, color: "#2d5a53" }}>
                        {card.summary}
                    </p>

                    {highlightedSection ? (
                        <div style={{ ...calloutStyle, background: "rgba(255,247,237,0.9)", border: "1px solid rgba(249,115,22,0.38)" }}>
                            <strong>Target revisit section:</strong> {highlightedSection.label}
                        </div>
                    ) : null}

                    <div style={sectionTitleStyle}>Visual Walkthrough</div>
                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                            gap: 10,
                            marginBottom: 10,
                        }}
                    >
                        <div style={visualCardStyle}>
                            <div style={{ fontSize: 11, textTransform: "uppercase", color: "#4f7772", letterSpacing: "0.06em" }}>
                                Concept Diagram
                            </div>
                            {renderSkillVisualization(skillId)}
                            <div style={visualCaptionStyle}>
                                See the relationships before reading formal definitions.
                            </div>
                        </div>
                        <div style={{ ...visualCardStyle, animation: "qqPulse 2.2s ease-in-out infinite" }}>
                            <div style={{ fontSize: 11, textTransform: "uppercase", color: "#4f7772", letterSpacing: "0.06em" }}>
                                Animated Insight
                            </div>
                            <div
                                style={{
                                    marginTop: 10,
                                    borderRadius: 10,
                                    border: "1px dashed rgba(22,124,103,0.35)",
                                    background: "rgba(240,255,250,0.85)",
                                    padding: "12px 10px",
                                    minHeight: 92,
                                    display: "flex",
                                    alignItems: "center",
                                    color: "#214a43",
                                    lineHeight: 1.6,
                                }}
                            >
                                {getAnimationPrompt(skillId)}
                            </div>
                            <div style={visualCaptionStyle}>
                                Use this with the mini visual lab below for faster intuition.
                            </div>
                        </div>
                    </div>

                    <div style={sectionTitleStyle}>Section Exercise</div>
                    <div style={{ marginBottom: 12 }}>
                        {renderSkillExercise(skillId)}
                    </div>

                    {sectionCards.length > 0 ? (
                        <>
                            <div style={sectionTitleStyle}>Subtopic Sections</div>
                            <div style={{ display: "grid", gap: 10, marginBottom: 12 }}>
                                {sectionCards.map((section) => {
                                    const isHighlighted =
                                        skillId === focusSkill &&
                                        String(section?.id || "").trim() === focusSectionId;
                                    return (
                                        <div
                                            key={section.id || section.label}
                                            style={{
                                                borderRadius: 12,
                                                border: isHighlighted
                                                    ? "1px solid rgba(249,115,22,0.45)"
                                                    : "1px solid rgba(22,124,103,0.2)",
                                                background: isHighlighted
                                                    ? "rgba(255,247,237,0.88)"
                                                    : "rgba(255,255,255,0.74)",
                                                padding: "10px 12px",
                                            }}
                                        >
                                            <div style={{ fontWeight: 700, marginBottom: 6 }}>
                                                {section.label || section.id}
                                            </div>
                                            {section.focus ? (
                                                <div style={{ marginBottom: 6 }}>{section.focus}</div>
                                            ) : null}
                                            {Array.isArray(section.details) && section.details.length > 0 ? (
                                                <ul style={{ marginTop: 0, marginBottom: 6, paddingLeft: 18, lineHeight: 1.6 }}>
                                                    {section.details.map((item) => (
                                                        <li key={item}>{item}</li>
                                                    ))}
                                                </ul>
                                            ) : null}
                                            {section.microPractice ? (
                                                <div style={{ fontSize: 12, color: "#355d57" }}>
                                                    <strong>Micro practice:</strong> {section.microPractice}
                                                </div>
                                            ) : null}
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    ) : null}

                    {Array.isArray(card.keyPoints) && card.keyPoints.length > 0 ? (
                        <>
                            <div style={sectionTitleStyle}>Core Points</div>
                            <ul style={{ marginTop: 0, paddingLeft: 18, lineHeight: 1.7 }}>
                                {card.keyPoints.map((point) => (
                                    <li key={point}>{point}</li>
                                ))}
                            </ul>
                        </>
                    ) : null}

                    {Array.isArray(card.decisionTree) && card.decisionTree.length > 0 ? (
                        <>
                            <div style={sectionTitleStyle}>Decision Path</div>
                            <ol style={{ marginTop: 0, paddingLeft: 18, lineHeight: 1.7 }}>
                                {card.decisionTree.map((step) => (
                                    <li key={step}>{step}</li>
                                ))}
                            </ol>
                        </>
                    ) : null}

                    {Array.isArray(card.deepDive) && card.deepDive.length > 0 ? (
                        <>
                            <div style={sectionTitleStyle}>Deep Dive</div>
                            {card.deepDive.map((paragraph) => (
                                <p key={paragraph} style={{ marginTop: 0, marginBottom: 8, lineHeight: 1.65 }}>
                                    {paragraph}
                                </p>
                            ))}
                        </>
                    ) : null}

                    {card.workedExample ? (
                        <>
                            <div style={sectionTitleStyle}>Worked Example</div>
                            <div style={{ marginBottom: 6 }}>
                                <strong>Prompt:</strong> {card.workedExample.prompt}
                            </div>
                            <ol style={{ marginTop: 0, paddingLeft: 18, lineHeight: 1.6 }}>
                                {(card.workedExample.steps || []).map((step) => (
                                    <li key={step}>{step}</li>
                                ))}
                            </ol>
                            <div>
                                <strong>Answer:</strong> {card.workedExample.answer}
                            </div>
                        </>
                    ) : null}

                    {Array.isArray(card.commonErrors) && card.commonErrors.length > 0 ? (
                        <>
                            <div style={sectionTitleStyle}>Common Mistakes</div>
                            <ul style={{ marginTop: 0, paddingLeft: 18, lineHeight: 1.7 }}>
                                {card.commonErrors.map((mistake) => (
                                    <li key={mistake}>{mistake}</li>
                                ))}
                            </ul>
                        </>
                    ) : null}

                    {Array.isArray(card.propertyTable) && card.propertyTable.length > 0 ? (
                        <>
                            <div style={sectionTitleStyle}>Property Table</div>
                            <div style={{ overflowX: "auto" }}>
                                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                                    <thead>
                                        <tr>
                                            <th style={{ textAlign: "left", borderBottom: "1px solid #c9ddd8", padding: "5px 6px" }}>Shape</th>
                                            <th style={{ textAlign: "left", borderBottom: "1px solid #c9ddd8", padding: "5px 6px" }}>Parallel Sides</th>
                                            <th style={{ textAlign: "left", borderBottom: "1px solid #c9ddd8", padding: "5px 6px" }}>Side Rule</th>
                                            <th style={{ textAlign: "left", borderBottom: "1px solid #c9ddd8", padding: "5px 6px" }}>Angle Rule</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {card.propertyTable.map((row) => (
                                            <tr key={row.shape}>
                                                <td style={{ borderBottom: "1px solid #dfebe8", padding: "5px 6px" }}>{row.shape}</td>
                                                <td style={{ borderBottom: "1px solid #dfebe8", padding: "5px 6px" }}>{row.parallelSides}</td>
                                                <td style={{ borderBottom: "1px solid #dfebe8", padding: "5px 6px" }}>{row.sideRule}</td>
                                                <td style={{ borderBottom: "1px solid #dfebe8", padding: "5px 6px" }}>{row.angleRule}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    ) : null}

                    <div style={{ ...calloutStyle, marginTop: 12 }}>
                        <strong>Quick Check:</strong> {card.quickCheck}
                    </div>

                    {isRevisitMode && skillId === focusSkill ? (
                        <div style={{ marginTop: 10, display: "flex", justifyContent: "flex-end" }}>
                            <Button
                                variant="contained"
                                color="primary"
                                onClick={onBeginAssessment}
                            >
                                Resume Adaptive Quiz
                            </Button>
                        </div>
                    ) : null}
                </CardContent>
            </Card>
        );
    };

    const renderDashboardPage = () => {
        return (
            <Card style={{ borderRadius: 18, marginBottom: 12 }}>
                <CardContent>
                    <h3 style={{ marginTop: 0, marginBottom: 8, color: "#153a34" }}>
                        Chapter Dashboard
                    </h3>
                    <p style={{ marginTop: 0, marginBottom: 10, lineHeight: 1.65, color: "#2d5a53" }}>
                        This flow is split into focused pages. Move with Previous and Next so each section gets attention.
                    </p>

                    <div style={{ ...calloutStyle, background: "rgba(235, 252, 246, 0.86)" }}>
                        <strong>Adaptive recommendation:</strong> {SKILL_LABELS[focusSkill] || focusSkill}
                        {` - ${recommendedStageLabel}`}
                    </div>

                    {focusSectionLabel ? (
                        <div style={{ ...calloutStyle, background: "rgba(255,247,237,0.92)", color: "#7c2d12" }}>
                            Target section to review now: <strong>{focusSectionLabel}</strong>
                        </div>
                    ) : null}

                    {revisitSkill ? (
                        <div style={{ ...calloutStyle, background: "rgba(255, 247, 237, 0.92)", color: "#7c2d12" }}>
                            Revisit requested for {SKILL_LABELS[revisitSkill] || revisitSkill}.
                        </div>
                    ) : null}

                    {interventionMessage ? (
                        <div style={{ ...calloutStyle, background: "rgba(255, 247, 237, 0.92)", color: "#7c2d12" }}>
                            {interventionMessage}
                        </div>
                    ) : null}

                    <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
                        {flowPages.map((page, index) => (
                            <div
                                key={page.id}
                                style={{
                                    borderRadius: 12,
                                    border:
                                        index === highlightedSectionIndex
                                            ? "1px solid rgba(249,115,22,0.48)"
                                            : "1px solid rgba(22,124,103,0.18)",
                                    background:
                                        index === highlightedSectionIndex
                                            ? "rgba(255,247,237,0.9)"
                                            : "rgba(255,255,255,0.7)",
                                    padding: "10px 12px",
                                }}
                            >
                                <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "#577773" }}>
                                    Step {index + 1}
                                </div>
                                <div style={{ marginTop: 4, fontWeight: 700, color: "#143f38" }}>
                                    {page.label}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {highlightedSectionIndex !== 0 ? (
                            <Button
                                size="small"
                                variant="outlined"
                                color="primary"
                                onClick={() => setPageIndex(highlightedSectionIndex)}
                            >
                                Go to highlighted revisit section
                            </Button>
                        ) : null}

                        <Button
                            size="small"
                            variant="outlined"
                            color="primary"
                            onClick={() => setPageIndex(resumePageIndex)}
                        >
                            {hasSavedSection
                                ? "Jump to where you left off"
                                : "Start from first section"}
                        </Button>

                        {isRevisitMode ? (
                            <Button
                                size="small"
                                variant="contained"
                                color="primary"
                                onClick={onBeginAssessment}
                            >
                                Resume Adaptive Quiz
                            </Button>
                        ) : null}
                    </div>
                </CardContent>
            </Card>
        );
    };

    const renderLabPage = () => {
        return (
            <Card style={{ borderRadius: 18, marginBottom: 12 }}>
                <CardContent>
                    <h3 style={{ marginTop: 0, marginBottom: 8, color: "#153a34" }}>
                        Visual Lab
                    </h3>
                    <p style={{ marginTop: 0, lineHeight: 1.65, color: "#2d5a53" }}>
                        Explore one skill at a time. Change angle, side orientation, and length to see the classification and properties shift.
                    </p>

                    <div style={{ ...calloutStyle, marginTop: 12, marginBottom: 12 }}>
                        Adaptive focus is pinned automatically to <strong>{SKILL_LABELS[focusSkill] || focusSkill}</strong> so you can concentrate on the right subtopic.
                    </div>

                    {focusSectionLabel ? (
                        <div style={{ ...calloutStyle, background: "rgba(255,247,237,0.92)", color: "#7c2d12" }}>
                            Suggested section during this revisit: <strong>{focusSectionLabel}</strong>
                        </div>
                    ) : null}

                    <QuadrilateralPropertyLab skillId={focusSkill} />
                </CardContent>
            </Card>
        );
    };

    const renderReadyPage = () => {
        const checks = objectiveSkills.map((skillId) => {
            const card = theoryCards?.[skillId] || fallbackTheoryCard(skillId);
            return {
                skillId,
                quickCheck: card.quickCheck,
            };
        });

        return (
            <Card style={{ borderRadius: 18, marginBottom: 12 }}>
                <CardContent>
                    <h3 style={{ marginTop: 0, marginBottom: 8, color: "#153a34" }}>
                        Ready Check
                    </h3>
                    <p style={{ marginTop: 0, lineHeight: 1.65, color: "#2d5a53" }}>
                        Before you continue, quickly verify these three areas.
                    </p>

                    {checks.map((item) => (
                        <div key={item.skillId} style={{ ...calloutStyle, marginBottom: 10 }}>
                            <div style={{ fontWeight: 700, marginBottom: 4 }}>
                                {SKILL_LABELS[item.skillId] || item.skillId}
                            </div>
                            <div>{item.quickCheck}</div>
                        </div>
                    ))}

                    <Button
                        variant="contained"
                        color="primary"
                        onClick={onBeginAssessment}
                    >
                        Start Stage 2: Adaptive Questions
                    </Button>
                </CardContent>
            </Card>
        );
    };

    let pageContent = null;
    if (activePage?.id === "dashboard") {
        pageContent = renderDashboardPage();
    } else if (activePage?.id === "lab") {
        pageContent = renderLabPage();
    } else if (activePage?.id === "ready") {
        pageContent = renderReadyPage();
    } else if (activePage?.skillId) {
        pageContent = renderSkillPage(activePage.skillId);
    }

    return (
        <div style={{ padding: "8px 20px 20px", maxWidth: 1160, margin: "0 auto" }}>
            <Card style={{ borderRadius: 18, marginBottom: 12 }}>
                <CardContent>
                    <div
                        style={{
                            display: "flex",
                            flexWrap: "wrap",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 10,
                        }}
                    >
                        <div>
                            <div style={{ fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase", color: "#4d7771" }}>
                                Structured Theory Flow
                            </div>
                            <h2 style={{ marginTop: 6, marginBottom: 0, color: "#123a33" }}>
                                Page {pageIndex + 1} of {totalPages}: {activePage?.label}
                            </h2>
                        </div>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            {flowPages.map((page, index) => (
                                <Button
                                    key={page.id}
                                    size="small"
                                    variant={index === pageIndex ? "contained" : "outlined"}
                                    color="primary"
                                    onClick={() => setPageIndex(index)}
                                >
                                    {index + 1}
                                </Button>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {isRevisitMode && revisitReason ? (
                <Card style={{ borderRadius: 18, marginBottom: 12 }}>
                    <CardContent>
                        <div style={{ ...calloutStyle, marginBottom: 0, background: "rgba(255,247,237,0.92)", color: "#7c2d12" }}>
                            <strong>Why this theory revisit is shown:</strong> {revisitReason}
                        </div>
                    </CardContent>
                </Card>
            ) : null}

            {pageContent}

            <Card style={{ borderRadius: 18 }}>
                <CardContent>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                        <Button
                            variant="outlined"
                            color="primary"
                            disabled={!hasPrevious}
                            onClick={() => setPageIndex((current) => Math.max(0, current - 1))}
                        >
                            Previous
                        </Button>

                        {isRevisitMode ? (
                            <Button
                                variant="outlined"
                                color="primary"
                                onClick={onBeginAssessment}
                            >
                                Resume Adaptive Quiz
                            </Button>
                        ) : null}

                        {activePage?.id === "ready" ? (
                            <Button variant="contained" color="primary" onClick={onBeginAssessment}>
                                Start Stage 2: Adaptive Questions
                            </Button>
                        ) : (
                            <Button
                                variant="contained"
                                color="primary"
                                disabled={!hasNext}
                                onClick={() =>
                                    setPageIndex((current) =>
                                        Math.min(totalPages - 1, current + 1)
                                    )
                                }
                            >
                                Next
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default TheoryLessonStage;
