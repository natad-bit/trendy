import { useState } from "react";

function App() {
  const [subreddit, setSubreddit] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadPosts = async () => {
    if (!subreddit.trim()) return;

    setLoading(true);
    setError("");
    setData(null);

    try {
      const res = await fetch(`http://localhost:5050/api/posts/${subreddit}`);

      if (!res.ok) {
        throw new Error("Failed to load posts");
      }

      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error(err);
      setError(err.message);
    }

    setLoading(false);
  };

  return (
    <div style={{ padding: "30px", fontFamily: "Arial" }}>
      <h1>Reddit Posts Viewer</h1>

      <div style={{ marginBottom: "20px" }}>
        <input
          type="text"
          placeholder="Enter subreddit, for example hamburg"
          value={subreddit}
          onChange={(e) => setSubreddit(e.target.value)}
          style={{ padding: "8px", width: "260px", marginRight: "10px" }}
        />
        <button onClick={loadPosts} style={{ padding: "8px 14px" }}>
          Load posts
        </button>
      </div>

      {loading && <p>Loading...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}

      {data && (
        <div>
          <h2>r/{data.subreddit}</h2>
          <p>Posts found: {data.count}</p>

          {data.posts.map((post) => (
            <div
              key={post.id}
              style={{
                border: "1px solid #ddd",
                borderRadius: "8px",
                padding: "15px",
                marginBottom: "12px"
              }}
            >
              <h3 style={{ marginTop: 0 }}>{post.title}</h3>
              <p><strong>Score:</strong> {post.score}</p>
              <p><strong>Comments:</strong> {post.comments}</p>
              <p><strong>Stored at:</strong> {post.stored_at}</p>
              {post.permalink && (
                <a
                  href={`https://www.reddit.com${post.permalink}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open post
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default App;