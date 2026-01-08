var WidgetMetadata = {
    id: "forward.mdblist.custom",
    title: "MDBList Custom",
    version: "1.0.0",
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
// URL format: https://mdblist.com/lists/{user}/{slug}
// API expects {id} which is the numeric ID... actually usually scraping is needed to find ID from slug if API doesn't support slug.
// BUT typically third party APIs for these sites might accept the numeric ID.
// Let's try to assume the API might need the numeric ID.
// If the user pastes a URL, we might need to resolve it?
// Research indicates MDBList API `/lists/{id}` usually wants the numeric ID.
// However, finding the numeric ID from the URL is hard without scraping the HTML first.
// I will implement a "Resolve" step: 
// 1. If input looks like a number, use it.
// 2. If input is a URL, fetch the HTML of that URL to find the `list_id` or similar metadata.
//    Usually meta tag: <meta property="mdblist:list_id" content="12345" /> or similar. 
//    Or JSON-LD?
// Let's add a robust resolver.

async function resolveListId(inputUrl) {
    const trimmed = inputUrl.trim();
    // If it's just digits, assume it's the ID
    if (/^\d+$/.test(trimmed)) {
        return trimmed;
    }

    // Otherwise, fetch the page to find the ID
    try {
        console.log("Resolving MDBList ID from URL: " + trimmed);
        const res = await Widget.http.get(trimmed, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
            }
        });

        const html = res.data;
        if (!html) throw new Error("Empty response from MDBList");

        // Try regex for ID. Common patterns in these sites:
        // "id": 12345
        // list_id = 12345
        // /lists/12345/items

        // MDBList HTML usually contains JSON data or meta tags.
        // Let's try a few regexes.

        // 1. Look for canonical link or similar with numeric ID? No, URLs are slugs.
        // 2. Look for JSON state?
        // 3. Look for "id":\s*(\d+) inside some context.

        // Let's try to find the "list_id": 12345 pattern which often appears in JS objects.
        const idMatch = html.match(/"list_id"\s*:\s*(\d+)/i) || html.match(/data-list-id="(\d+)"/i);

        if (idMatch && idMatch[1]) {
            return idMatch[1];
        }

        throw new Error("Could not find List ID in page HTML. Please enter the numeric List ID directly.");

    } catch (e) {
        console.error("Resolve failed:", e);
        // Fallback: extracts last path segment if it looks like regex, but that's a slug.
        // If API supports slug, great. If not, this will fail.
        // I'll return the numeric extraction attempt or fail.
        throw e;
    }
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
        const mediaType = item.mediatype; // 'movie' or 'show'/'tv'? Check API response keys.

        // MDBList usually returns 'movie' or 'show'.
        const isMovie = (mediaType === "movie");
        const typeStr = isMovie ? "movie" : "tv";

        // Fetch TMDB
        let tmdbData = await fetchTmdbDetail(tmdbId, typeStr, language);

        // Fallbacks if TMDB fails
        const title = tmdbData ? (tmdbData.title || tmdbData.name) : safeStr(item.title);
        const overview = tmdbData ? tmdbData.overview : ""; // MDBList might not give overview in list view
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

        // Strict Schema
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

    // 1. Resolve ID if needed (only on first page or cache resolution? Widget is stateless mostly)
    // We have to resolve every time unless we passed ID. 
    const listId = await resolveListId(urlOrId);
    console.log(`Using List ID: ${listId}`);

    // 2. Fetch List Items
    // Endpoint: https://api.mdblist.com/lists/{id}/items?limit=20&offset=...
    const limit = 20;
    const offset = (page - 1) * limit;
    // sort=rank is default
    const apiUrl = `https://api.mdblist.com/lists/${listId}/items?apikey=${apiKey}&limit=${limit}&offset=${offset}`;

    console.log(`Fetching MDBList Id=${listId} Offset=${offset}...`);

    try {
        const response = await Widget.http.get(apiUrl);
        // Response is usually array directly? Or { uniqueid, ... }?
        // MDBList API docs say "Returns an array of items".

        let data = response && response.data;
        if (typeof data === "string") {
            try { data = JSON.parse(data); } catch (e) { }
        }

        if (!Array.isArray(data)) {
            // Did we get error object?
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
