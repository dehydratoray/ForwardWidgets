var WidgetMetadata = {
    id: "forward.mdblist.custom",
    title: "MDBList Custom",
    version: "1.0.1",
    requiredVersion: "0.0.1",
    description: "Load custom lists from MDBList.com (requires API Key).",
    author: "ForwardWidget User",
    site: "https://mdblist.com/",
    modules: [
        {
            id: "customList",
            title: "Custom List",
            functionName: "customList",
            params: [
                {
                    name: "url",
                    title: "MDBList URL",
                    type: "input",
                    description: "e.g. https://mdblist.com/lists/user/my-list",
                    value: "",
                    placeholders: [
                        { title: "Paste URL here", value: "https://mdblist.com/lists/linaspina/top-watched-movies-of-the-week" }
                    ]
                },
                {
                    name: "apiKey",
                    title: "MDBList API Key",
                    type: "input",
                    description: "From MDBList Preferences (Free).",
                    value: ""
                },
                {
                    name: "language",
                    title: "Language",
                    type: "language",
                    value: "zh-CN"
                },
                {
                    name: "page",
                    title: "Page",
                    type: "page"
                }
            ]
        }
    ]
};

// --- Helper Functions ---

function safeStr(v) {
    return (v === undefined || v === null) ? "" : String(v);
}

function toISODate(v) {
    const s = safeStr(v).trim();
    return s || "";
}

// Helper to extract List ID/Slug from URL
async function resolveListId(inputUrl) {
    const trimmed = inputUrl.trim();
    // If it's just digits, assume it's the ID
    if (/^\d+$/.test(trimmed)) {
        return trimmed;
    }

    try {
        console.log("Resolving MDBList ID from URL: " + trimmed);
        const res = await Widget.http.get(trimmed, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
            }
        });

        const html = res.data;
        if (!html) throw new Error("Empty response from MDBList");

        // Strategy 1: Look for specific Next.js page data pattern
        // "list":{"id":12345
        const nextJsMatch = html.match(/"list"\s*:\s*\{\s*"id"\s*:\s*(\d+)/i);
        if (nextJsMatch && nextJsMatch[1]) return nextJsMatch[1];

        // Strategy 2: Look for generic list_id patterns
        const idMatch = html.match(/"list_id"\s*:\s*(\d+)/i) ||
            html.match(/data-list-id="(\d+)"/i) ||
            html.match(/mdblist:list_id"\s+content="(\d+)"/i);

        if (idMatch && idMatch[1]) {
            return idMatch[1];
        }

        // Strategy 3: Look for JSON-LD or schema
        // "url": "https://mdblist.com/lists/...", "identifier": 12345
        const identifierMatch = html.match(/"identifier"\s*:\s*(\d+)/i);
        if (identifierMatch && identifierMatch[1]) return identifierMatch[1];

        console.log("Regex resolution failed. Trying to assume API accepts Slug or failing gracefully.");

    } catch (e) {
        console.error("Resolve failed detail:", e);
    }

    // Fallback: Extract slug from URL and try that. 
    // Format: .../lists/user/slug
    try {
        const parts = trimmed.split('?')[0].split('/');
        // remove empty trailing
        const cleanParts = parts.filter(p => p.length > 0);
        const slug = cleanParts[cleanParts.length - 1]; // last part

        if (slug) {
            console.log(`Could not find numeric ID, attempting to use slug: ${slug}`);
            return slug; // Hope API accepts slug
        }
    } catch (e2) { }

    throw new Error("Could not find List ID in page HTML. Please enter the numeric List ID directly.");
}


// --- Data Fetching & Formatting ---

async function fetchTmdbDetail(tmdbId, type, language) {
    if (!tmdbId) return null;
    try {
        const path = `${type}/${tmdbId}`;
        const res = await Widget.tmdb.get(path, { params: { language: language } });
        return res;
    } catch (e) {
        console.log(`TMDB fetch failed for ${type}/${tmdbId}: ${e.message}`);
        return null;
    }
}

async function formatMdbData(listItems, language) {
    // listItems from MDBList API: usually array of { title, year, medi_type, tmdb_id, ... }

    // Filter items that have TMDB ID
    const validList = listItems.filter(item => item.tmdb_id);

    // Parallel Enrichment
    const enrichedItems = await Promise.all(validList.map(async (item) => {
        const tmdbId = item.tmdb_id;
        const mediaType = item.mediatype;

        const isMovie = (mediaType === "movie");
        const typeStr = isMovie ? "movie" : "tv";

        // Fetch TMDB
        let tmdbData = await fetchTmdbDetail(tmdbId, typeStr, language);

        // Fallbacks if TMDB fails
        const title = tmdbData ? (tmdbData.title || tmdbData.name) : safeStr(item.title);
        const overview = tmdbData ? tmdbData.overview : "";
        const posterPath = tmdbData ? (tmdbData.poster_path || "") : "";
        const backdropPath = tmdbData ? (tmdbData.backdrop_path || "") : "";

        const rating = tmdbData ? tmdbData.vote_average : (item.score_average ? Number(item.score_average) / 10 : 0);

        const releaseDate = toISODate(tmdbData ? (tmdbData.release_date || tmdbData.first_air_date) : item.release_date);

        // ID Logic: Raw ID for Stream Playback
        const uniqueId = tmdbId;
        const itemType = "tmdb";

        let genreTitle = "";
        if (tmdbData && tmdbData.genres) {
            genreTitle = tmdbData.genres.map(g => g.name).join(", ");
        }

        // Strict Schema matching tmdb.js
        return {
            id: uniqueId,
            type: itemType,
            title: title,
            description: overview,
            releaseDate: releaseDate,
            backdropPath: backdropPath,
            posterPath: posterPath,
            rating: rating,
            mediaType: isMovie ? "movie" : "tv",
            genreTitle: genreTitle
        };
    }));

    return enrichedItems;
}

// --- Main Logic ---

async function fetchMdbList(params) {
    const urlOrId = safeStr(params.url).trim();
    const apiKey = safeStr(params.apiKey).trim();
    const language = safeStr(params.language || "zh-CN");
    const page = parseInt(params.page || 1, 10);

    if (!urlOrId) throw new Error("URL is required.");
    if (!apiKey) throw new Error("MDBList API Key is required.");

    const listId = await resolveListId(urlOrId);
    console.log(`Using List ID: ${listId}`);

    const limit = 20;
    const offset = (page - 1) * limit;
    // If parsing failed but we returned a slug, this API call might fail if MDBList requires numeric ID.
    // But it's worth a try or the user will see the API error.
    const apiUrl = `https://api.mdblist.com/lists/${listId}/items?apikey=${apiKey}&limit=${limit}&offset=${offset}`;

    console.log(`Fetching MDBList Id=${listId} Offset=${offset}...`);

    try {
        const response = await Widget.http.get(apiUrl);

        let data = response && response.data;
        if (typeof data === "string") {
            try { data = JSON.parse(data); } catch (e) { }
        }

        if (!Array.isArray(data)) {
            console.error("MDBList Response:", data);
            if (data && data.error) throw new Error("MDBList API Error: " + data.error);
            throw new Error("Invalid response from MDBList API.");
        }

        return await formatMdbData(data, language);

    } catch (error) {
        console.error("MDBList widget failed:", error);
        throw error;
    }
}

// --- Module Functions ---

async function customList(params) {
    return await fetchMdbList(params);
}
