var WidgetMetadata = {
    id: "forward.trakt",
    title: "Trakt",
    author: "Forward User",
    version: "1.0.0",
    description: "Browse Trending, Popular, and other lists from Trakt",
    modules: [
        {
            id: "trending",
            title: "Trending",
            functionName: "trending",
            params: [
                {
                    name: "type",
                    title: "Type",
                    type: "enumeration",
                    enumOptions: [
                        { title: "Movies", value: "movie" },
                        { title: "TV Shows", value: "tv" }
                    ],
                    value: "movie"
                },
                { name: "page", title: "Page", type: "page" }
            ]
        },
        {
            id: "popular",
            title: "Popular",
            functionName: "popular",
            params: [
                {
                    name: "type",
                    title: "Type",
                    type: "enumeration",
                    enumOptions: [
                        { title: "Movies", value: "movie" },
                        { title: "TV Shows", value: "tv" }
                    ],
                    value: "movie"
                },
                { name: "page", title: "Page", type: "page" }
            ]
        },
        {
            id: "played",
            title: "Most Played",
            functionName: "played",
            params: [
                {
                    name: "type",
                    title: "Type",
                    type: "enumeration",
                    enumOptions: [
                        { title: "Movies", value: "movie" },
                        { title: "TV Shows", value: "tv" }
                    ],
                    value: "movie"
                },
                {
                    name: "period",
                    title: "Period",
                    type: "enumeration",
                    enumOptions: [
                        { title: "Weekly", value: "weekly" },
                        { title: "Monthly", value: "monthly" },
                        { title: "Yearly", value: "yearly" },
                        { title: "All Time", value: "all" }
                    ],
                    value: "weekly"
                },
                { name: "page", title: "Page", type: "page" }
            ]
        },
        {
            id: "watched",
            title: "Most Watched",
            functionName: "watched",
            params: [
                {
                    name: "type",
                    title: "Type",
                    type: "enumeration",
                    enumOptions: [
                        { title: "Movies", value: "movie" },
                        { title: "TV Shows", value: "tv" }
                    ],
                    value: "movie"
                },
                {
                    name: "period",
                    title: "Period",
                    type: "enumeration",
                    enumOptions: [
                        { title: "Weekly", value: "weekly" },
                        { title: "Monthly", value: "monthly" },
                        { title: "Yearly", value: "yearly" },
                        { title: "All Time", value: "all" }
                    ],
                    value: "weekly"
                },
                { name: "page", title: "Page", type: "page" }
            ]
        },
        {
            id: "collected",
            title: "Most Collected",
            functionName: "collected",
            params: [
                {
                    name: "type",
                    title: "Type",
                    type: "enumeration",
                    enumOptions: [
                        { title: "Movies", value: "movie" },
                        { title: "TV Shows", value: "tv" }
                    ],
                    value: "movie"
                },
                {
                    name: "period",
                    title: "Period",
                    type: "enumeration",
                    enumOptions: [
                        { title: "Weekly", value: "weekly" },
                        { title: "Monthly", value: "monthly" },
                        { title: "Yearly", value: "yearly" },
                        { title: "All Time", value: "all" }
                    ],
                    value: "weekly"
                },
                { name: "page", title: "Page", type: "page" }
            ]
        },
        {
            id: "anticipated",
            title: "Anticipated",
            functionName: "anticipated",
            params: [
                {
                    name: "type",
                    title: "Type",
                    type: "enumeration",
                    enumOptions: [
                        { title: "Movies", value: "movie" },
                        { title: "TV Shows", value: "tv" }
                    ],
                    value: "movie"
                },
                { name: "page", title: "Page", type: "page" }
            ]
        },
        {
            id: "boxoffice",
            title: "Box Office",
            functionName: "boxOffice",
            params: []
        }
    ],
    search: {
        title: "Search",
        functionName: "searchCommon",
        params: [
            {
                name: "type",
                title: "Type",
                type: "enumeration",
                enumOptions: [
                    { title: "Movies", value: "movie" },
                    { title: "TV Shows", value: "tv" }
                ],
                value: "movie"
            },
            { name: "page", title: "Page", type: "page" }
        ]
    }
};

const TRAKT_CLIENT_ID = "YOUR_TRAKT_CLIENT_ID"; // Replace with your Trakt Client ID
const TRAKT_API_URL = "https://api.trakt.tv";

