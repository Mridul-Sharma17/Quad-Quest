import React, { useMemo, useState } from "react";

const approxEqual = (a, b, eps = 2) => Math.abs(a - b) <= eps;

const distance = (p1, p2) => {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    return Math.sqrt(dx * dx + dy * dy);
};

const interiorAngle = (prev, curr, next) => {
    const v1 = { x: prev.x - curr.x, y: prev.y - curr.y };
    const v2 = { x: next.x - curr.x, y: next.y - curr.y };
    const dot = v1.x * v2.x + v1.y * v2.y;
    const m1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
    const m2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);
    if (m1 === 0 || m2 === 0) {
        return 0;
    }
    let value = dot / (m1 * m2);
    value = Math.max(-1, Math.min(1, value));
    return (Math.acos(value) * 180) / Math.PI;
};

const classify = ({ ab, bc, cd, da, aAng, bAng, cAng, dAng, adParallelBc }) => {
    const allRight = [aAng, bAng, cAng, dAng].every((ang) => approxEqual(ang, 90, 5));
    const allSidesEqual = approxEqual(ab, bc) && approxEqual(bc, cd) && approxEqual(cd, da);
    const oppositeSidesEqual = approxEqual(ab, cd) && approxEqual(bc, da);

    if (adParallelBc && allSidesEqual && allRight) {
        return "square";
    }
    if (adParallelBc && allRight && oppositeSidesEqual) {
        return "rectangle";
    }
    if (adParallelBc && allSidesEqual) {
        return "rhombus";
    }
    if (adParallelBc) {
        return "parallelogram";
    }
    if (approxEqual(da, ab) && approxEqual(cd, bc)) {
        return "kite-like";
    }
    return "trapezium-like";
};

const buildShape = ({ width, height, shear, topShift }) => {
    const baseY = 170;
    const leftX = 30;
    const a = { x: leftX, y: baseY };
    const b = { x: leftX + width, y: baseY };
    const c = { x: leftX + width + shear - topShift, y: baseY - height };
    const d = { x: leftX + shear + topShift, y: baseY - height };
    return { a, b, c, d };
};

const analyzeShape = (points) => {
    const { a, b, c, d } = points;
    const ab = distance(a, b);
    const bc = distance(b, c);
    const cd = distance(c, d);
    const da = distance(d, a);

    const aAng = interiorAngle(d, a, b);
    const bAng = interiorAngle(a, b, c);
    const cAng = interiorAngle(b, c, d);
    const dAng = interiorAngle(c, d, a);

    const adDx = d.x - a.x;
    const adDy = d.y - a.y;
    const bcDx = c.x - b.x;
    const bcDy = c.y - b.y;

    const adParallelBc = approxEqual(adDx * bcDy - adDy * bcDx, 0, 220);

    return {
        ab,
        bc,
        cd,
        da,
        aAng,
        bAng,
        cAng,
        dAng,
        adParallelBc,
        predictedType: classify({ ab, bc, cd, da, aAng, bAng, cAng, dAng, adParallelBc }),
    };
};

const sliderRow = (label, value, min, max, onChange) => (
    <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 12, color: "#3e6a62", marginBottom: 2 }}>
            {label}: <strong>{value}</strong>
        </div>
        <input
            type="range"
            min={min}
            max={max}
            value={value}
            onChange={(event) => onChange(Number(event.target.value))}
            style={{ width: "100%" }}
        />
    </div>
);

const modeButtonStyle = {
    borderRadius: 10,
    border: "1px solid rgba(22,124,103,0.28)",
    background: "rgba(255,255,255,0.74)",
    color: "#1d5d52",
    fontSize: 12,
    padding: "6px 10px",
    cursor: "pointer",
};

const metricPill = (label, value) => (
    <div
        style={{
            borderRadius: 999,
            padding: "5px 9px",
            fontSize: 11,
            border: "1px solid rgba(22,124,103,0.2)",
            background: "rgba(255,255,255,0.7)",
            color: "#24564f",
        }}
    >
        {label}: <strong>{value}</strong>
    </div>
);

const QuadSvg = ({ points, fill, stroke }) => (
    <svg width="100%" height="210" viewBox="0 0 260 200" role="img" aria-label="Interactive quadrilateral visualizer">
        <polygon
            points={`${points.a.x},${points.a.y} ${points.b.x},${points.b.y} ${points.c.x},${points.c.y} ${points.d.x},${points.d.y}`}
            fill={fill}
            stroke={stroke}
            strokeWidth="2"
        />
        <text x={points.a.x - 10} y={points.a.y + 14} fontSize="12" fill="#0f172a">A</text>
        <text x={points.b.x + 4} y={points.b.y + 14} fontSize="12" fill="#0f172a">B</text>
        <text x={points.c.x + 4} y={points.c.y - 4} fontSize="12" fill="#0f172a">C</text>
        <text x={points.d.x - 12} y={points.d.y - 4} fontSize="12" fill="#0f172a">D</text>
    </svg>
);

