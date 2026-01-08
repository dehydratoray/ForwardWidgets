var WidgetMetadata = {
    id: "forward.stremio.browser",
    title: "Stremio Addon Browser",
    version: "1.0.0",
    requiredVersion: "0.0.1",
    description: "Browse content from any Stremio Addon (Catalog).",
    author: "ForwardWidget User",
    site: "https://stremio.com",
    modules: [
        {
            id: "browseAddon",
            title: "Browse Addon",
            functionName: "browseAddon",
            params: [
                {
                    name: "manifestUrl",
                    title: "Manifest URL",
                    type: "input",
                    description: "Full URL to manifest.json (e.g. https://cyberflix.elfhosted.com/manifest.json)",
                    value: "",
                    placeholders: [
                        { title: "Cyberflix", value: "https://cyberflix.elfhosted.com/manifest.json" }
                    ]
                },
                {
                    name: "type",
                    title: "Type",
                    type: "enumeration",
                    value: "movie",
                    enumOptions: [
                        { title: "Movies", value: "movie" },
                        { title: "Series", value: "series" }
                    ]
                },
                {
                    name: "catalogId",
                    title: "Catalog ID (Optional)",
                    type: "input",
                    description: "Leave empty to use the first available catalog.",
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

// --- Data Fetching & Formatting ---

async function fetchTmdbDetail(externalId, type, language) {
    if (!externalId) return null;
    try {
        // If it looks like an IMDb ID (tt...), find by external ID
        if (externalId.startsWith("tt")) {
            const findPath = `find/${externalId}`;
            const res = await Widget.tmdb.get(findPath, {
                params: {
                    language: language,
                    external_source: "imdb_id"
                }
            });

            // Result will be under movie_results or tv_results
            if (res) {
                const results = (type === "movie") ? res.movie_results : res.tv_results;
                if (results && results.length > 0) return results[0];

                // Fallback: Check other type just in case
                const other = (type === "movie") ? res.tv_results : res.movie_results;
                if (other && other.length > 0) return other[0];
            }
            return null;
        }

        // If it looks like a TMDB ID (digits), fetch directly (less common from Stremio but possible)
        if (/^\d+$/.test(externalId)) {
            const path = `${type}/${externalId}`;
            const res = await Widget.tmdb.get(path, { params: { language: language } });
            return res;
        }

    } catch (e) {
        console.log(`TMDB fetch failed for ${externalId}: ${e.message}`);
        return null;
    }
    return null;
}

async function formatStremioData(listItems, reqType, language) {
    // listItems: Array of Stremio Meta objects { id, type, name, poster, description... }

    const enrichedItems = await Promise.all(listItems.map(async (item) => {
        // Stremio ID is usually IMDb (tt...) or sometimes Kitsu/other.
        const stremioId = item.id;
        const mediaType = item.type || reqType;

        const isMovie = (mediaType === "movie");
        const tmdbType = isMovie ? "movie" : "tv";

        let tmdbData = await fetchTmdbDetail(stremioId, tmdbType, language);

        const title = tmdbData ? (tmdbData.title || tmdbData.name) : safeStr(item.name);
        const overview = tmdbData ? tmdbData.overview : safeStr(item.description);
        const posterPath = tmdbData ? (tmdbData.poster_path || "") : "";
        const backdropPath = tmdbData ? (tmdbData.backdrop_path || "") : ""; // Stremio 'background' often missing/low res

        const rating = tmdbData ? tmdbData.vote_average : (item.imdbRating ? Number(item.imdbRating) : 0);
        const releaseDate = toISODate(tmdbData ? (tmdbData.release_date || tmdbData.first_air_date) : item.releaseInfo);

        // ID Logic: Prefer Raw TMDB ID for ecosystem compatibility
        let uniqueId = stremioId;
        let itemType = "imdb"; // Default to assuming Stremio ID is IMDb

        if (tmdbData && tmdbData.id) {
            uniqueId = tmdbData.id;
            itemType = "tmdb";
        } else if (stremioId.startsWith("tt")) {
            itemType = "imdb";
        } else {
            itemType = "url"; // Fallback
        }

        let genreTitle = "";
        if (tmdbData && tmdbData.genres) {
            genreTitle = tmdbData.genres.map(g => g.name).join(", ");
        }

        return {
            id: uniqueId,
            type: itemType,
            title: title,
            description: overview,
            releaseDate: releaseDate,
            backdropPath: backdropPath,
            posterPath: posterPath,
            rating: rating,
            mediaType: tmdbType,
            genreTitle: genreTitle
        };
    }));

    return enrichedItems;
}

// --- Main Logic ---

async function browseAddon(params) {
    const manifestUrl = safeStr(params.manifestUrl).trim();
    const type = safeStr(params.type || "movie");
    const catalogIdOverride = safeStr(params.catalogId).trim();
    const language = safeStr(params.language || "zh-CN");
    const page = parseInt(params.page || 1, 10);

    if (!manifestUrl) throw new Error("Manifest URL is required.");

    console.log(`Fetching Manifest: ${manifestUrl}`);

    try {
        // 1. Fetch Manifest
        const manifestRes = await Widget.http.get(manifestUrl);
        let manifest = manifestRes.data;
        if (typeof manifest === "string") {
            try { manifest = JSON.parse(manifest); } catch (e) { }
        }

        if (!manifest || !manifest.catalogs) {
            throw new Error("Invalid Manifest: No catalogs found.");
        }

        // 2. Resolve Catalog
        // Filter catalogs by type
        const relevantCatalogs = manifest.catalogs.filter(c => c.type === type);

        if (relevantCatalogs.length === 0) {
            throw new Error(`No catalogs found for type '${type}'. Available: ${manifest.catalogs.map(c => c.type).join(", ")}`);
        }

        // Pick catalog: Override > First Available
        let selectedCatalog = relevantCatalogs[0];
        if (catalogIdOverride) {
            const found = relevantCatalogs.find(c => c.id === catalogIdOverride);
            if (found) selectedCatalog = found;
            else console.log(`Catalog ID '${catalogIdOverride}' not found, using '${selectedCatalog.id}'`);
        }

        console.log(`Selected Catalog: ${selectedCatalog.name} (ID: ${selectedCatalog.id})`);

        // 3. Construct URL
        // Pattern: {addonUrl}/catalog/{type}/{id}.json 
        // OR       {addonUrl}/catalog/{type}/{id}/skip={skip}.json

        // Need Base URL (Manifest URL minus 'manifest.json')
        let baseUrl = manifestUrl.replace("/manifest.json", "");
        if (baseUrl.endsWith("/")) baseUrl = baseUrl.slice(0, -1);

        // Pagination (Stremio usually uses skip=0, skip=20...)
        // Standard limit is often 100? Or defined in extra?
        // Let's assume standard Stremio pagination logic: skip = (page-1) * 20 (or whatever step)
        // Actually checking extra: separate logic needed?
        // For simplicity, let's just support simple skip if 'skip' is supported.

        let path = `/catalog/${type}/${selectedCatalog.id}`;
        if (page > 1) {
            // Check if catalog supports skip
            const extra = selectedCatalog.extra || [];
            const supportsSkip = extra.some(e => e.name === "skip");

            if (supportsSkip) {
                const limit = 20; // Assumption
                const skip = (page - 1) * limit;
                path += `/skip=${skip}`;
            }
        }
        path += ".json";

        const catalogUrl = baseUrl + path;
        console.log(`Fetching Catalog: ${catalogUrl}`);

        const catRes = await Widget.http.get(catalogUrl);
        let catData = catRes.data;
        if (typeof catData === "string") {
            try { catData = JSON.parse(catData); } catch (e) { }
        }

        if (!catData || !Array.isArray(catData.metas)) {
            console.error("Catalog Response:", catData);
            return [];
        }

        return await formatStremioData(catData.metas, type, language);

    } catch (error) {
        console.error("Stremio Addon Error:", error);
        throw error;
    }
}
