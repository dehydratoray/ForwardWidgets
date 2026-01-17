/**
 * Stremio Client Widget
 * Consumes Stremio Addon APIs to provide streams.
 */
WidgetMetadata = {
    id: "forward.stremio.stream",
    title: "Stremio Stream",
    icon: "https://stremio.com/website/stremio-logo-small.png",
    version: "1.0.0",
    requiredVersion: "0.0.1",
    description: "Play videos from Stremio Addons (Torrentio, etc).",
    author: "Forward User",
    site: "https://stremio.com",
    modules: [
        {
            id: "loadStream",
            title: "Load from Stremio Addon",
            functionName: "loadStream",
            type: "stream",
            params: [
                {
                    name: "addonUrl",
                    title: "Addon URL",
                    type: "input",
                    description: "Stremio Addon URL",
                    value: "https://aio.lootah.app/stremio/39cf7e85-816f-41a5-aeee-175eceb61118/eyJpIjoiYzVjUHFsN1RsWVJxRjdQczIwNU5BUT09IiwiZSI6IlNLTDVyaWYvTzlSN3FMUHNMU1dRRDY5ZitVMHI0Vnl6T0RvODFDQjUweFU9IiwidCI6ImEifQ/manifest.json"
                }
            ]
        }
    ]
};

async function loadStream(params) {
    const { imdbId, tmdbId, id, type, season, episode, addonUrl } = params;

    // 1. Validate ID
    // Some Stremio addons (like Torrentio/AIO) support TMDB IDs natively as `tmdb:123`
    // If no IMDB ID, we try TMDB.
    let stremioId = imdbId;
    let isTmdb = false;

    if (!stremioId) {
        if (tmdbId) {
            stremioId = tmdbId; // Use TMDB ID
            isTmdb = true;
        } else if (id && id.startsWith('tt')) {
            stremioId = id; // Fallback to generic ID if it looks like IMDB
        }
    }

    if (!stremioId) {
        throw new Error(`No compatible ID found. Params: ${JSON.stringify(params)}`);
    }

    // 2. Construct Stream ID
    // IMDB Movie: tt1234567
    // IMDB Series: tt1234567:1:1
    // TMDB Movie: tmdb:123
    // TMDB Series: tmdb:123:1:1

    let streamId = stremioId;

    if (isTmdb) {
        streamId = `tmdb:${stremioId}`;
    }

    if (type === 'tv' && season && episode) {
        streamId = `${streamId}:${season}:${episode}`;
    }

    // 3. Prepare Addon URL
    // Strip /manifest.json if present to get base URL
    let baseUrl = (addonUrl || "https://aio.lootah.app/stremio/39cf7e85-816f-41a5-aeee-175eceb61118/eyJpIjoiYzVjUHFsN1RsWVJxRjdQczIwNU5BUT09IiwiZSI6IlNLTDVyaWYvTzlSN3FMUHNMU1dRRDY5ZitVMHI0Vnl6T0RvODFDQjUweFU9IiwidCI6ImEifQ/manifest.json").replace('/manifest.json', '');
    if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);

    // 4. Construct Request URL
    // {addonUrl}/stream/{type}/{id}.json
    let stremioType = type === 'tv' ? 'series' : 'movie';
    const url = `${baseUrl}/stream/${stremioType}/${streamId}.json`;

    console.log(`Fetching streams from: ${url}`);

    try {
        const response = await Widget.http.get(url, {
            headers: { "Accept": "application/json" }
        });

        const data = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;

        if (!data.streams || !Array.isArray(data.streams)) {
            console.log("No streams found in response", data);
            return [];
        }

        // 5. Map to Forward Video format
        return data.streams.map(stream => ({
            name: stream.title || stream.name || "Stremio Stream",
            description: [
                stream.name,
                stream.title,
                stream.behaviorHints ? JSON.stringify(stream.behaviorHints) : ""
            ].filter(Boolean).join('\n'),
            url: stream.url || "",
            // Note: Forward might not support InfoHash/Magnet directly unless specified in their player.
            // If the addon returns magnet links (like Torrentio often does without Debrid), 
            // this might fail if the player doesn't support them.
        }));

    } catch (e) {
        console.error("Stream fetch failed", e);
        throw e;
    }
}