const QuadrilateralPropertyLab = ({ skillId, mode = "morph", compact = false }) => {
    const [width, setWidth] = useState(160);
    const [height, setHeight] = useState(90);
    const [shear, setShear] = useState(25);
    const [topShift, setTopShift] = useState(0);
    const [activeMode, setActiveMode] = useState(mode);

    const points = useMemo(() => {
        return buildShape({ width, height, shear, topShift });
    }, [height, shear, topShift, width]);

    const metrics = useMemo(() => analyzeShape(points), [points]);

    const comparePoints = useMemo(
        () => buildShape({ width: 150, height: 90, shear: 8, topShift: 0 }),
        []
    );
    const compareMetrics = useMemo(() => analyzeShape(comparePoints), [comparePoints]);

    const effectiveMode = compact ? "morph" : activeMode;

    const skillPrompt =
        skillId === "quad.properties"
            ? "Focus on relationships: parallel sides, angle sums, and opposite-angle behavior."
            : skillId === "quad.reasoning"
            ? "Change one variable at a time and justify what changed and why."
            : "Observe how classification changes when shape features shift.";

    const challengeItems =
        skillId === "quad.properties"
            ? [
                  "Can you make adjacent angles sum to about 180?",
                  "Can you create a case where opposite sides look parallel?",
                  "Can you keep area feel similar while changing one angle?",
              ]
            : skillId === "quad.reasoning"
            ? [
                  "Write one property, then one equation, then verify.",
                  "Explain which slider had the strongest effect and why.",
                  "Predict shape type before moving the sliders, then test.",
              ]
            : [
                  "Build a near-square, then break one property.",
                  "Turn a parallelogram-like shape into kite-like behavior.",
                  "Identify exactly which property changed the class.",
              ];

    return (
        <div
            style={{
                border: "1px solid rgba(22,124,103,0.2)",
                background: "rgba(248, 255, 252, 0.82)",
                borderRadius: 16,
                padding: compact ? 10 : 14,
            }}
        >
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Interactive Property Lab</div>
            <div style={{ fontSize: 13, color: "#2f5a53", marginBottom: 10 }}>{skillPrompt}</div>

            {!compact ? (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
                    {[
                        { id: "morph", label: "Shape Morph" },
                        { id: "compare", label: "Compare Views" },
                        { id: "coach", label: "Challenge Coach" },
                    ].map((item) => (
                        <button
                            key={item.id}
                            type="button"
                            style={{
                                ...modeButtonStyle,
                                boxShadow:
                                    effectiveMode === item.id
                                        ? "0 0 0 2px rgba(30,159,134,0.2)"
                                        : "none",
                            }}
                            onClick={() => setActiveMode(item.id)}
                        >
                            {item.label}
                        </button>
                    ))}
                </div>
            ) : null}

            {effectiveMode === "morph" ? (
                <>
                    <QuadSvg points={points} fill="#d6faf0" stroke="#1e9f86" />

                    {sliderRow("Length variation (base)", width, 110, 190, setWidth)}
                    {sliderRow("Height variation", height, 60, 130, setHeight)}
                    {sliderRow("Side orientation (shear)", shear, -45, 55, setShear)}
                    {sliderRow("Top side shift", topShift, -45, 45, setTopShift)}

                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                        {metricPill("Tendency", metrics.predictedType)}
                        {metricPill(
                            "Angles",
                            `${Math.round(metrics.aAng)}°, ${Math.round(metrics.bAng)}°, ${Math.round(metrics.cAng)}°, ${Math.round(metrics.dAng)}°`
                        )}
                        {metricPill("AD // BC", metrics.adParallelBc ? "Yes" : "No")}
                    </div>
                </>
            ) : null}

            {effectiveMode === "compare" ? (
                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
                        gap: 12,
                    }}
                >
                    <div>
                        <div style={{ fontWeight: 600, marginBottom: 4 }}>Your current shape</div>
                        <QuadSvg points={points} fill="#d6faf0" stroke="#1e9f86" />
                        <div style={{ fontSize: 12, color: "#3a645d" }}>
                            Type tendency: <strong>{metrics.predictedType}</strong>
                        </div>
                    </div>
                    <div>
                        <div style={{ fontWeight: 600, marginBottom: 4 }}>Reference comparison shape</div>
                        <QuadSvg points={comparePoints} fill="#e9f6ff" stroke="#1d4ed8" />
                        <div style={{ fontSize: 12, color: "#3a645d" }}>
                            Type tendency: <strong>{compareMetrics.predictedType}</strong>
                        </div>
                    </div>
                </div>
            ) : null}

            {effectiveMode === "coach" ? (
                <div>
                    <div
                        style={{
                            marginBottom: 8,
                            borderRadius: 12,
                            padding: "10px 12px",
                            border: "1px solid rgba(30,159,134,0.25)",
                            background: "rgba(255,255,255,0.75)",
                            color: "#2f5a53",
                        }}
                    >
                        Try these mini-challenges to build intuition before returning to questions.
                    </div>
                    <ol style={{ marginTop: 0, paddingLeft: 18, lineHeight: 1.7 }}>
                        {challengeItems.map((item) => (
                            <li key={item}>{item}</li>
                        ))}
                    </ol>
                </div>
            ) : null}
        </div>
    );
};

export default QuadrilateralPropertyLab;
