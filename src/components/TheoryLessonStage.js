import React, { useEffect, useState } from "react";
import Button from "@material-ui/core/Button";
import Card from "@material-ui/core/Card";
import CardContent from "@material-ui/core/CardContent";
import Grid from "@material-ui/core/Grid";
import theoryCards from "../content-sources/oatutor/theoryCards.json";
import QuadrilateralPropertyLab from "./QuadrilateralPropertyLab";

const SKILL_LABELS = {
    "quad.classify": "Classification",
    "quad.properties": "Properties",
    "quad.reasoning": "Reasoning",
};

const STAGE_BY_SKILL = {
    "quad.classify": "overview",
    "quad.properties": "lab",
    "quad.reasoning": "practice",
};

const sectionTitleStyle = {
    marginTop: 12,
    marginBottom: 6,
    fontSize: 13,
    letterSpacing: "0.02em",
    color: "#334155",
    textTransform: "uppercase",
};

const STAGES = [
    { id: "overview", label: "Stage A: Concept Map" },
    { id: "lab", label: "Stage B: Visual Lab" },
    { id: "practice", label: "Stage C: Worked Reasoning" },
];

const inferStageForSkill = (skillId) => {
    return STAGE_BY_SKILL[skillId] || "overview";
};

const skillVisual = (skillId) => {
    if (skillId === "quad.classify") {
        return (
            <svg width="100%" height="88" viewBox="0 0 280 88" role="img" aria-label="Quadrilateral classification visual">
                <rect x="10" y="18" width="56" height="40" fill="#f0f9ff" stroke="#0e7490" strokeWidth="2" />
                <polygon points="102,20 152,20 170,58 84,58" fill="#fefce8" stroke="#a16207" strokeWidth="2" />
                <polygon points="198,22 246,16 266,56 210,62" fill="#f7fee7" stroke="#4d7c0f" strokeWidth="2" />
                <text x="20" y="74" fontSize="11" fill="#155e75">rectangle</text>
                <text x="102" y="74" fontSize="11" fill="#854d0e">trapezium</text>
                <text x="216" y="74" fontSize="11" fill="#3f6212">kite</text>
            </svg>
        );
    }

    if (skillId === "quad.properties") {
        return (
            <svg width="100%" height="88" viewBox="0 0 280 88" role="img" aria-label="Quadrilateral properties visual">
                <polygon points="34,16 118,16 138,60 14,60" fill="#eef2ff" stroke="#3730a3" strokeWidth="2" />
                <text x="156" y="30" fontSize="12" fill="#1e1b4b">a + b + c + d = 360</text>
                <text x="156" y="50" fontSize="12" fill="#1e1b4b">opposite angles equal</text>
                <line x1="14" y1="60" x2="138" y2="60" stroke="#3730a3" strokeWidth="2" />
            </svg>
        );
    }

    return (
        <svg width="100%" height="88" viewBox="0 0 280 88" role="img" aria-label="Reasoning strategy visual">
            <rect x="10" y="20" width="72" height="24" rx="6" fill="#ecfeff" stroke="#0f766e" strokeWidth="2" />
            <rect x="108" y="20" width="72" height="24" rx="6" fill="#f0fdf4" stroke="#166534" strokeWidth="2" />
            <rect x="206" y="20" width="64" height="24" rx="6" fill="#fef2f2" stroke="#991b1b" strokeWidth="2" />
            <line x1="82" y1="32" x2="108" y2="32" stroke="#334155" strokeWidth="2" />
            <line x1="180" y1="32" x2="206" y2="32" stroke="#334155" strokeWidth="2" />
            <text x="20" y="36" fontSize="11" fill="#115e59">property</text>
            <text x="120" y="36" fontSize="11" fill="#14532d">equation</text>
            <text x="216" y="36" fontSize="11" fill="#7f1d1d">verify</text>
            <text x="10" y="72" fontSize="11" fill="#334155">Write rule -&gt; solve -&gt; check</text>
        </svg>
    );
};

