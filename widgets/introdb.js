var WidgetMetadata = {
    id: "forward.introdb",
    title: "IntroDB (Skip Intro)",
    version: "1.0.0",
    requiredVersion: "0.0.1",
    description: "Fetch crowdsourced intro timestamps for TV shows.",
    author: "ForwardWidget User",
    site: "https://introdb.app",
    modules: [
        {
            id: "getIntro",
            title: "Get Intro Timestamps",
            functionName: "getIntro",
            type: "danmu", // Using 'danmu' type often allows passing context like season/episode/imdbId automatically
            params: []
        }
    ]
};

// --- Helper Functions ---

function safeStr(v) {
    return (v === undefined || v === null) ? "" : String(v);
}

// --- Main Logic ---

async function getIntro(params) {
    // Params automatically populated by player context if available, 
    // or passed explicitly.
    // api-1.yaml requires: imdb_id, season, episode.

    // Normalized param names from ForwardWidget context might be camelCase
    // e.g. params.imdbId, params.season, params.episode

    const imdbId = safeStr(params.imdbId || params.imdb_id);
    const season = parseInt(params.season, 10);
    const episode = parseInt(params.episode, 10);

    if (!imdbId || !imdbId.startsWith("tt")) {
        console.log("IntroDB: Invalid or missing IMDb ID");
        return [];
    }
    if (isNaN(season) || isNaN(episode)) {
        console.log("IntroDB: Missing Season/Episode info");
        return [];
    }

    const url = `http://api.introdb.app/intro?imdb_id=${imdbId}&season=${season}&episode=${episode}`;

    console.log(`Fetching IntroDB: ${url}`);

    try {
        const response = await Widget.http.get(url, {
            headers: {
                "User-Agent": "ForwardWidget/1.0"
            }
        });

        const data = response && response.data;
        // API returns { start_ms, end_ms, ... } or 404

        // Parse if string
        let json = data;
        if (typeof data === "string") {
            try { json = JSON.parse(data); } catch (e) { }
        }

        if (!json || json.error) {
            console.log("IntroDB: No intro found or error.");
            return [];
        }

        // Convert to Danmu/Skip format
        // Standard "Skip" format for some players is:
        // { start: seconds, end: seconds, text: "Skip Intro" }
        // Or if acting as Danmu source, maybe just return data.
        // Given 'danmu' type, let's return a special object if possible, 
        // or just the raw data if the user handles it. 

        // Let's assume generic return for now, but format for "Skip".
        // 1000ms = 1s
        const start = json.start_ms / 1000;
        const end = json.end_ms / 1000;

        // Return standard Skip Overlay items
        return [{
            start: start,
            end: end,
            text: "Skip Intro",
            type: "skip" // Custom type convention
        }];

    } catch (error) {
        if (error.message && error.message.includes("404")) {
            console.log("IntroDB: 404 Not Found (No intro data)");
            return [];
        }
        console.error("IntroDB Error:", error);
        return [];
    }
}
