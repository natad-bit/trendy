console.log("Starting server...");

const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "..", ".env") });

const express = require("express");
const cors = require("cors");
const cheerio = require("cheerio");
const rp = require("request-promise");
const sqlite3 = require("sqlite3").verbose();

const app = express();
app.use(cors());
app.use(express.json());

const scrapingBeeApiKey = process.env.SCRAPINGBEE_API_KEY;

if (!scrapingBeeApiKey) {
  console.error("Missing SCRAPINGBEE_API_KEY in .env file.");
  process.exit(1);
}

const DB_PATH = path.join(__dirname, "reddit.db");
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error("SQLite connection error:", err.message);
    process.exit(1);
  }
  console.log(`Connected to SQLite database: ${DB_PATH}`);
});

function runQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

function getQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function allQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

async function initDb() {
  await runQuery(`
    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reddit_id TEXT,
      subreddit TEXT NOT NULL,
      title TEXT,
      score TEXT,
      comments TEXT,
      permalink TEXT,
      post_html_id TEXT,
      stored_at TEXT,
      fetched_at TEXT
    )
  `);

  await runQuery(`
    CREATE INDEX IF NOT EXISTS idx_posts_subreddit
    ON posts(subreddit)
  `);

  await runQuery(`
    CREATE INDEX IF NOT EXISTS idx_posts_reddit_id
    ON posts(reddit_id)
  `);
}

async function scrapeReddit(subreddit) {
  const options = {
    uri: "https://app.scrapingbee.com/api/v1",
    qs: {
      api_key: scrapingBeeApiKey,
      url: `https://www.reddit.com/r/${subreddit}/`,
      premium_proxy: "true"
    }
  };

  try {
    const response = await rp(options);
    const $ = cheerio.load(response);

    const posts = [];

    $("shreddit-post").each((index, element) => {
      const title = $(element).attr("post-title") || "";
      const score = $(element).attr("score") || "";
      const comments = $(element).attr("comment-count") || "";
      const permalink = $(element).attr("permalink") || "";
      const redditId = $(element).attr("id") || "";
      const htmlId = $(element).attr("id") || "";

      if (title) {
        posts.push({
          title,
          score,
          comments,
          permalink,
          reddit_id: redditId,
          post_html_id: htmlId
        });
      }
    });

    console.log(`Fetched ${posts.length} posts from Reddit for r/${subreddit}`);
    return posts;
  } catch (error) {
    console.error("Reddit scraping error:", error.message);
    return [];
  }
}

async function getPostsForSubreddit(subreddit) {
  const existingCountRow = await getQuery(
    `SELECT COUNT(*) as count FROM posts WHERE subreddit = ?`,
    [subreddit]
  );

  const existingCount = existingCountRow.count;

  if (existingCount > 0) {
    console.log(`Using cached posts from SQLite for r/${subreddit}`);
    return await allQuery(
      `SELECT * FROM posts WHERE subreddit = ? ORDER BY id DESC`,
      [subreddit]
    );
  }

  console.log(`No cached posts for r/${subreddit}. Fetching from Reddit...`);
  const posts = await scrapeReddit(subreddit);

  if (posts.length === 0) {
    return [];
  }

  const now = new Date().toISOString();

  for (const post of posts) {
    await runQuery(
      `
      INSERT INTO posts (
        reddit_id,
        subreddit,
        title,
        score,
        comments,
        permalink,
        post_html_id,
        stored_at,
        fetched_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        post.reddit_id,
        subreddit,
        post.title,
        post.score,
        post.comments,
        post.permalink,
        post.post_html_id,
        now,
        now
      ]
    );
  }

  return await allQuery(
    `SELECT * FROM posts WHERE subreddit = ? ORDER BY id DESC`,
    [subreddit]
  );
}

app.get("/api/posts/:subreddit", async (req, res) => {
  try {
    const subreddit = req.params.subreddit.trim().toLowerCase();

    if (!subreddit) {
      return res.status(400).json({ error: "Subreddit is required" });
    }

    const posts = await getPostsForSubreddit(subreddit);

    res.json({
      subreddit,
      count: posts.length,
      posts
    });
  } catch (error) {
    console.error("Server error:", error.message);
    res.status(500).json({ error: "Failed to load posts" });
  }
});

const PORT = 5050;

initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Init DB error:", err);
  });