const TheoryLessonStage = ({
    lesson,
    adaptiveTrace,
    revisitSkill,
    interventionMessage,
    onBeginAssessment,
}) => {
    const learningObjectives = lesson?.learningObjectives || {};
    const objectiveSkills = Object.keys(learningObjectives);
    const metaSources = Array.isArray(theoryCards?.meta?.sources)
        ? theoryCards.meta.sources
        : [];
    const focusSkill =
        revisitSkill ||
        adaptiveTrace?.targetSkill ||
        objectiveSkills[0] ||
        "quad.classify";
    const focusStage =
        adaptiveTrace?.targetStage || inferStageForSkill(focusSkill);
    const focusStageLabel =
        STAGES.find((stage) => stage.id === focusStage)?.label ||
        "Stage A: Concept Map";
    const focusColumn = objectiveSkills.indexOf(focusSkill) + 1;

    const [activeStage, setActiveStage] = useState(focusStage);
    const [labSkill, setLabSkill] = useState(focusSkill);

    useEffect(() => {
        setActiveStage(focusStage);
        setLabSkill(focusSkill);
    }, [focusSkill, focusStage]);

    return (
        <div style={{ padding: "16px 20px" }}>
            <Card style={{ marginBottom: 12 }}>
                <CardContent>
                    <h2 style={{ marginTop: 0, marginBottom: 8 }}>Stage 1: Theory</h2>
                    <p style={{ marginTop: 0, marginBottom: 8 }}>
                        Learn first. There are no questions in this stage.
                    </p>
                    {revisitSkill ? (
                        <div
                            style={{
                                marginBottom: 8,
                                background: "#fff7ed",
                                border: "1px solid #fdba74",
                                borderRadius: 8,
                                padding: 10,
                            }}
                        >
                            Recommended revisit: {SKILL_LABELS[revisitSkill] || revisitSkill}. Review this section, then continue.
                        </div>
                    ) : null}
                    {adaptiveTrace?.targetSkill ? (
                        <div
                            style={{
                                marginBottom: 8,
                                background: "#eff6ff",
                                border: "1px solid #93c5fd",
                                borderRadius: 8,
                                padding: 10,
                            }}
                        >
                            Adaptive focus right now: {SKILL_LABELS[adaptiveTrace.targetSkill] || adaptiveTrace.targetSkill}.
                        </div>
                    ) : null}
                    {focusSkill ? (
                        <div
                            style={{
                                marginBottom: 8,
                                background: "#fff7ed",
                                border: "1px solid #fdba74",
                                borderRadius: 8,
                                padding: 10,
                                color: "#7c2d12",
                                fontWeight: 600,
                            }}
                        >
                            Recommended deep focus: {focusStageLabel}
                            {focusColumn > 0 ? ` | Column ${focusColumn}` : ""}
                            {` | ${SKILL_LABELS[focusSkill] || focusSkill}`}
                        </div>
                    ) : null}
                    {interventionMessage ? (
                        <div
                            style={{
                                marginBottom: 8,
                                background: "#fff7ed",
                                border: "1px solid #fb923c",
                                borderRadius: 8,
                                padding: 10,
                                color: "#7c2d12",
                                fontWeight: 600,
                            }}
                        >
                            {interventionMessage}
                        </div>
                    ) : null}
                    {metaSources.length > 0 ? (
                        <div
                            style={{
                                marginTop: 10,
                                fontSize: 12,
                                color: "#334155",
                            }}
                        >
                            Source-backed theory used in this stage:
                            {metaSources.map((source) => (
                                <div key={source.url}>
                                    <a href={source.url} target="_blank" rel="noreferrer">
                                        {source.label}
                                    </a>
                                </div>
                            ))}
                        </div>
                    ) : null}
                </CardContent>
            </Card>

            <Card style={{ marginBottom: 12 }}>
                <CardContent>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {STAGES.map((stage) => (
                            <Button
                                key={stage.id}
                                variant={activeStage === stage.id ? "contained" : "outlined"}
                                color="primary"
                                size="small"
                                onClick={() => setActiveStage(stage.id)}
                                style={
                                    stage.id === focusStage
                                        ? { boxShadow: "0 0 0 2px rgba(249, 115, 22, 0.35)" }
                                        : undefined
                                }
                            >
                                {stage.label}
                            </Button>
                        ))}
                    </div>
                    <div style={{ fontSize: 12, color: "#475569", marginTop: 8 }}>
                        {activeStage === "overview"
                            ? "Build conceptual clarity and classification logic first."
                            : activeStage === "lab"
                            ? "Interact with properties in real time: angle, side orientation, and length variation."
                            : "Consolidate with worked reasoning and error recovery strategies."}
                    </div>
                    {activeStage !== focusStage ? (
                        <div style={{ marginTop: 8 }}>
                            <Button
                                size="small"
                                variant="outlined"
                                onClick={() => setActiveStage(focusStage)}
                            >
                                Jump to recommended stage and column
                            </Button>
                        </div>
                    ) : null}
                </CardContent>
            </Card>

            {activeStage === "lab" ? (
                <Card style={{ marginBottom: 12 }}>
                    <CardContent>
                        <h3 style={{ marginTop: 0, marginBottom: 8 }}>
                            Interactive Theory Lab
                        </h3>
                        <div style={{ fontSize: 13, color: "#334155", marginBottom: 10 }}>
                            Explore one focus skill at a time and observe how geometric properties change.
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
                            {objectiveSkills.map((skillId) => (
                                <Button
                                    key={skillId}
                                    size="small"
                                    variant={labSkill === skillId ? "contained" : "outlined"}
                                    color="primary"
                                    onClick={() => setLabSkill(skillId)}
                                >
                                    {SKILL_LABELS[skillId] || skillId}
                                </Button>
                            ))}
                        </div>
                        <QuadrilateralPropertyLab skillId={labSkill} />
                    </CardContent>
                </Card>
            ) : null}

            <Grid container spacing={2}>
                {objectiveSkills.map((skillId) => {
                    const card = theoryCards[skillId] || {
                        title: SKILL_LABELS[skillId] || skillId,
                        summary: "Review this concept before attempting questions.",
                        keyPoints: [],
                        quickCheck: "Explain the rule in your own words.",
                    };
                    const isPinnedTarget =
                        skillId === focusSkill && activeStage === focusStage;

                    return (
                        <Grid item xs={12} md={4} key={skillId}>
                            <Card
                                style={{
                                    height: "100%",
                                    border: isPinnedTarget ? "2px solid #f97316" : "1px solid #e2e8f0",
                                    boxShadow: isPinnedTarget ? "0 0 0 2px rgba(249, 115, 22, 0.15)" : "none",
                                }}
                            >
                                <CardContent>
                                    <div style={{ fontSize: 12, color: "#475569", marginBottom: 6 }}>
                                        {SKILL_LABELS[skillId] || skillId}
                                    </div>
                                    <h3 style={{ marginTop: 0, marginBottom: 8 }}>{card.title}</h3>
                                    <div style={{ marginBottom: 10 }}>{skillVisual(skillId)}</div>
                                    <p style={{ marginTop: 0 }}>{card.summary}</p>

                                    {activeStage !== "lab" ? (
                                        <>
                                            <div style={sectionTitleStyle}>Core Points</div>
                                            <ul style={{ marginTop: 0, paddingLeft: 18 }}>
                                                {(card.keyPoints || []).map((point) => (
                                                    <li key={point}>{point}</li>
                                                ))}
                                            </ul>
                                        </>
                                    ) : null}

                                    {activeStage === "overview" && Array.isArray(card.decisionTree) && card.decisionTree.length > 0 ? (
                                        <>
                                            <div style={sectionTitleStyle}>Decision Path</div>
                                            <ol style={{ marginTop: 0, paddingLeft: 18 }}>
                                                {card.decisionTree.map((rule) => (
                                                    <li key={rule}>{rule}</li>
                                                ))}
                                            </ol>
                                        </>
                                    ) : null}

                                    {activeStage === "lab" ? (
                                        <>
                                            <div style={sectionTitleStyle}>Lab Focus</div>
                                            <ul style={{ marginTop: 0, paddingLeft: 18 }}>
                                                {(card.revisitSections || card.keyPoints || []).slice(0, 3).map((entry) => (
                                                    <li key={entry}>{entry}</li>
                                                ))}
                                            </ul>
                                        </>
                                    ) : null}

                                    {activeStage === "practice" && Array.isArray(card.deepDive) && card.deepDive.length > 0 ? (
                                        <>
                                            <div style={sectionTitleStyle}>Detailed Explanation</div>
                                            {card.deepDive.map((paragraph) => (
                                                <p key={paragraph} style={{ marginTop: 0, marginBottom: 8 }}>
                                                    {paragraph}
                                                </p>
                                            ))}
                                        </>
                                    ) : null}

                                    {activeStage === "practice" && Array.isArray(card.propertyTable) && card.propertyTable.length > 0 ? (
                                        <>
                                            <div style={sectionTitleStyle}>Property Table</div>
                                            <div style={{ overflowX: "auto" }}>
                                                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                                                    <thead>
                                                        <tr>
                                                            <th style={{ textAlign: "left", borderBottom: "1px solid #cbd5e1", padding: "4px 6px" }}>Shape</th>
                                                            <th style={{ textAlign: "left", borderBottom: "1px solid #cbd5e1", padding: "4px 6px" }}>Parallel Sides</th>
                                                            <th style={{ textAlign: "left", borderBottom: "1px solid #cbd5e1", padding: "4px 6px" }}>Side Rule</th>
                                                            <th style={{ textAlign: "left", borderBottom: "1px solid #cbd5e1", padding: "4px 6px" }}>Angle Rule</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {card.propertyTable.map((row) => (
                                                            <tr key={row.shape}>
                                                                <td style={{ borderBottom: "1px solid #e2e8f0", padding: "4px 6px" }}>{row.shape}</td>
                                                                <td style={{ borderBottom: "1px solid #e2e8f0", padding: "4px 6px" }}>{row.parallelSides}</td>
                                                                <td style={{ borderBottom: "1px solid #e2e8f0", padding: "4px 6px" }}>{row.sideRule}</td>
                                                                <td style={{ borderBottom: "1px solid #e2e8f0", padding: "4px 6px" }}>{row.angleRule}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </>
                                    ) : null}

                                    {activeStage === "practice" && card.workedExample ? (
                                        <>
                                            <div style={sectionTitleStyle}>Worked Example</div>
                                            <div style={{ marginBottom: 6 }}>
                                                <strong>Prompt:</strong> {card.workedExample.prompt}
                                            </div>
                                            <ol style={{ marginTop: 0, paddingLeft: 18 }}>
                                                {(card.workedExample.steps || []).map((step) => (
                                                    <li key={step}>{step}</li>
                                                ))}
                                            </ol>
                                            <div>
                                                <strong>Answer:</strong> {card.workedExample.answer}
                                            </div>
                                        </>
                                    ) : null}

                                    {activeStage === "practice" && Array.isArray(card.commonErrors) && card.commonErrors.length > 0 ? (
                                        <>
                                            <div style={sectionTitleStyle}>Common Mistakes</div>
                                            <ul style={{ marginTop: 0, paddingLeft: 18 }}>
                                                {card.commonErrors.map((mistake) => (
                                                    <li key={mistake}>{mistake}</li>
                                                ))}
                                            </ul>
                                        </>
                                    ) : null}

                                    {activeStage === "practice" && Array.isArray(card.revisitSections) && card.revisitSections.length > 0 ? (
                                        <>
                                            <div style={sectionTitleStyle}>Revisit Sections</div>
                                            <ul style={{ marginTop: 0, paddingLeft: 18 }}>
                                                {card.revisitSections.map((item) => (
                                                    <li key={item}>{item}</li>
                                                ))}
                                            </ul>
                                        </>
                                    ) : null}

                                    {activeStage === "practice" && Array.isArray(card.recoveryPlan) && card.recoveryPlan.length > 0 ? (
                                        <>
                                            <div style={sectionTitleStyle}>Recovery Plan</div>
                                            <ol style={{ marginTop: 0, paddingLeft: 18 }}>
                                                {card.recoveryPlan.map((step) => (
                                                    <li key={step}>{step}</li>
                                                ))}
                                            </ol>
                                        </>
                                    ) : null}

                                    <div style={{ marginTop: 8 }}>
                                        Quick check: {card.quickCheck}
                                    </div>

                                    {activeStage === "practice" && Array.isArray(card.sourceLinks) && card.sourceLinks.length > 0 ? (
                                        <div style={{ marginTop: 10, fontSize: 12 }}>
                                            <strong>Learn more:</strong>
                                            {card.sourceLinks.map((source) => (
                                                <div key={source.url}>
                                                    <a href={source.url} target="_blank" rel="noreferrer">
                                                        {source.label}
                                                    </a>
                                                </div>
                                            ))}
                                        </div>
                                    ) : null}
                                </CardContent>
                            </Card>
                        </Grid>
                    );
                })}
            </Grid>

            <div style={{ marginTop: 14 }}>
                <Button variant="contained" color="primary" onClick={onBeginAssessment}>
                    Start Stage 2: Adaptive Questions
                </Button>
            </div>
        </div>
    );
};

export default TheoryLessonStage;
