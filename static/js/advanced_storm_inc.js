function getAdvancedStormIncShape(initials) {
    const i = String(initials || "").trim().toUpperCase();

    if (["TY", "TD", "TS", "ST", "TC", "HU"].includes(i)) {
        return "circle";
    } else if (["SD", "SS"].includes(i)) {
        return "square";
    } else if (["EX", "LO", "DB", "WV", "ET"].includes(i)) {
        return "triangle";
    }

    return "circle";
}

function getAdvancedStormIncJsonShape(stage) {
    const value = String(stage || "").toLowerCase();

    if (value.includes("subtropical")) return "square";
    if (value.includes("extratropical")) return "triangle";
    return "circle";
}

function parseAdvancedStormIncCoordinate(raw, positive, negative) {
    const text = String(raw || "").trim().toUpperCase().replace(/°/g, "");
    const match = text.match(/^([+-]?\d+(?:\.\d+)?)([NSEW])?$/);
    if (!match) return "";

    const hasDecimal = match[1].includes(".");
    let value = Number(match[1]);
    if (!Number.isFinite(value)) return "";

    if (!hasDecimal) value /= 10;

    const suffix = match[2] || positive;
    const isNegative = value < 0 || suffix === negative;
    return Math.abs(value).toFixed(1) + (isNegative ? negative : positive);
}

function parseAdvancedStormIncTrackGenJson(data) {
    let parsed;
    try {
        parsed = JSON.parse(data);
    } catch (_error) {
        return null;
    }

    if (!Array.isArray(parsed)) return null;

    return parsed
        .map(point => ({
            name: String(point.name || "STORM_INC"),
            shape: getAdvancedStormIncJsonShape(point.stage),
            category: speedToCat(Number(point.speed || point.wind || point.windSpeed || 0)),
            latitude: parseAdvancedStormIncCoordinate(point.latitude ?? point.lat, "N", "S"),
            longitude: parseAdvancedStormIncCoordinate(point.longitude ?? point.lon, "E", "W")
        }))
        .filter(point => point.latitude && point.longitude);
}

function parseAdvancedStormIncBt(data) {
    const json = parseAdvancedStormIncTrackGenJson(data);
    if (json !== null) return json;

    const parsed = [];
    data.split(/\r?\n/).forEach(line => {
        if (!line.trim()) return;

        const cols = line.split(",").map(col => col.trim());
        if (cols.length < 11 || cols[4].toUpperCase() !== "BEST") return;

        const basin = cols[0] || "SI";
        const number = cols[1] || "00";
        const name = (basin + number).replace(/\s+/g, "");

        parsed.push({
            name: name,
            shape: getAdvancedStormIncShape(cols[10]),
            category: speedToCat(Number(cols[8] || 0)),
            latitude: parseAdvancedStormIncCoordinate(cols[6], "N", "S"),
            longitude: parseAdvancedStormIncCoordinate(cols[7], "E", "W")
        });
    });

    return parsed.filter(point => point.latitude && point.longitude);
}
