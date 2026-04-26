import crypto from "crypto";
import CurrentAffairQuestion from "../models/CurrentAffairQuestion.js";

const CATEGORY_BUCKETS = [
  "government",
  "education",
  "sports",
  "awards",
  "economy",
  "science",
  "environment",
  "culture",
  "bollywood"
];

const INDIA_RSS_FEEDS = [
  { provider: "PIB", url: "https://pib.gov.in/rss.aspx?feed=latestnews" },
  { provider: "DD News", url: "https://ddnews.gov.in/en/feed/" }
];

const STATE_RSS_FEEDS = {
  rajasthan: [{ provider: "PIB Rajasthan", url: "https://www.pib.gov.in/RssMain.aspx?ModId=6&Lang=1&Regid=6" }],
  maharashtra: [{ provider: "PIB Maharashtra", url: "https://www.pib.gov.in/RssMain.aspx?ModId=6&Lang=1&Regid=3" }],
  "uttar pradesh": [{ provider: "PIB Uttar Pradesh", url: "https://www.pib.gov.in/RssMain.aspx?ModId=6&Lang=1&Regid=11" }]
};

const MAX_SOURCE_ITEMS = 80;
const MAX_GENERATED_PER_REQUEST = 28;
const MIN_SOURCE_AGE_DAYS = 3;
const MAX_SOURCE_AGE_DAYS = 45;

const shuffleArray = (items = []) => [...items].sort(() => Math.random() - 0.5);

const normalizeStateName = (value = "") => value.trim().toLowerCase();

const toDateKey = (value = new Date()) => {
  const date = value instanceof Date ? value : new Date(value);
  return date.toISOString().slice(0, 10);
};

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

const parseDate = (value) => {
  const date = value ? new Date(value) : null;
  return date instanceof Date && !Number.isNaN(date?.getTime?.()) ? date : null;
};

const isDateInExamWindow = (value) => {
  const date = parseDate(value);
  if (!date) {
    return false;
  }

  const diffDays = (Date.now() - date.getTime()) / (24 * 60 * 60 * 1000);
  return diffDays >= MIN_SOURCE_AGE_DAYS && diffDays <= MAX_SOURCE_AGE_DAYS;
};

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
  return Array.isArray(payload?.articles) || Array.isArray(payload?.news) ? mapper(payload) : [];
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

const looksLikeStateArticle = (source, stateName) => {
  const needle = normalizeStateName(stateName);
  const content = `${source.title} ${source.description}`.toLowerCase();
  return content.includes(needle);
};

const buildSearchTerms = ({ category, stateName }) => {
  if (category === "state" && stateName) {
    return CATEGORY_BUCKETS.map((bucket) => `${stateName} ${bucket} current affairs government exam`);
  }

  return CATEGORY_BUCKETS.map((bucket) => `India ${bucket} current affairs government exam`);
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
  if (config.category === "state") {
    const feeds = STATE_RSS_FEEDS[normalizeStateName(config.stateName)] || [];
    const groups = await Promise.all(feeds.map((feed) => fetchRssFeed(feed).catch(() => [])));
    return groups.flat();
  }

  const groups = await Promise.all(INDIA_RSS_FEEDS.map((feed) => fetchRssFeed(feed).catch(() => [])));
  return groups.flat();
};

const filterSources = (sources, config) =>
  dedupeSources(sources)
    .filter((source) => source.title && source.url && isDateInExamWindow(source.publishedAt))
    .filter((source) => (config.category === "state" ? looksLikeStateArticle(source, config.stateName) : true))
    .slice(0, MAX_SOURCE_ITEMS);

const buildFallbackQuestion = (source, config) => {
  const eventDate = parseDate(source.publishedAt) || new Date();
  const summary = source.description?.trim() || source.title;

  const prompt =
    config.language === "hindi"
      ? `${source.title} se sambandhit sahi tathya kaun sa hai?`
      : `Which statement about "${source.title}" is correct?`;

  const correctText =
    config.language === "hindi"
      ? summary
      : summary;

  const distractors =
    config.language === "hindi"
      ? [
          "Yah statement ghatna ko galat sector se jodta hai.",
          "Yah option date aur prashasanik context dono badal deta hai.",
          "Yah statement sambandhit report ki jagah kisi anya kshetra ki update batata hai."
        ]
      : [
          "This option links the event to the wrong sector.",
          "This option changes both the date and administrative context.",
          "This option describes a different update from another area."
        ];

  const optionTexts = shuffleArray([correctText, ...distractors]);

  return {
    question: prompt,
    options: optionTexts.map((text) => ({ text })),
    correctOptionIndex: optionTexts.findIndex((text) => text === correctText),
    explanation: summary,
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
      temperature: 0.45,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "Create one important government-exam style current affairs MCQ. Return JSON with question, options, correctOptionIndex, explanation, eventDate, difficulty, tags. The question must be direct, no intro line like 'According to current affairs'. Keep exactly 4 options. The correct answer must not be predictably placed, so randomize where it appears. Prefer important public-affairs facts from sports, bollywood, education, awards, government, economy, science, culture, or environment."
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
  const options = Array.isArray(parsed.options)
    ? parsed.options.slice(0, 4).map((text) => ({ text: String(text).trim() }))
    : [];

  if (!parsed.question || options.length !== 4 || !Number.isInteger(parsed.correctOptionIndex)) {
    return null;
  }

  return {
    question: String(parsed.question).trim(),
    options,
    correctOptionIndex: parsed.correctOptionIndex,
    explanation: String(parsed.explanation || "").trim(),
    eventDate: parsed.eventDate ? new Date(parsed.eventDate) : parseDate(source.publishedAt),
    difficulty: String(parsed.difficulty || "medium").trim().toLowerCase(),
    tags: Array.isArray(parsed.tags) ? parsed.tags.map((item) => String(item).trim()) : []
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
    tags: fallback.tags?.length ? fallback.tags : [config.category, config.stateName || "india", config.language]
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
  defaultNegativeMarking: 0,
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

  return { language, category, stateName, questionCount, duration };
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

  const fetchedSources = filterSources([...(await fetchApiSources(config)), ...(await fetchRssSources(config))], config);
  const existingHashes = new Set(cached.map((item) => item.sourceHash));
  const freshSources = fetchedSources
    .filter((source) => !existingHashes.has(buildSourceHash(source, config.language, config.category, config.stateName)))
    .slice(0, MAX_GENERATED_PER_REQUEST);

  const records = [];
  for (const source of freshSources) {
    records.push(await buildQuestionRecord(source, config));
  }

  if (records.length) {
    await CurrentAffairQuestion.insertMany(records, { ordered: false }).catch(() => undefined);
  }

  cached = await CurrentAffairQuestion.find(lookup).sort({ createdAt: -1 }).lean();
  if (cached.length >= config.questionCount) {
    return cached;
  }

  return CurrentAffairQuestion.find({
    language: config.language,
    category: config.category,
    stateName: config.stateName || ""
  })
    .sort({ createdAt: -1 })
    .limit(Math.max(config.questionCount, 40))
    .lean();
};

export const pickQuestionsForCurrentAffairsExam = (questionPool, questionCount) =>
  shuffleArray(questionPool)
    .slice(0, questionCount)
    .map((item) => ({
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
