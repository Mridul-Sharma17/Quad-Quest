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

const sliderRow = (label, value, min, max, onChange) => (
    <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 12, color: "#475569", marginBottom: 2 }}>{label}: {value}</div>
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

const QuadrilateralPropertyLab = ({ skillId, compact = false }) => {
    const [width, setWidth] = useState(160);
    const [height, setHeight] = useState(90);
    const [shear, setShear] = useState(25);
    const [topShift, setTopShift] = useState(0);

    const points = useMemo(() => {
        const baseY = 170;
        const leftX = 30;
        const a = { x: leftX, y: baseY };
        const b = { x: leftX + width, y: baseY };
        const c = { x: leftX + width + shear - topShift, y: baseY - height };
        const d = { x: leftX + shear + topShift, y: baseY - height };
        return { a, b, c, d };
    }, [height, shear, topShift, width]);

    const metrics = useMemo(() => {
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
    }, [points]);

    const skillPrompt =
        skillId === "quad.properties"
            ? "Try keeping opposite sides parallel and observe angle behavior."
            : skillId === "quad.reasoning"
            ? "Change one variable at a time and explain what property changed."
            : "Vary side orientation and compare how classification changes.";

    return (
        <div
            style={{
                border: "1px solid #dbeafe",
                background: "#f8fbff",
                borderRadius: 10,
                padding: compact ? 10 : 14,
            }}
        >
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Interactive Property Lab</div>
            <div style={{ fontSize: 13, color: "#334155", marginBottom: 10 }}>{skillPrompt}</div>

            <svg width="100%" height={compact ? 180 : 210} viewBox="0 0 260 200" role="img" aria-label="Interactive quadrilateral visualizer">
                <polygon
                    points={`${points.a.x},${points.a.y} ${points.b.x},${points.b.y} ${points.c.x},${points.c.y} ${points.d.x},${points.d.y}`}
                    fill="#dbeafe"
                    stroke="#1d4ed8"
                    strokeWidth="2"
                />
                <text x={points.a.x - 10} y={points.a.y + 14} fontSize="12" fill="#0f172a">A</text>
                <text x={points.b.x + 4} y={points.b.y + 14} fontSize="12" fill="#0f172a">B</text>
                <text x={points.c.x + 4} y={points.c.y - 4} fontSize="12" fill="#0f172a">C</text>
                <text x={points.d.x - 12} y={points.d.y - 4} fontSize="12" fill="#0f172a">D</text>
            </svg>

            {sliderRow("Length variation (base)", width, 110, 190, setWidth)}
            {sliderRow("Height variation", height, 60, 130, setHeight)}
            {sliderRow("Side orientation (shear)", shear, -45, 55, setShear)}
            {sliderRow("Top side shift", topShift, -45, 45, setTopShift)}

            <div style={{ fontSize: 12, color: "#0f172a", marginTop: 6 }}>
                Detected shape tendency: <strong>{metrics.predictedType}</strong>
            </div>
            <div style={{ fontSize: 12, color: "#334155", marginTop: 4 }}>
                Angles approx: A {Math.round(metrics.aAng)}°, B {Math.round(metrics.bAng)}°, C {Math.round(metrics.cAng)}°, D {Math.round(metrics.dAng)}°
            </div>
            <div style={{ fontSize: 12, color: "#334155", marginTop: 2 }}>
                Opposite-side parallel check (AD // BC): {metrics.adParallelBc ? "Yes" : "No"}
            </div>
        </div>
    );
};

export default QuadrilateralPropertyLab;
