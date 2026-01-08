var WidgetMetadata = {
    id: "forward.introdb",
    title: "IntroDB (Skip Intro)",
    version: "2.0.0",
    requiredVersion: "0.0.1",
    description: "Fetch crowdsourced intro timestamps for TV shows.",
    author: "ForwardWidget User",
    site: "https://introdb.app",
    modules: [
        {
            id: "searchDanmu",
            title: "Search Danmu",
            functionName: "searchDanmu",
            type: "danmu",
            params: []
        },
        {
            id: "getComments",
            title: "Get Comments",
            functionName: "getCommentsById",
            type: "danmu",
            params: []
        },
        {
            id: "getDanmuWithSegmentTime",
            title: "Get Segment Danmu",
            functionName: "getDanmuWithSegmentTime",
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

// --- Main Standard Functions ---

async function searchDanmu(params) {
    const { title, tmdbId, season, episode } = params;

    // We try to resolve IMDb ID here to pass it down, or just pass context.
    // The player calls getCommentsById with the result of this? 
    // Usually searchDanmu returns a list of "matches".

    // Since IntroDB is automatic based on IDs, we just return a valid dummy match
    // that carries the known IDs forward.
    return {
        animes: [
            {
                "bangumiId": tmdbId, // Using TMDB ID as valid ID
                "animeTitle": title,
                "episodeId": `${season}-${episode}`, // Helper for context
            }
        ]
    };
}

async function getCommentsById(params) {
    const { tmdbId, season, episode, segmentTime } = params;

    // Check local storage first
    let cached = Widget.storage.get(tmdbId);
    // Keys in storage usually need to be specific to season/episode for a show
    const storageKey = `intro_${tmdbId}_${season}_${episode}`;
    cached = Widget.storage.get(storageKey);

    if (cached) {
        return cached;
    }

    // --- ID Resolution ---
    let imdbId = safeStr(params.imdbId || params.imdb_id); // If passed
    const s = parseInt(season, 10);
    const e = parseInt(episode, 10);

    if ((!imdbId || !imdbId.startsWith("tt")) && tmdbId) {
        // Try resolve
        const resolved = await getImdbIdFromTmdb(tmdbId, "tv");
        if (resolved) imdbId = resolved;
    }

    if (!imdbId || !imdbId.startsWith("tt")) {
        console.log("IntroDB: No IMDb ID");
        return null;
    }

    const url = `http://api.introdb.app/intro?imdb_id=${imdbId}&season=${s}&episode=${e}`;
    console.log(`Fetching IntroDB: ${url}`);

    try {
        const response = await Widget.http.get(url, {
            headers: { "User-Agent": "ForwardWidget/1.0" }
        });

        let json = response.data;
        if (typeof json === "string") { try { json = JSON.parse(json); } catch (ex) { } }

        if (!json || json.error) return null;

        const start = json.start_ms / 1000;
        const end = json.end_ms / 1000;

        // Construct the "Skip" danmu object
        // The standard usually expects an array of comments or specialized objects.
        // For "skip", we tend to follow the known schema.
        const skipData = [{
            start: start,
            end: end,
            text: "Skip Intro",
            style: "skip" // Custom style hint
        }];

        // Cache it
        Widget.storage.set(storageKey, skipData);

        return skipData;

    } catch (e) {
        console.error(e);
        return null;
    }
}

async function getDanmuWithSegmentTime(params) {
    // This function is often used for lazy loading or seeking.
    // Since we've already fetched just the 1 intro item, we likely just return from cache.
    const { tmdbId, season, episode, segmentTime } = params;
    const storageKey = `intro_${tmdbId}_${season}_${episode}`;

    // Simple logic: if we have the intro data, we return it. 
    // Real "segmenting" for thousands of comments isn't needed for 1 Skip button.
    const data = Widget.storage.get(storageKey);
    return data || null;
}
