/**
 * Stremio Addon Client
 * Allows fetching streams from any Stremio v3 compliant addon.
 */
WidgetMetadata = {
  id: "forward.stremio",
  title: "Stremio Client",
  version: "1.0.0",
  requiredVersion: "0.0.1",
  description: "Fetch streams from Stremio Addons",
  author: "Forward",
  site: "https://github.com/InchStudio/ForwardWidgets",
  icon: "https://stremio.com/website/stremio-logo-small.png",
  // Global configuration for the Addon URL
  globalParams: [
    {
      name: "addonUrl",
      title: "Addon Base URL",
      type: "input",
      description: "The base URL of the Stremio Addon (excluding manifest.json).",
      value: "https://aio.lootah.app/stremio/2fdb409b-6f1d-422d-8726-f8b803d86340/eyJpIjoicjZtcXNxTEhFYnNNVWRHNUZsM3ZjQT09IiwiZSI6Ikh0Z0dJREpmVmNhSytNM2R5TDhkaHpRQ1JzOUd4Qis0OWtadksvckxzUlU9IiwidCI6ImEifQ"
    }
  ],
  modules: [
    {
      id: "loadResource",
      title: "Load Streams",
      functionName: "loadResource",
      type: "stream",
      params: []
    }
  ],
};

async function loadResource(params) {
  const { 
    addonUrl, 
    imdbId, 
    type, 
    season, 
    episode 
  } = params;

  if (!addonUrl) {
    throw new Error("Please configure the Stremio Addon URL in settings.");
  }

  const stremioType = type === 'tv' ? 'series' : 'movie';
  let stremioId = imdbId;
  
  if (!stremioId && params.tmdbId) {
      stremioId = `tmdb:${params.tmdbId}`;
  }

  if (!stremioId) {
      console.log("No IMDB or TMDB ID provided.");
      return [];
  }

  if (stremioType === 'series') {
    const s = season || 1;
    const e = episode || 1;
    stremioId = `${stremioId}:${s}:${e}`;
  }

  let baseUrl = addonUrl.replace(/\/manifest\.json$/, '').replace(/\/$/, '');
  const url = `${baseUrl}/stream/${stremioType}/${stremioId}.json`;

  try {
    const response = await Widget.http.get(url, {
      headers: {
        "User-Agent": "ForwardWidgets/1.0.0"
      }
    });

    if (!response || !response.data || !response.data.streams) {
      return [];
    }

    return response.data.streams.map(stream => {
      let streamUrl = stream.url;
      if (!streamUrl && stream.infoHash) {
        streamUrl = `magnet:?xt=urn:btih:${stream.infoHash}`;
      }
      
      // AioStream often puts the source (e.g. Torrentio) in 'name' 
      // and quality info in 'title'
      const name = stream.name || "Stream";
      const description = stream.title || "";

      return {
        name: name,
        description: description,
        url: streamUrl,
      };
    });

  } catch (error) {
    console.error(`Failed to fetch streams: ${error.message}`);
    return [];
  }
}
