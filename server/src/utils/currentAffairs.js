import crypto from "crypto";
import CurrentAffairQuestion from "../models/CurrentAffairQuestion.js";

const INDIA_RSS_FEEDS = [
  { provider: "PIB", url: "https://pib.gov.in/rss.aspx?feed=latestnews", type: "xml" },
  { provider: "DD News", url: "https://ddnews.gov.in/en/feed/", type: "xml" }
];

const STATE_RSS_FEEDS = [
  { provider: "PIB Rajasthan", url: "https://www.pib.gov.in/RssMain.aspx?ModId=6&Lang=1&Regid=6", type: "xml" },
  { provider: "PIB Maharashtra", url: "https://www.pib.gov.in/RssMain.aspx?ModId=6&Lang=1&Regid=3", type: "xml" },
  { provider: "PIB Uttar Pradesh", url: "https://www.pib.gov.in/RssMain.aspx?ModId=6&Lang=1&Regid=11", type: "xml" }
];

const MAX_SOURCE_ITEMS = 40;
const MAX_GENERATED_PER_REQUEST = 18;

const escapeXml = (value = "") =>
  value
    .replace(/<!\[CDATA\[(.*?)\]\]>/gs, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();

const toDateKey = (value = new Date()) => {
  const date = value instanceof Date ? value : new Date(value);
  return date.toISOString().slice(0, 10);
};

const normalizeStateName = (value = "") => value.trim().toLowerCase();

const buildSourceHash = (source, language, category, stateName) =>
  crypto
    .createHash("sha1")
    .update(
      JSON.stringify({
        language,
        category,
        stateName,
        title: source.title,
        url: source.url,
        publishedAt: source.publishedAt
      })
    )
    .digest("hex");

const safeJson = async (response) => {
  try {
    return await response.json();
  } catch (error) {
    return null;
  }
};

const fetchJsonNews = async (url, mapper) => {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "ExamPlatformCurrentAffairs/1.0"
    }
  });

  if (!response.ok) {
    throw new Error(`Failed news fetch: ${response.status}`);
  }

  const payload = await safeJson(response);
  return Array.isArray(payload?.articles) || Array.isArray(payload?.news)
    ? mapper(payload)
    : [];
};

const fetchRssFeed = async ({ provider, url }) => {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "ExamPlatformCurrentAffairs/1.0"
    }
  });

  if (!response.ok) {
    throw new Error(`Failed rss fetch: ${response.status}`);
  }

  const xml = await response.text();
  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((match) => {
    const block = match[1];
    const readTag = (tag) => {
      const tagMatch = block.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, "i"));
      return escapeXml(tagMatch?.[1] || "");
    };

    return {
      title: readTag("title"),
      description: readTag("description"),
      url: readTag("link"),
      publishedAt: readTag("pubDate") || new Date().toISOString(),
      provider
    };
  });

  return items.filter((item) => item.title && item.url);
};

