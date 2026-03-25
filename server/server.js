console.log("Starting direct Reddit test server...");

const express = require("express");
const cors = require("cors");
const axios = require("axios");
const Sentiment = require("sentiment");
const sentiment = new Sentiment();

const app = express();
const PORT = 5050;

function extractCommentsTree(childrenList) {
  let extracted = [];
  if (!childrenList || !Array.isArray(childrenList)) return extracted;
  
  for (const item of childrenList) {
    if (item.kind === "t1" && item.data && item.data.body) {
      const c = item.data;
      const sentimentResult = sentiment.analyze(c.body || "");
      
      const commentNode = {
        id: c.id,
        author: c.author,
        body: c.body,
        score: c.score,
        createdUtc: c.created_utc,
        sentiment: sentimentResult.score,
        sentimentComparative: sentimentResult.comparative,
        replies: []
      };
      
      if (c.replies && c.replies.data && c.replies.data.children) {
        commentNode.replies = extractCommentsTree(c.replies.data.children);
      }
      extracted.push(commentNode);
    }
  }
  return extracted;
}

function extractAllComments(childrenList) {
  let extracted = [];
  if (!childrenList || !Array.isArray(childrenList)) return extracted;
  
  for (const item of childrenList) {
    if (item.kind === "t1" && item.data && item.data.body) {
      extracted.push(item);
      if (item.data.replies && item.data.replies.data && item.data.replies.data.children) {
        extracted = extracted.concat(extractAllComments(item.data.replies.data.children));
      }
    }
  }
  return extracted;
}

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

    const posts = [];
    for (const item of children) {
      const p = item.data || {};
      
      let averageSentiment = 0;
      let analyzedCommentsCount = 0;
      
      try {
        const commentsUrl = `https://www.reddit.com/r/${subreddit}/comments/${p.id}.json?limit=30`;
        const commentsRes = await axios.get(commentsUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 RedditDashboardTest/1.0",
            "Accept": "application/json",
          },
          timeout: 6000,
          validateStatus: () => true,
        });

        if (commentsRes.status === 200) {
          const commentsData = commentsRes.data[1]?.data?.children || [];
          const validComments = extractAllComments(commentsData);
          
          let totalScore = 0;
          validComments.forEach(c => {
            const res = sentiment.analyze(c.data.body);
            totalScore += res.score;
          });
          
          if (validComments.length > 0) {
            averageSentiment = totalScore / validComments.length;
          }
          analyzedCommentsCount = validComments.length;
        }
      } catch (err) {
        console.error(`Failed to fetch comments for post ${p.id} for sentiment:`, err.message);
      }

      posts.push({
        id: p.id,
        title: p.title,
        author: p.author,
        score: p.score,
        numComments: p.num_comments,
        permalink: p.permalink,
        createdUtc: p.created_utc,
        averageSentiment: Number(averageSentiment.toFixed(2)),
        analyzedCommentsCount
      });
      
      // Delay to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 300));
    }

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

app.get("/api/reddit/:subreddit/comments", async (req, res) => {
  const subreddit = req.params.subreddit;
  const postId = req.query.postId;

  if (!postId) {
    return res.status(400).json({ error: "Post ID is required" });
  }

  try {
    const url = `https://www.reddit.com/r/${subreddit}/comments/${postId}.json`;
    const response = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 RedditDashboardTest/1.0",
        "Accept": "application/json",
      },
      timeout: 15000,
      validateStatus: () => true,
    });

    if (response.status !== 200) {
      return res.status(response.status).json({
        error: "Reddit request failed",
        redditStatus: response.status,
      });
    }

    // Reddit post-specific JSON returns an array: [postData, commentsData]
    const commentsData = response.data[1]?.data?.children || [];

    const comments = extractCommentsTree(commentsData);

    return res.json({ comments });
  } catch (error) {
    console.error("Comments route error:", error.message);
    return res.status(500).json({
      error: "Server failed to fetch Reddit comments",
      details: error.message,
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});