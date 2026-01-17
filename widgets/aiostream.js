/**
 * 示例模块
 * 给 module 指定 type 为 stream 或 subtitle 后，默认会携带以下参数：
 * tmdbId: TMDB ID，Optional
 * imdbId: IMDB ID，Optional
 * id: Media ID，Optional
 * type: 类型，tv | movie
 * seriesName：剧名，Optional
 * episodeName：集名，Optional
 * season: 季，电影时为空，Optional
 * episode: 集，电影时为空，Optional
 * link: 链接，Optional
 */
WidgetMetadata = {
    id: "forward.meta.stremio",
    title: "Stremio AIO",
    icon: "https://stremio.com/website/stremio-logo-small.png",
    version: "1.0.0",
    requiredVersion: "0.0.1",
    description: "演示模块",
    author: "Forward",
    site: "https://github.com/InchStudio/ForwardWidgets",
    modules: [
        {
            //id需固定为getResource
            id: "loadResource",
            title: "加载资源",
            functionName: "loadResource",
            type: "stream",
            params: [],
        },
        {
            //id需固定为getDetail
            id: "loadSubtitle",
            title: "加载字幕",
            functionName: "loadSubtitle",
            type: "subtitle",
            params: [],
        },
    ],
};

async function loadResource(params) {
    const { tmdbId, imdbId, id, type, seriesName, episodeName, season, episode, link } = params;

    // Stremio Addon URL (Hardcoded)
    const ADDON_URL = "https://aio.lootah.app/stremio/39cf7e85-816f-41a5-aeee-175eceb61118/eyJpIjoiYzVjUHFsN1RsWVJxRjdQczIwNU5BUT09IiwiZSI6IlNLTDVyaWYvTzlSN3FMUHNMU1dRRDY5ZitVMHI0Vnl6T0RvODFDQjUweFU9IiwidCI6ImEifQ/manifest.json";

    // Validate ID (Support TMDB & IMDB)
    let stremioId = imdbId;
    let isTmdb = false;

    if (!stremioId) {
        if (tmdbId) {
            stremioId = tmdbId;
            isTmdb = true;
        } else if (id) {
            if (id.startsWith('tt')) {
                stremioId = id;
            } else if (/^\d+$/.test(id)) {
                stremioId = id;
                isTmdb = true;
            } else {
                stremioId = id;
            }
        }
    }

    if (!stremioId) {
        console.error("No compatible ID found");
        return [];
    }

    // Construct Stream ID
    let streamId = stremioId;
    if (isTmdb && !String(stremioId).startsWith('tmdb:')) {
        streamId = `tmdb:${stremioId}`;
    }

    if (type === 'tv' && season && episode) {
        streamId = `${streamId}:${season}:${episode}`;
    }

    // Prepare Request
    let baseUrl = ADDON_URL.replace('/manifest.json', '');
    if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);

    let stremioType = type === 'tv' ? 'series' : 'movie';
    const url = `${baseUrl}/stream/${stremioType}/${streamId}.json`;

    try {
        const response = await Widget.http.get(url, {
            headers: { "Accept": "application/json" }
        });

        const data = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;

        if (!data.streams || !Array.isArray(data.streams)) {
            return [];
        }

        return data.streams.map(stream => ({
            name: stream.title || stream.name || "Stream",
            description: (stream.title || stream.name || "") + "\n" + (stream.behaviorHints ? JSON.stringify(stream.behaviorHints) : ""),
            url: stream.url || ""
        }));
    } catch (e) {
        console.error("Fetch failed", e);
        return [];
    }
}

async function loadSubtitle(params) {
    const { tmdbId, imdbId, id, type, seriesName, episodeName, season, episode, link } = params;

    return [
        {
            id: "test-subtitle",
            title: "测试字幕",
            lang: "en",
            count: 100,
            url: "https://dl.subhd.tv/2025/08/1754195078288.srt",
        },
    ]
}
