var WidgetMetadata = {
    id: "forward.introdb",
    title: "IntroDB (Skip Intro)",
    version: "2.1.0",
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

    // We bind the TMDB ID as the 'bangumiId' (or animeId) so it gets passed to getComments
    return {
        animes: [
            {
                "bangumiId": tmdbId,
                "animeTitle": title,
                "episodeId": `${season}-${episode}`,
            }
        ]
    };
}

async function getCommentsById(params) {
    // Robust ID extraction:
    // 1. tmdbId: standard context
    // 2. commentId: passed from search result (we put tmdbId there)
    // 3. animeId: passed from search result (we put tmdbId there)
    const tmdbId = params.tmdbId || params.commentId || params.animeId;
    const { season, episode, segmentTime } = params;

    if (!tmdbId) {
        console.log("IntroDB: No valid ID found (tmdbId/commentId/animeId missing)");
        return null;
    }

    // Check local storage 
    const storageKey = `intro_${tmdbId}_${season}_${episode}`;
    const cached = Widget.storage.get(storageKey);

    if (cached) {
        return cached;
    }

    // --- ID Resolution ---
    let imdbId = safeStr(params.imdbId || params.imdb_id);
    const s = parseInt(season, 10);
    const e = parseInt(episode, 10);

    if ((!imdbId || !imdbId.startsWith("tt")) && tmdbId) {
        const resolved = await getImdbIdFromTmdb(tmdbId, "tv");
        if (resolved) imdbId = resolved;
    }

    if (!imdbId || !imdbId.startsWith("tt")) {
        console.log("IntroDB: No IMDb ID resolving possible.");
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

        // Return standard Skip Intro Object
        // Using 'type: skip' as standard.
        const skipData = [{
            start: start,
            end: end,
            text: "Skip Intro",
            type: "skip"
        }];

        // Cache it
        Widget.storage.set(storageKey, skipData);

        return skipData;

    } catch (e) {
        console.error("IntroDB Fetch Error:", e);
        return null;
    }
}

async function getDanmuWithSegmentTime(params) {
    const { tmdbId, season, episode } = params;
    // We need logic to recover the ID if it's missing (similar to above), 
    // but usually segment time calls happen after getComments, so cache might work?
    // If not, we can't do much without context.

    // Attempt to match key pattern if tmdbId is missing (risky if multiple shows cached)
    // But ideally params has tmdbId here.
    if (!tmdbId) return null;

    const storageKey = `intro_${tmdbId}_${season}_${episode}`;
    const data = Widget.storage.get(storageKey);
    return data || null;
}