async function fetchTrakt(endpoint, params = {}) {
    const url = `${TRAKT_API_URL}/${endpoint}`;

    // Convert 'page' param to Trakt pagination if needed
    // Trakt uses page=1, limit=10 default.
    // ForwardWidget usually passes page.

    // Add default headers
    const headers = {
        "Content-Type": "application/json",
        "trakt-api-version": "2",
        "trakt-api-key": TRAKT_CLIENT_ID
    };

    const response = await Widget.http.get(url, {
        headers: headers,
        params: params
    });

    if (!response || !response.data) {
        throw new Error("Trakt API request failed");
    }

    // Trakt returns JSON directly in response.data usually (with axios like wrapper)
    // or as a string if using raw fetch. Assuming automatic JSON parsing like tmdb.js implies.
    // If response.data is string, parse it.
    let data = response.data;
    if (typeof data === "string") {
        try {
            data = JSON.parse(data);
        } catch (e) {
            console.error("Failed to parse Trakt response", e);
            return [];
        }
    }

    return data;
}

async function hydrateWithTmdb(traktItems, forcedType) {
    if (!traktItems || !Array.isArray(traktItems)) return [];

    const hydratedItems = await Promise.all(traktItems.map(async (item) => {
        try {
            // Determine type and IDs
            // Trakt list items might be { movie: {...} }, { show: {...} }, or just { title: ... } depending on endpoint
            // BoxOffice: { revenue:..., movie: {...} }
            // Trending/Popular/etc: { watchers:..., movie: {...} } OR just [{...}, {...}] for Popular?
            // Actually Popular Movies returns array of movies. Trending returns array of objects with 'movie' key.

            let traktObj = item;
            let type = forcedType;

            if (item.movie) {
                traktObj = item.movie;
                type = "movie";
            } else if (item.show) {
                traktObj = item.show;
                type = "tv";
            } else if (item.type === 'movie' && item.movie) {
                traktObj = item.movie;
                type = 'movie';
            } else if (item.type === 'show' && item.show) {
                traktObj = item.show;
                type = 'tv';
            }

            // If we still don't have a reliable type from the object, rely on forcedType
            if (!type) {
                // Infer from ids?
                if (traktObj.ids && traktObj.ids.tmdb) {
                    // Assume movie if not specified? Or wait for metadata.
                    // It's better to rely on what the list *should* contain.
                }
            }

            const tmdbId = traktObj.ids?.tmdb;

            if (!tmdbId || !type) {
                return null; // Skip if no TMDB ID
            }

            // Fetch from TMDB using Widget.tmdb
            const tmdbApi = `${type}/${tmdbId}`;
            const tmdbParams = { language: "zh-CN" }; // Default to Chinese as per tmdb.js, or make configurable? 
            // tmdb.js uses zh-CN.

            // We use try-catch to avoid failing the whole list for one item
            let tmdbData = null;
            try {
                const tmdbRes = await Widget.tmdb.get(tmdbApi, { params: tmdbParams });
                tmdbData = tmdbRes;
            } catch (e) {
                console.log(`Failed to hydrate TMDB ${type}.${tmdbId}`, e);
            }

            if (tmdbData) {
                return {
                    id: tmdbData.id,
                    type: "tmdb", // ForwardWidget uses 'tmdb' type to likely enable internal handling
                    title: tmdbData.title ?? tmdbData.name,
                    description: tmdbData.overview,
                    releaseDate: tmdbData.release_date ?? tmdbData.first_air_date,
                    backdropPath: tmdbData.backdrop_path,
                    posterPath: tmdbData.poster_path,
                    rating: tmdbData.vote_average,
                    mediaType: type,
                    // genreTitle: ... // Could verify genre mapping if needed, but simple is better
                };
            }

            // Fallback if TMDB fails but we have Trakt data? 
            // User requested TMDB metadata specifically. If fail, maybe skip.
            return null;

        } catch (error) {
            console.error("Hydration error", error);
            return null;
        }
    }));

    return hydratedItems.filter(item => item !== null);
}

// Handler functions

async function trending(params) {
    const type = params.type;
    const page = params.page || 1;
    // Trakt API: /movies/trending or /shows/trending
    // endpoint: `${type}s/trending`  (movie -> movies, tv -> shows)
    const endpointType = type === 'movie' ? 'movies' : 'shows';
    const endpoint = `${endpointType}/trending`;

    const traktData = await fetchTrakt(endpoint, { page: page, limit: 20 });
    return await hydrateWithTmdb(traktData, type);
}

async function popular(params) {
    const type = params.type;
    const page = params.page || 1;
    const endpointType = type === 'movie' ? 'movies' : 'shows';
    const endpoint = `${endpointType}/popular`;

    const traktData = await fetchTrakt(endpoint, { page: page, limit: 20 });
    return await hydrateWithTmdb(traktData, type);
}

