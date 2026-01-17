/**
 * Stremio Client Widget
 * Simplified to match demo.js structure.
 */
WidgetMetadata = {
    id: "forward.stremio.simple",
    title: "Stremio AIO",
    icon: "https://stremio.com/website/stremio-logo-small.png",
    version: "1.0.0",
    requiredVersion: "0.0.1",
    description: "Plays streams from AIO Lootah Addon.",
    author: "Forward User",
    site: "https://stremio.com",
    modules: [
        {
            id: "loadResource", // Changed ID to match demo.js pattern (optional, but consistent)
            title: "Load Stream",
            functionName: "loadResource", // Changed function name to match demo.js pattern
            type: "stream",
            params: [] // No user params, just like demo.js
        }
    ]
};

async function loadResource(params) {
    console.log("Stremio Simple v1.0 Params:", JSON.stringify(params));

    // Hardcoded URL as requested
    const ADDON_URL = "https://aio.lootah.app/stremio/39cf7e85-816f-41a5-aeee-175eceb61118/eyJpIjoiYzVjUHFsN1RsWVJxRjdQczIwNU5BUT09IiwiZSI6IlNLTDVyaWYvTzlSN3FMUHNMU1dRRDY5ZitVMHI0Vnl6T0RvODFDQjUweFU9IiwidCI6ImEifQ/manifest.json";

    const { imdbId, tmdbId, id, type, season, episode } = params;

    // 1. Resolve ID
    let stremioId = imdbId;
    let isTmdb = false;

    // Logic: Try IMDB first, then TMDB, then generic ID
    if (!stremioId) {
        if (tmdbId) {
            stremioId = tmdbId;
            isTmdb = true;
        } else if (id) {
            if (id.startsWith('tt')) {
                stremioId = id;
            } else if (/^\d+$/.test(id)) {
                stremioId = id;
                isTmdb = true;
            } else {
                stremioId = id;
            }
        }
    }

    if (!stremioId) {
        console.error("No ID found in params:", params);
        // Return empty array instead of throwing error to be safe
        return [];
    }

    // 2. Format ID for Stremio
    let streamId = stremioId;
    if (isTmdb && !String(stremioId).startsWith('tmdb:')) {
        streamId = `tmdb:${stremioId}`;
    }

    if (type === 'tv' && season && episode) {
        streamId = `${streamId}:${season}:${episode}`;
    }

    // 3. Prepare URL
    let baseUrl = ADDON_URL.replace('/manifest.json', '');
    if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);

    let stremioType = type === 'tv' ? 'series' : 'movie';
    const url = `${baseUrl}/stream/${stremioType}/${streamId}.json`;

    console.log(`Fetching: ${url}`);

    try {
        const response = await Widget.http.get(url, {
            headers: { "Accept": "application/json" }
        });

        const data = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;

        if (!data.streams || !Array.isArray(data.streams)) {
            return [];
        }

        return data.streams.map(stream => ({
            name: stream.title || stream.name || "Stream",
            description: (stream.title || stream.name || "") + "\n" + (stream.behaviorHints ? JSON.stringify(stream.behaviorHints) : ""),
            url: stream.url || ""
        }));

    } catch (e) {
        console.error("Error fetching streams:", e);
        return [];
    }
}