const dedupeSources = (sources = []) => {
  const seen = new Set();

  return sources.filter((source) => {
    const key = `${source.url}|${source.title}`;
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
};

const buildSearchTerms = ({ category, stateName, language }) => {
  const state = stateName?.trim();
  const localeTerm = language === "hindi" ? "Hindi" : "English";

  if (category === "state" && state) {
    return [`${state} current affairs`, `${state} government news`, `${state} latest updates ${localeTerm}`];
  }

  return ["India current affairs", "India government news", `India latest updates ${localeTerm}`];
};

const fetchApiSources = async (config) => {
  const searchTerms = buildSearchTerms(config);
  const tasks = [];

  if (process.env.GNEWS_API_KEY) {
    tasks.push(
      ...searchTerms.map((term) =>
        fetchJsonNews(
          `https://gnews.io/api/v4/search?q=${encodeURIComponent(term)}&lang=en&max=10&token=${process.env.GNEWS_API_KEY}`,
          (payload) =>
            (payload.articles || []).map((article) => ({
              title: article.title,
              description: article.description || article.content || "",
              url: article.url,
              publishedAt: article.publishedAt || new Date().toISOString(),
              provider: "GNews"
            }))
        ).catch(() => [])
      )
    );
  }

  if (process.env.NEWS_API_KEY) {
    tasks.push(
      ...searchTerms.map((term) =>
        fetchJsonNews(
          `https://newsapi.org/v2/everything?q=${encodeURIComponent(term)}&pageSize=10&sortBy=publishedAt&apiKey=${process.env.NEWS_API_KEY}`,
          (payload) =>
            (payload.articles || []).map((article) => ({
              title: article.title,
              description: article.description || article.content || "",
              url: article.url,
              publishedAt: article.publishedAt || new Date().toISOString(),
              provider: "NewsAPI"
            }))
        ).catch(() => [])
      )
    );
  }

  if (process.env.CURRENTS_API_KEY) {
    tasks.push(
      ...searchTerms.map((term) =>
        fetchJsonNews(
          `https://api.currentsapi.services/v1/search?keywords=${encodeURIComponent(term)}&language=en&apiKey=${process.env.CURRENTS_API_KEY}`,
          (payload) =>
            (payload.news || []).map((article) => ({
              title: article.title,
              description: article.description || article.snippet || "",
              url: article.url,
              publishedAt: article.published || new Date().toISOString(),
              provider: "Currents"
            }))
        ).catch(() => [])
      )
    );
  }

  const groups = await Promise.all(tasks);
  return groups.flat();
};

const fetchRssSources = async (config) => {
  const feeds = config.category === "state" ? [...STATE_RSS_FEEDS, ...INDIA_RSS_FEEDS] : INDIA_RSS_FEEDS;
  const groups = await Promise.all(feeds.map((feed) => fetchRssFeed(feed).catch(() => [])));
  const sources = groups.flat();

  if (config.category !== "state" || !config.stateName) {
    return sources;
  }

  const stateNeedle = normalizeStateName(config.stateName);
  const stateMatches = sources.filter((source) =>
    `${source.title} ${source.description}`.toLowerCase().includes(stateNeedle)
  );

  return stateMatches.length ? stateMatches : sources;
};

const buildFallbackQuestion = (source, config) => {
  const eventDate = source.publishedAt ? new Date(source.publishedAt) : new Date();
  const cleanDate = eventDate.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
  const summary = source.description?.trim() || source.title;
  const promptLead =
    config.language === "hindi"
      ? `हाल की करंट अफेयर्स रिपोर्ट के अनुसार, ${source.title} से जुड़ा सही कथन कौन सा है?`
      : `According to the current affairs update, which statement best matches "${source.title}"?`;

  const correctText =
    config.language === "hindi"
      ? `${summary} यह घटना ${cleanDate} की रिपोर्ट में प्रमुख रही।`
      : `${summary} This was highlighted in the report dated ${cleanDate}.`;

  const distractors =
    config.language === "hindi"
      ? [
          `यह खबर केवल खेल कैलेंडर में संभावित कार्यक्रम के रूप में आई थी।`,
          `यह रिपोर्ट किसी निजी मनोरंजन सर्वे से संबंधित थी, सरकारी या राष्ट्रीय अपडेट से नहीं।`,
          `यह कथन गलत है क्योंकि इसमें घटना की जगह और तारीख दोनों बदल दिए गए हैं।`
        ]
      : [
          "This update was only about a sports schedule preview and not the reported event itself.",
          "This referred to a private entertainment survey rather than the public affairs development described here.",
          "This statement is inaccurate because it changes both the date and context of the reported event."
        ];

  return {
    question: promptLead,
    options: [correctText, ...distractors].map((text) => ({ text })),
    correctOptionIndex: 0,
    explanation:
      config.language === "hindi"
        ? `${source.title} ${summary}`
        : `${source.title} ${summary}`,
    eventDate,
    difficulty: "medium"
  };
};

const generateWithOpenAI = async (source, config) => {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }

  const response = await fetch(`${process.env.OPENAI_BASE_URL || "https://api.openai.com/v1"}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      temperature: 0.4,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You turn current affairs articles into one high-quality exam MCQ. Return JSON with keys: question, options, correctOptionIndex, explanation, eventDate, difficulty. Options must be an array of exactly 4 strings. correctOptionIndex must be 0-3."
        },
        {
          role: "user",
          content: JSON.stringify({
            language: config.language,
            category: config.category,
            stateName: config.stateName || "",
            articleTitle: source.title,
            articleDescription: source.description,
            articleDate: source.publishedAt,
            sourceProvider: source.provider
          })
        }
      ]
    })
  });

  if (!response.ok) {
    throw new Error(`OpenAI generation failed: ${response.status}`);
  }

  const payload = await response.json();
  const content = payload.choices?.[0]?.message?.content;

  if (!content) {
    return null;
  }

  const parsed = JSON.parse(content);
  const options = Array.isArray(parsed.options) ? parsed.options.slice(0, 4).map((text) => ({ text: String(text).trim() })) : [];

  if (!parsed.question || options.length !== 4 || !Number.isInteger(parsed.correctOptionIndex)) {
    return null;
  }

  return {
    question: String(parsed.question).trim(),
    options,
    correctOptionIndex: parsed.correctOptionIndex,
    explanation: String(parsed.explanation || "").trim(),
    eventDate: parsed.eventDate ? new Date(parsed.eventDate) : source.publishedAt ? new Date(source.publishedAt) : null,
    difficulty: String(parsed.difficulty || "medium").trim().toLowerCase()
  };
};

const buildQuestionRecord = async (source, config) => {
  let generated = null;

  try {
    generated = await generateWithOpenAI(source, config);
  } catch (error) {
    generated = null;
  }

  const fallback = generated || buildFallbackQuestion(source, config);

  return {
    cacheDateKey: toDateKey(),
    sourceHash: buildSourceHash(source, config.language, config.category, config.stateName),
    language: config.language,
    category: config.category,
    stateName: config.stateName || "",
    question: fallback.question,
    options: fallback.options,
    correctOptionIndex: fallback.correctOptionIndex,
    explanation: fallback.explanation,
    eventDate: fallback.eventDate,
    sourceTitle: source.title,
    sourceUrl: source.url,
    sourceProvider: source.provider,
    difficulty: fallback.difficulty || "medium",
    sourceSummary: source.description || "",
    tags: [config.category, config.stateName || "india", config.language].filter(Boolean)
  };
};

const normalizeQuestionCount = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return 10;
  }

  return Math.min(Math.max(Math.round(parsed), 1), 100);
};

export const getCurrentAffairsConfig = () => ({
  languages: [
    { value: "hindi", label: "Hindi" },
    { value: "english", label: "English" }
  ],
  categories: [
    { value: "state", label: "State Current Affairs" },
    { value: "india", label: "India Current Affairs" }
  ],
  questionPresets: [10, 20, 50, 100],
  timerPresets: [10, 20, 50, 100, 160],
  maxTimerMinutes: 160,
  maxSkips: 5,
  defaultNegativeMarking: 0.25,
  states: [
    "Andhra Pradesh",
    "Assam",
    "Bihar",
    "Chhattisgarh",
    "Delhi",
    "Gujarat",
    "Haryana",
    "Jharkhand",
    "Karnataka",
    "Kerala",
    "Madhya Pradesh",
    "Maharashtra",
    "Odisha",
    "Punjab",
    "Rajasthan",
    "Tamil Nadu",
    "Telangana",
    "Uttar Pradesh",
    "Uttarakhand",
    "West Bengal"
  ]
});

export const validateCurrentAffairsRequest = (payload = {}) => {
  const language = payload.language === "hindi" ? "hindi" : "english";
  const category = payload.category === "state" ? "state" : "india";
  const stateName = category === "state" ? String(payload.stateName || "").trim() : "";
  const questionCount = normalizeQuestionCount(payload.questionCount);
  const duration = Math.min(Math.max(Number(payload.duration) || 10, 1), 160);

  if (category === "state" && !stateName) {
    throw new Error("Please select a state for state current affairs.");
  }

  return {
    language,
    category,
    stateName,
    questionCount,
    duration
  };
};

export const getCurrentAffairsCacheKey = (config) =>
  [toDateKey(), config.language, config.category, normalizeStateName(config.stateName || "india")].join(":");

export const ensureCurrentAffairQuestionPool = async (config) => {
  const cacheDateKey = toDateKey();
  const lookup = {
    cacheDateKey,
    language: config.language,
    category: config.category,
    stateName: config.stateName || ""
  };

  let cached = await CurrentAffairQuestion.find(lookup).sort({ createdAt: -1 }).lean();
  if (cached.length >= config.questionCount) {
    return cached;
  }

  const fetchedSources = dedupeSources([...(await fetchApiSources(config)), ...(await fetchRssSources(config))])
    .filter((source) => source.title && source.url)
    .slice(0, MAX_SOURCE_ITEMS);

  const existingHashes = new Set(cached.map((item) => item.sourceHash));
  const freshSources = fetchedSources
    .filter((source) => !existingHashes.has(buildSourceHash(source, config.language, config.category, config.stateName)))
    .slice(0, MAX_GENERATED_PER_REQUEST);

  const records = [];
  for (const source of freshSources) {
    const record = await buildQuestionRecord(source, config);
    records.push(record);
  }

  if (records.length) {
    await CurrentAffairQuestion.insertMany(records, { ordered: false }).catch(() => undefined);
  }

  cached = await CurrentAffairQuestion.find(lookup).sort({ createdAt: -1 }).lean();

  if (cached.length >= config.questionCount) {
    return cached;
  }

  const fallbackWindow = await CurrentAffairQuestion.find({
    language: config.language,
    category: config.category,
    stateName: config.stateName || ""
  })
    .sort({ createdAt: -1 })
    .limit(Math.max(config.questionCount, 30))
    .lean();

  return fallbackWindow;
};

export const pickQuestionsForCurrentAffairsExam = (questionPool, questionCount) => {
  const shuffled = [...questionPool].sort(() => Math.random() - 0.5).slice(0, questionCount);
  return shuffled.map((item) => ({
    prompt: item.question,
    type: "single",
    marks: 1,
    explanation: item.explanation,
    eventDate: item.eventDate,
    currentAffairCategory: item.category,
    sourceTitle: item.sourceTitle,
    sourceUrl: item.sourceUrl,
    options: item.options.map((option, index) => ({
      _id: crypto.randomUUID(),
      text: option.text,
      isCorrect: index === item.correctOptionIndex
    }))
  }));
};