async function played(params) {
    const type = params.type;
    const period = params.period || 'weekly';
    const page = params.page || 1;
    const endpointType = type === 'movie' ? 'movies' : 'shows';
    const endpoint = `${endpointType}/played/${period}`;

    const traktData = await fetchTrakt(endpoint, { page: page, limit: 20 });
    return await hydrateWithTmdb(traktData, type);
}

async function watched(params) {
    const type = params.type;
    const period = params.period || 'weekly';
    const page = params.page || 1;
    const endpointType = type === 'movie' ? 'movies' : 'shows';
    const endpoint = `${endpointType}/watched/${period}`;

    const traktData = await fetchTrakt(endpoint, { page: page, limit: 20 });
    return await hydrateWithTmdb(traktData, type);
}

async function collected(params) {
    const type = params.type;
    const period = params.period || 'weekly';
    const page = params.page || 1;
    const endpointType = type === 'movie' ? 'movies' : 'shows';
    const endpoint = `${endpointType}/collected/${period}`;

    const traktData = await fetchTrakt(endpoint, { page: page, limit: 20 });
    return await hydrateWithTmdb(traktData, type);
}

async function anticipated(params) {
    const type = params.type;
    const page = params.page || 1;
    const endpointType = type === 'movie' ? 'movies' : 'shows';
    const endpoint = `${endpointType}/anticipated`;

    const traktData = await fetchTrakt(endpoint, { page: page, limit: 20 });
    return await hydrateWithTmdb(traktData, type);
}

async function boxOffice() {
    // Only movies
    const endpoint = `movies/boxoffice`;
    const traktData = await fetchTrakt(endpoint);
    return await hydrateWithTmdb(traktData, 'movie');
}

async function searchCommon(params) {
    const type = params.type || 'movie';
    const page = params.page || 1;
    const query = params.keyword; // System usually passes keyword or title for search?
                                  // Need to check README or tmdb.js for metadata search key.
                                  // tmdb.js doesn't have search implemented in metadata explicitly?
                                  // README says: 
                                  /*
                                    search: {                   // Search function configuration (optional)
                                        title: "Search",
                                        functionName: "search",
                                        params: [/* Search parameter configuration */]
}
                                    Danmu module says: "title: Search keywords".
                                  */
// Assuming the app passes the search query in a param. 
// Usually it's implicitly passed or defined in params.
// If we define params in search, the user input is bound to one of them.
// Actually, looking at README, search params are configuration. But where does the query go?
// "The handler function receives a `params` object ... containing all configured parameter values"
// Usually search input is a special param or passed as `params.keyword` / `params.wd`.
// Let's assume standard behavior or use `params.keyword`.
// Wait, if I define an input type param in search, the user types there.
// But `search` usually has a dedicated search bar in the UI.
// Let's assume the params I defined: type, page. The keyword must be injected.
// Let's check `tmdb.js` ... it doesn't have search!
// `README` says: `search: { ... }`.
// I will assume `params.keyword` is standard for the search query or I should add an input param?
// The README example for Danmu says `title: Search keywords`.
// I'll add a check for `params.keyword` or `params.title`.

// Trakt Search: /search/{type}?query={query}
const traktType = type === 'movie' ? 'movie' : 'show';
const endpoint = `search/${traktType}`;

// We really need the query.
// I'll try to enable "search" module.
// If the system works like others, it might pass `keyword`.
// I'll update params to include `query` just in case, or check arguments.

return await fetchTrakt(endpoint, { query: params.keyword || params.title || params.query, page: page, limit: 20 });
    // Note: Trakt search returns wrappers { type: 'movie', movie: {...} }
    // which compatible with our hydrate function.
}

// We need to export/hydrate search results too
// But wait, `searchCommon` calls `fetchTrakt` which returns data.
// It needs to call `hydrateWithTmdb`.
async function searchCommonWrapper(params) {
    const data = await searchCommon(params);
    return await hydrateWithTmdb(data, params.type);
}

// Update the function name in metadata
WidgetMetadata.search.functionName = "searchImpl";

async function searchImpl(params) {
    const type = params.type || 'movie';
    const page = params.page || 1;
    const query = params.keyword || params.title || params.query; // Heuristic

    if (!query) return [];

    const traktType = type === 'movie' ? 'movie' : 'show';
    const endpoint = `search/${traktType}`;

    const traktData = await fetchTrakt(endpoint, { query: query, page: page, limit: 20 });
    return await hydrateWithTmdb(traktData, type);
}
