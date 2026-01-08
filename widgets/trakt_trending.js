var WidgetMetadata = {
  id: "trakt_trending",
  title: "Trakt Trending",
  description: "Browse trending movies/shows from Trakt.",
  author: "ForwardWidget User",
  site: "https://trakt.tv/",
  version: "1.0.0",
  requiredVersion: "0.0.1",
  modules: [
    {
      title: "Trending",
      description: "Trending movies or shows on Trakt.",
      requiresWebView: false,
      functionName: "trending",
      sectionMode: false,
      params: [
        {
          name: "clientId",
          title: "Trakt Client ID",
          type: "input",
          description: "Your Trakt app Client ID (public).",
          value: "",
          placeholders: [
            { title: "Paste your client_id here", value: "06b6df28ce91aafbbedb1452531ef1e18d3404777e6591eafba904b46cd4ca6e" }
          ]
        },
        {
          name: "type",
          title: "Type",
          type: "enumeration",
          description: "Trending movies or shows.",
          value: "movies",
          enumOptions: [
            { title: "Movies", value: "movies" },
            { title: "Shows", value: "shows" }
          ]
        },
        {
          name: "limit",
          title: "Limit",
          type: "count",
          description: "Number of items to return.",
          value: 20
        },
        {
          name: "extended",
          title: "Extended",
          type: "enumeration",
          description: "Use 'full' for more fields (overview, runtime, etc.).",
          value: "full",
          enumOptions: [
            { title: "Full", value: "full" },
            { title: "Min", value: "min" }
          ]
        }
      ]
    }
  ]
};

function clampInt(n, min, max, fallback) {
  const x = parseInt(n, 10);
  if (Number.isNaN(x)) return fallback;
  return Math.max(min, Math.min(max, x));
}

function safeStr(v) {
  return (v === undefined || v === null) ? "" : String(v);
}

function toISODate(v) {
  // Trakt often returns YYYY-MM-DD
  const s = safeStr(v).trim();
  return s || "";
}

function buildTraktHeaders(clientId) {
  return {
    "Content-Type": "application/json",
    "trakt-api-version": "2",
    "trakt-api-key": clientId
  };
}

function makeTmdbId(mediaType, tmdbId) {
  if (!tmdbId) return "";
  return mediaType + "." + String(tmdbId);
}

function mapTrendingItem(item, type) {
  // Response items look like: { watchers: n, movie: {...} } or { watchers: n, show: {...} }
  const mediaType = (type === "shows") ? "tv" : "movie";
  const obj = (type === "shows") ? item.show : item.movie;

  const title = safeStr(obj && obj.title);
  const year = obj && obj.year;

  const ids = (obj && obj.ids) || {};
  const tmdb = ids.tmdb;

  // ForwardWidget wants tmdb id composed like tv.123 or movie.234 when type == tmdb
  const tmdbComposed = makeTmdbId(mediaType, tmdb);

  // Trakt does not provide poster/backdrop URLs directly.
  // Use TMDB-based id and let the app resolve images if it supports TMDB enrichment.

  return {
    id: tmdbComposed || safeStr(ids.imdb) || safeStr(ids.trakt) || title,
    type: tmdbComposed ? "tmdb" : (ids.imdb ? "imdb" : "url"),
    title: year ? (title + " (" + year + ")") : title,
    posterPath: "",
    backdropPath: "",
    releaseDate: toISODate(obj && (obj.released || obj.first_aired)),
    mediaType: mediaType,
    rating: obj && obj.rating != null ? String(obj.rating) : "",
    genreTitle: Array.isArray(obj && obj.genres) ? obj.genres.join(", ") : "",
    duration: obj && obj.runtime != null ? Number(obj.runtime) : undefined,
    durationText: "",
    previewUrl: "",
    videoUrl: "",
    link: ids && ids.slug ? ("https://trakt.tv/" + mediaType + "s/" + ids.slug) : "",
    description: safeStr(obj && obj.overview),
    childItems: []
  };
}

async function trending(params = {}) {
  try {
    const clientId = safeStr(params.clientId).trim();
    if (!clientId) {
      throw new Error("Missing Trakt Client ID (clientId). Create an app on trakt.tv and paste the Client ID.");
    }

    const type = (safeStr(params.type).trim() === "shows") ? "shows" : "movies";
    const limit = clampInt(params.limit, 1, 100, 20);
    const extended = (safeStr(params.extended).trim() === "min") ? "min" : "full";

    const url = `https://api.trakt.tv/${type}/trending?limit=${encodeURIComponent(limit)}&extended=${encodeURIComponent(extended)}`;

    const response = await Widget.http.get(url, {
      headers: {
        ...buildTraktHeaders(clientId),
        "User-Agent": "ForwardWidget/TraktTrending (compatible; +https://trakt.tv)"
      }
    });

    const data = response && response.data;

    // Some environments auto-parse JSON, others return string.
    const list = (typeof data === "string") ? JSON.parse(data) : data;

    if (!Array.isArray(list)) {
      throw new Error("Unexpected response from Trakt trending endpoint.");
    }

    return list.map(it => mapTrendingItem(it, type)).filter(x => x && x.title);
  } catch (error) {
    console.error("Trakt Trending widget failed:", error);
    throw error;
  }
}
