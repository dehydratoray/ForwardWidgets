/**
 * ForwardWidgets / AIOStreams Best-Practice Template
 * - type: stream | subtitle
 * - returns: Array only
 * - safe: timeouts, validation, dedupe, sorting
 */

const WidgetMetadata = {
  id: "forward.meta.bestpractice",
  title: "BEST PRACTICE",
  icon: "https://assets.vvebo.vip/scripts/icon.png",
  version: "1.0.0",
  requiredVersion: "0.0.1",
  description: "AIOStreams-friendly streams & subtitles template",
  author: "Forward",
  site: "https://github.com/InchStudio/ForwardWidgets",
  modules: [
    {
      id: "loadResource",
      title: "Load Resources",
      functionName: "loadResource",
      type: "stream",
      params: [],
    },
    {
      id: "loadSubtitle",
      title: "Load Subtitles",
      functionName: "loadSubtitle",
      type: "subtitle",
      params: [],
    },
  ],
};

/* ----------------------------- Helpers ----------------------------- */

function normalizeParams(params = {}) {
  const p = {
    tmdbId: params.tmdbId ?? null,
    imdbId: params.imdbId ?? null,
    mediaId: params.id ?? null,
    type: params.type ?? null, // "tv" | "movie"
    seriesName: params.seriesName ?? null,
    episodeName: params.episodeName ?? null,
    season: params.season ?? null,
    episode: params.episode ?? null,
    link: params.link ?? null,
  };

  // normalize numbers
  if (typeof p.season === "string" && p.season.trim() !== "") p.season = Number(p.season);
  if (typeof p.episode === "string" && p.episode.trim() !== "") p.episode = Number(p.episode);

  const isTv = p.type === "tv";
  const isMovie = p.type === "movie";

  // For TV, require season/episode to avoid wrong matching
  if (isTv && (!Number.isFinite(p.season) || !Number.isFinite(p.episode))) {
    return { ok: false, reason: "TV request missing season/episode", p };
  }

  if (!isTv && !isMovie) {
    return { ok: false, reason: "Unknown media type", p };
  }

  // prefer tmdbId then imdbId then mediaId
  const key = p.tmdbId || p.imdbId || p.mediaId;
  if (!key) {
    return { ok: false, reason: "No tmdbId/imdbId/id provided", p };
  }

  return { ok: true, p };
}

function withTimeout(promise, ms = 10000) {
  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;

  const timeout = new Promise((_, reject) => {
    const t = setTimeout(() => {
      if (controller) controller.abort();
      reject(new Error(`Timeout after ${ms}ms`));
      clearTimeout(t);
    }, ms);
  });

  // If fetch supports signal, use it (optional)
  if (controller && promise && typeof promise === "object" && typeof promise.then === "function") {
    return Promise.race([promise, timeout]);
  }
  return Promise.race([promise, timeout]);
}

