WidgetMetadata = {
    id: "forward.trakt",
    title: "Trakt",
    author: "Forward User",
    version: "1.0.0",
    requiredVersion: "0.0.1",
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
        functionName: "searchImpl",
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

const TRAKT_CLIENT_ID = "06b6df28ce91aafbbedb1452531ef1e18d3404777e6591eafba904b46cd4ca6e"; // Replace with your Trakt Client ID
const TRAKT_API_URL = "https://api.trakt.tv";

async function fetchTrakt(endpoint, params = {}) {
    const url = `${TRAKT_API_URL}/${endpoint}`;

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

            const tmdbId = traktObj.ids?.tmdb;

            if (!tmdbId || !type) {
                return null; // Skip if no TMDB ID
            }

            // Fetch from TMDB using Widget.tmdb
            const tmdbApi = `${type}/${tmdbId}`;
            const tmdbParams = { language: "zh-CN" };

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
                    type: "tmdb",
                    title: tmdbData.title ?? tmdbData.name,
                    description: tmdbData.overview,
                    releaseDate: tmdbData.release_date ?? tmdbData.first_air_date,
                    backdropPath: tmdbData.backdrop_path,
                    posterPath: tmdbData.poster_path,
                    rating: tmdbData.vote_average,
                    mediaType: type,
                };
            }

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
    const endpoint = `movies/boxoffice`;
    const traktData = await fetchTrakt(endpoint);
    return await hydrateWithTmdb(traktData, 'movie');
}

async function searchImpl(params) {
    const type = params.type || 'movie';
    const page = params.page || 1;
    const query = params.keyword || params.title || params.query;

    if (!query) return [];

    const traktType = type === 'movie' ? 'movie' : 'show';
    const endpoint = `search/${traktType}`;

    const traktData = await fetchTrakt(endpoint, { query: query, page: page, limit: 20 });
    return await hydrateWithTmdb(traktData, type);
}
