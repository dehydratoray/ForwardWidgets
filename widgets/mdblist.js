var WidgetMetadata = {
    id: "forward.mdblist.custom",
    title: "MDBList Custom",
    version: "1.0.2",
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
                    title: "MDBList URL or ID",
                    type: "input",
                    description: "URL or numeric List ID (e.g. 12345)",
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

    // Try scraping first (best effort)
    try {
        console.log("Resolving MDBList ID from URL: " + trimmed);
        const res = await Widget.http.get(trimmed, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
            }
        });

        const html = res.data;
        if (html) {
            // Strategy 1: Next.js data
            const nextJsMatch = html.match(/"list"\s*:\s*\{\s*"id"\s*:\s*(\d+)/i);
            if (nextJsMatch && nextJsMatch[1]) return nextJsMatch[1];

            // Strategy 2: Generic
            const idMatch = html.match(/"list_id"\s*:\s*(\d+)/i) ||
                html.match(/data-list-id="(\d+)"/i) ||
                html.match(/mdblist:list_id"\s+content="(\d+)"/i);
            if (idMatch && idMatch[1]) return idMatch[1];

            // Strategy 3: JSON-LD
            const identifierMatch = html.match(/"identifier"\s*:\s*(\d+)/i);
            if (identifierMatch && identifierMatch[1]) return identifierMatch[1];
        }
    } catch (e) {
        console.log("Auto-resolve failed (likely protection). Falling back to slug.");
    }

    // Fallback: Use the slug from the URL.
    // The API *might* accept the slug, or this simply fails later.
    // But it's better than throwing immediately.
    try {
        // Remove query params
        const noQuery = trimmed.split('?')[0];
        // Split by slash
        const parts = noQuery.split('/');
        // Find last non-empty part
        let slug = "";
        for (let i = parts.length - 1; i >= 0; i--) {
            if (parts[i] && parts[i].length > 0) {
                slug = parts[i];
                break;
            }
        }

        if (slug && slug !== "https:" && slug !== "http:") {
            console.log(`Using slug as ID: ${slug}`);
            return slug;
        }
    } catch (e2) {
        console.error("Slug extraction failed:", e2);
    }

    throw new Error("Could not find List ID. Please find the numeric ID (e.g. 12345) and enter it directly.");
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

    const validList = listItems.filter(item => item.tmdb_id);

    const enrichedItems = await Promise.all(validList.map(async (item) => {
        const tmdbId = item.tmdb_id;
        const mediaType = item.mediatype;

        const isMovie = (mediaType === "movie");
        const typeStr = isMovie ? "movie" : "tv";

        let tmdbData = await fetchTmdbDetail(tmdbId, typeStr, language);

        const title = tmdbData ? (tmdbData.title || tmdbData.name) : safeStr(item.title);
        const overview = tmdbData ? tmdbData.overview : "";
        const posterPath = tmdbData ? (tmdbData.poster_path || "") : "";
        const backdropPath = tmdbData ? (tmdbData.backdrop_path || "") : "";
        const rating = tmdbData ? tmdbData.vote_average : (item.score_average ? Number(item.score_average) / 10 : 0);
        const releaseDate = toISODate(tmdbData ? (tmdbData.release_date || tmdbData.first_air_date) : item.release_date);

        let genreTitle = "";
        if (tmdbData && tmdbData.genres) {
            genreTitle = tmdbData.genres.map(g => g.name).join(", ");
        }

        return {
            id: tmdbId, // Raw ID
            type: "tmdb",
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
    // Try passing the resolved ID (or slug) to API
    const apiUrl = `https://api.mdblist.com/lists/${listId}/items?apikey=${apiKey}&limit=${limit}&offset=${offset}`;

    console.log(`Fetching MDBList: ${apiUrl}`);

    try {
        const response = await Widget.http.get(apiUrl);

        let data = response && response.data;
        if (typeof data === "string") {
            try { data = JSON.parse(data); } catch (e) { }
        }

        if (!Array.isArray(data)) {
            console.error("MDBList Response:", data);
            if (data && data.error) throw new Error("MDBList API Error: " + data.error);

            // If it's 404/400 often it returns error object or text.
            // If we used a slug and API refused, we land here.
            throw new Error("Invalid response. If using a URL, the numeric ID might be required. Please find the ID (e.g. 12345) and enter it instead.");
        }

        return await formatMdbData(data, language);

    } catch (error) {
        console.error("MDBList API call failed:", error);
        throw error;
    }
}

// --- Module Functions ---

async function customList(params) {
    return await fetchMdbList(params);
}