function safeUrl(u) {
  try {
    const url = new URL(u);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Builds AIOStreams-friendly description tokens that are easy to match via SEL/regex.
 * Keep tokens consistent (2160p, 1080p, DV, HDR10, HEVC/x265, etc.)
 */
function buildDescription(meta) {
  const lines = [];

  // line 1: the "token line" (best for regex)
  const tokens = [
    meta.resolution,          // e.g. "2160p"
    meta.codec,               // e.g. "HEVC/x265"
    meta.hdr,                 // e.g. "DV" or "HDR10"
    meta.audio,               // e.g. "TrueHD Atmos 7.1"
  ].filter(Boolean);

  if (tokens.length) lines.push(tokens.join(" | "));

  if (meta.source) lines.push(`Source: ${meta.source}`);
  if (Number.isFinite(meta.seeds)) lines.push(`Seeds: ${meta.seeds}`);
  if (meta.sizeGB) lines.push(`Size: ${meta.sizeGB} GB`);
  if (meta.provider) lines.push(`Provider: ${meta.provider}`);
  if (meta.tier) lines.push(`Tier: ${meta.tier}`); // if you use tiers: "Tier 1" / "Tier 2"

  return lines.join("\n");
}

/* Sorting: resolution > hdr > audio > seeds > smaller size (optional) */
function scoreStream(s) {
  const text = `${s.name || ""} ${s.description || ""}`.toUpperCase();

  const resScore =
    text.includes("2160P") || text.includes("4K") ? 300 :
    text.includes("1080P") ? 200 :
    text.includes("720P")  ? 100 : 0;

  const hdrScore =
    text.includes(" DV ") || text.includes("DOLBY VISION") ? 60 :
    text.includes("HDR10+") ? 55 :
    text.includes("HDR10") ? 50 :
    text.includes("HDR") ? 40 : 0;

  const audioScore =
    (text.includes("TRUEHD") && text.includes("ATMOS")) ? 40 :
    text.includes("ATMOS") ? 35 :
    text.includes("DTS-HD") || text.includes("DTSHD") ? 30 :
    text.includes("DTS") ? 20 :
    text.includes("AAC") ? 10 : 0;

  // parse seeds/size if present in description
  let seeds = 0;
  const mSeeds = (s.description || "").match(/Seeds:\s*(\d+)/i);
  if (mSeeds) seeds = Number(mSeeds[1]) || 0;

  let sizePenalty = 0;
  const mSize = (s.description || "").match(/Size:\s*([\d.]+)\s*GB/i);
  if (mSize) sizePenalty = Number(mSize[1]) || 0;

  return resScore + hdrScore + audioScore + Math.min(seeds, 999) * 0.01 - sizePenalty * 0.02;
}

function dedupeByUrl(items) {
  const seen = new Set();
  const out = [];
  for (const it of items) {
    const u = it && it.url;
    if (!u || !safeUrl(u)) continue;
    if (seen.has(u)) continue;
    seen.add(u);
    out.push(it);
  }
  return out;
}

/* ----------------------------- Implementations ----------------------------- */

async function loadResource(params) {
  const { ok, p, reason } = normalizeParams(params);
  if (!ok) return []; // best practice: return empty list, don't crash

  try {
    // Example: replace this with your real upstream(s)
    // Use withTimeout(fetch(...), 10000) for network calls

    const provider = "MyWidget";

    // DEMO outputs (replace with real resolver results)
    const items = [
      {
        name: "MyWidget • 2160p (DV)",
        description: buildDescription({
          resolution: "2160p",
          codec: "HEVC/x265",
          hdr: "DV",
          audio: "TrueHD Atmos 7.1",
          source: "WEB-DL",
          seeds: 420,
          sizeGB: 18.2,
          provider,
          tier: "Tier 1",
        }),
        url: "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
      },
      {
        name: "MyWidget • 2160p (HDR10)",
        description: buildDescription({
          resolution: "2160p",
          codec: "HEVC/x265",
          hdr: "HDR10",
          audio: "DTS 5.1",
          source: "WEB-DL",
          seeds: 210,
          sizeGB: 14.6,
          provider,
          tier: "Tier 2",
        }),
        url: "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
      },
      {
        name: "MyWidget • 1080p",
        description: buildDescription({
          resolution: "1080p",
          codec: "AVC/x264",
          hdr: "SDR",
          audio: "AAC 2.0",
          source: "WEBRip",
          seeds: 900,
          sizeGB: 3.1,
          provider,
          tier: "Tier 3",
        }),
        url: "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
      },
    ];

    const cleaned = dedupeByUrl(items).sort((a, b) => scoreStream(b) - scoreStream(a));

    // OPTIONAL: if TV, you could append SxxEyy tags to name/description for clarity
    // if (p.type === "tv") { ... }

    return cleaned;
  } catch (e) {
    // best practice: swallow errors, return empty array
    return [];
  }
}

async function loadSubtitle(params) {
  const { ok, p } = normalizeParams(params);
  if (!ok) return [];

  try {
    // Replace with your real subtitle fetch logic
    const subs = [
      {
        id: "sub-en-1",
        title: "English (SRT) • MyWidget",
        lang: "en",
        count: 100, // if this is rating/downloads, reflect it in title/description in your system
        url: "https://dl.subhd.tv/2025/08/1754195078288.srt",
      },
    ];

    // Validate URLs + dedupe
    const out = [];
    const seen = new Set();
    for (const s of subs) {
      if (!s || !s.url || !safeUrl(s.url)) continue;
      const key = `${s.lang || ""}::${s.url}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(s);
    }

    return out;
  } catch {
    return [];
  }
}
