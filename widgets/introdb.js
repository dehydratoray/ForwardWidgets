var WidgetMetadata = {
    id: "forward.introdb",
    title: "IntroDB (Skip Intro)",
    version: "1.0.1",
    requiredVersion: "0.0.1",
    description: "Fetch crowdsourced intro timestamps for TV shows.",
    author: "ForwardWidget User",
    site: "https://introdb.app",
    modules: [
        {
            id: "getIntro",
            title: "Get Intro Timestamps",
            functionName: "getIntro",
            type: "danmu",
            params: []
        }
    ]
};

// --- Helper Functions ---

function safeStr(v) {
    return (v === undefined || v === null) ? "" : String(v);
}

async function getImdbIdFromTmdb(tmdbId, type) {
    if (!tmdbId) return null;
    try {
        // Fetch external IDs from TMDB
        // type is usually 'tv' or 'movie'. For IntroDB it's mostly TV shows.
        // But context might just give tmdbId.
        // We'll assume 'tv' if season/episode are present, which they must be for introdb.
        const path = `tv/${tmdbId}/external_ids`;
        const res = await Widget.tmdb.get(path, {});
        if (res && res.imdb_id) {
            return res.imdb_id;
        }
    } catch (e) {
        console.log("Failed to resolve IMDb ID from TMDB:", e);
    }
    return null;
}

// --- Main Logic ---

async function getIntro(params) {
    // Params from Player: tmdbId, season, episode, type...
    // IntroDB needs: imdb_id

    let imdbId = safeStr(params.imdbId || params.imdb_id);
    const tmdbId = safeStr(params.tmdbId || params.tmdb_id);
    const season = parseInt(params.season, 10);
    const episode = parseInt(params.episode, 10);

    // Automatic Resolution: If we have tmdbId but no imdbId, resolve it.
    if ((!imdbId || !imdbId.startsWith("tt")) && tmdbId) {
        console.log(`Resolving IMDb ID for TMDB ${tmdbId}...`);
        const resolved = await getImdbIdFromTmdb(tmdbId, "tv");
        if (resolved) {
            imdbId = resolved;
            console.log(`Resolved IMDb ID: ${imdbId}`);
        }
    }

    if (!imdbId || !imdbId.startsWith("tt")) {
        console.log("IntroDB: Could not find valid IMDb ID");
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

        let json = data;
        if (typeof data === "string") {
            try { json = JSON.parse(data); } catch (e) { }
        }

        if (!json || json.error) {
            return [];
        }

        const start = json.start_ms / 1000;
        const end = json.end_ms / 1000;

        return [{
            start: start,
            end: end,
            text: "Skip Intro",
            type: "skip"
        }];

    } catch (error) {
        if (error.message && error.message.includes("404")) {
            return [];
        }
        console.error("IntroDB Error:", error);
        return [];
    }
}
