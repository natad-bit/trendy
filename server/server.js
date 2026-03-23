console.log("Starting direct Reddit test server...");

const express = require("express");
const cors = require("cors");
const axios = require("axios");

const app = express();
const PORT = 5050;

app.use(
  cors({
    origin: "http://localhost:3000",
    methods: ["GET"],
  })
);

app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

app.get("/test", (req, res) => {
  res.json({
    ok: true,
    message: "Server is running on 5050",
  });
});

app.get("/api/reddit/:subreddit", async (req, res) => {
  const subreddit = (req.params.subreddit || "").trim();

  if (!subreddit) {
    return res.status(400).json({ error: "Subreddit is required" });
  }

  try {
    const url = `https://www.reddit.com/r/${subreddit}.json?limit=10`;

    const response = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 RedditDashboardTest/1.0",
        "Accept": "application/json",
      },
      timeout: 15000,
      validateStatus: () => true,
    });

    console.log("Reddit status:", response.status);

    if (response.status !== 200) {
      return res.status(response.status).json({
        error: "Reddit request failed",
        redditStatus: response.status,
      });
    }

    const children = response.data?.data?.children || [];

    const posts = children.map((item) => {
      const p = item.data || {};
      return {
        id: p.id,
        title: p.title,
        author: p.author,
        score: p.score,
        numComments: p.num_comments,
        permalink: p.permalink,
        createdUtc: p.created_utc,
      };
    });

    return res.json({
      subreddit,
      count: posts.length,
      posts,
    });
  } catch (error) {
    console.error("Route error:", error.message);
    return res.status(500).json({
      error: "Server failed to fetch Reddit JSON",
      details: error.message,
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});