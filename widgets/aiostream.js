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
                    description: "Stremio Addon URL (e.g. https://torrentio.strem.fun/manifest.json)",
                    value: "https://torrentio.strem.fun/manifest.json"
                }
            ]
        }
    ]
};

async function loadStream(params) {
    const { imdbId, id, type, season, episode, addonUrl } = params;

    // 1. Validate ID
    // Stremio relies heavily on IMDB IDs (tt...)
    const stremioId = imdbId || id;
    if (!stremioId) {
        // Some addons might support TMDB, but standard is IMDB
        console.warn("No IMDB ID provided, trying TMDB if available or failing.");
        if (!params.tmdbId) throw new Error("No compatible ID (IMDB/TMDB) found.");
    }

    // 2. Construct Stream ID
    // Movie: tt1234567
    // Series: tt1234567:1:1
    let streamId = stremioId;
    if (type === 'tv' && season && episode) {
        streamId = `${stremioId}:${season}:${episode}`;
    }

    // 3. Prepare Addon URL
    // Strip /manifest.json if present to get base URL
    let baseUrl = (addonUrl || "https://torrentio.strem.fun/manifest.json").replace('/manifest.json', '');
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
