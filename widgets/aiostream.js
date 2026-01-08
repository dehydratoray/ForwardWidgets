/**
 * ForwardWidget for Generic Stremio Addons (AIOStream / Torrentio / etc)
 * 
 * This widget acts as a client bridge. It takes Forward's media requests,
 * translates them into Stremio's API format, queries your configured Addon URL,
 * and returns the streamable links (HTTP/Debrid/DAV) to Forward.
 */

WidgetMetadata = {
  id: "forward.stremio.client",
  title: "Stremio/AIOStream Client",
  version: "1.0.0",
  requiredVersion: "0.0.1",
  description: "Connects to any Stremio-compatible Addon (AIOStream, Torrentio, etc) to fetch streams.",
  author: "ForwardUser",
  icon: "https://stremio.com/website/stremio-logo-small.png", 
  modules: [
    {
      id: "loadResource",
      title: "Fetch Streams",
      functionName: "loadStremioStreams",
      type: "stream",
      params: [
        {
          name: "addonUrl",
          title: "Addon Base URL",
          type: "input",
          description: "The base URL of your addon (e.g. https://my-aio-stream.com/manifest.json or just the domain)",
          value: "" 
        }
      ],
    },
  ],
};

async function loadStremioStreams(params) {
  const { imdbId, type, season, episode, addonUrl } = params;

  if (!addonUrl) {
    throw new Error("Addon URL is missing. Please configure it in the widget settings.");
  }
  
  if (!imdbId) {
    // If there is no IMDB ID (e.g. only TMDB), Stremio addons usually fail.
    // Forward usually provides IMDB ID if available.
    console.warn("No IMDB ID provided. Stremio addons require IMDB IDs.");
    return [];
  }

  // --- 1. ID Formatting ---
  // Stremio expects:
  // Movie: "tt1234567"
  // Series: "tt1234567:1:2" (imdbId:season:episode)
  let stremioId = imdbId;
  let stremioType = type;

  if (type === 'tv') {
    stremioType = 'series'; // Stremio uses 'series' instead of 'tv'
    stremioId = `${imdbId}:${season}:${episode}`;
  }

  // --- 2. URL Construction ---
  // Standard Stremio Addon Protocol: {baseUrl}/stream/{type}/{id}.json
  
  // Clean the user input: remove 'manifest.json' and trailing slashes
  let baseUrl = addonUrl.trim();
  if (baseUrl.endsWith('manifest.json')) {
    baseUrl = baseUrl.replace('/manifest.json', '');
  }
  baseUrl = baseUrl.replace(/\/+$/, ''); // Remove trailing slashes

  const requestUrl = `${baseUrl}/stream/${stremioType}/${stremioId}.json`;

  console.log(`[StremioClient] Requesting: ${requestUrl}`);

  // --- 3. Fetching ---
  try {
    const response = await Widget.http.get(requestUrl, {
      headers: {
        "User-Agent": "ForwardWidgets/1.0.0",
        "Accept": "application/json"
      }
    });

    const data = response.data;

    // Validation
    if (!data || !data.streams || !Array.isArray(data.streams)) {
      console.log("[StremioClient] No streams found or invalid response format.");
      return [];
    }

    // --- 4. Mapping to Forward Format ---
    // Forward expects: { name, description, url }
    // Stremio returns: { name, title, url, infoHash... }
    
    return data.streams
      .filter(stream => {
        // Filter out items that Forward can't play directly (like Magnet links without a Debrid resolver)
        // Since you are using AIOStream/Debrid, we expect 'url' to be present.
        return stream.url && stream.url.startsWith('http');
      })
      .map(stream => {
        // Construct a descriptive name
        // stream.name usually holds the provider/quality (e.g. "RD+ 4k")
        // stream.title usually holds the filename or extra details
        let description = stream.title || "";
        
        // Sometimes description has newlines, we can keep them
        return {
          name: stream.name || "Stream",
          description: description,
          url: stream.url
        };
      });

  } catch (error) {
    console.error(`[StremioClient] Error fetching streams: ${error.message}`);
    // Return empty array so the UI doesn't crash, just shows no results
    return [];
  }
}
