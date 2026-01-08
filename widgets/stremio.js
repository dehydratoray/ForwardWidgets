/**
 * Stremio Addon Client
 * Allows fetching streams from your AioStream addon.
 */
WidgetMetadata = {
  id: "forward.stremio",
  title: "Stremio Client",
  version: "1.0.1",
  requiredVersion: "0.0.2",
  description: "Fetch streams from Stremio Addons",
  author: "Forward",
  site: "https://github.com/InchStudio/ForwardWidgets",
  icon: "https://stremio.com/website/stremio-logo-small.png",
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

// Hardcoded Addon URL for stability
const ADDON_URL = "https://aio.lootah.app/stremio/2fdb409b-6f1d-422d-8726-f8b803d86340/eyJpIjoicjZtcXNxTEhFYnNNVWRHNUZsM3ZjQT09IiwiZSI6Ikh0Z0dJREpmVmNhSytNM2R5TDhkaHpRQ1JzOUd4Qis0OWtadksvckxzUlU9IiwidCI6ImEifQ";

async function loadResource(params) {
  const { 
    imdbId, 
    type, 
    season, 
    episode 
  } = params;

  // 1. Prepare ID
  const stremioType = type === 'tv' ? 'series' : 'movie';
  let stremioId = imdbId;
  
  // Fallback to TMDB if IMDB is missing
  if (!stremioId && params.tmdbId) {
      stremioId = `tmdb:${params.tmdbId}`;
  }

  if (!stremioId) {
      console.log("No IMDB or TMDB ID provided. Cannot fetch Stremio streams.");
      return [];
  }

  if (stremioType === 'series') {
    const s = season || 1;
    const e = episode || 1;
    stremioId = `${stremioId}:${s}:${e}`;
  }

  // 2. Construct URL
  const baseUrl = ADDON_URL.replace(///manifest\.json$/, '').replace(///$/, '');
  const url = `${baseUrl}/stream/${stremioType}/${stremioId}.json`;

  console.log(`Fetching streams from: ${url}`);

  try {
    const response = await Widget.http.get(url, {
      headers: {
        "User-Agent": "ForwardWidgets/1.0.0"
      }
    });

    if (!response || !response.data || !response.data.streams) {
      console.log("No streams found.");
      return [];
    }

    // 3. Map to Forward format
    return response.data.streams.map(stream => {
      let streamUrl = stream.url;
      if (!streamUrl && stream.infoHash) {
        streamUrl = `magnet:?xt=urn:btih:${stream.infoHash}`;
      }
      
      const name = stream.name || "Stream";
      const description = stream.title ? stream.title.replace(/\n/g, " | ") : "Unknown Quality";

      return {
        name: name,
        description: description,
        url: streamUrl
      };
    });

  } catch (error) {
    console.error(`Error fetching streams: ${error.message}`);
    return [];
  }
}