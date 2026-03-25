import { useState } from "react";

function App() {
  const [subreddit, setSubreddit] = useState("programming");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  const [expandedPostId, setExpandedPostId] = useState(null);
  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentsError, setCommentsError] = useState("");

  const loadPosts = async () => {
    setError("");
    setData(null);
    setExpandedPostId(null);

    try {
      const res = await fetch(`http://localhost:5050/api/reddit/${encodeURIComponent(subreddit)}`);
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Request failed");
      }

      setData(json);
    } catch (err) {
      setError(err.message);
    }
  };

  const loadComments = async (post, currentSubreddit) => {
    if (expandedPostId === post.id) {
      setExpandedPostId(null);
      return;
    }

    setExpandedPostId(post.id);
    setComments([]);
    setCommentsError("");
    setLoadingComments(true);

    try {
      const url = `http://localhost:5050/api/reddit/${encodeURIComponent(currentSubreddit)}/comments?postId=${encodeURIComponent(post.id)}`;
      const res = await fetch(url);
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Request failed");
      }

      setComments(json.comments || []);
    } catch (err) {
      setCommentsError(err.message);
    } finally {
      setLoadingComments(false);
    }
  };

  return (
    <div style={{ padding: 30, fontFamily: "Arial" }}>
      <h1>Direct Reddit JSON Test</h1>

      <input
        value={subreddit}
        onChange={(e) => setSubreddit(e.target.value)}
        style={{ padding: 8, marginRight: 10 }}
      />
      <button onClick={loadPosts}>Load</button>

      {error && <p style={{ color: "red" }}>{error}</p>}

      {data && (
        <div>
          <h2>r/{data.subreddit}</h2>
          <p>Count: {data.count}</p>

          {data.posts.map((post) => (
            <div
              key={post.id}
              style={{ border: "1px solid #ddd", padding: 12, marginTop: 10, cursor: "pointer" }}
              onClick={() => loadComments(post, data.subreddit)}
            >
              <h3>{post.title}</h3>
              <p>Author: {post.author}</p>
              <p>Score: {post.score}</p>
              <p>Comments: {post.numComments}</p>

              {expandedPostId === post.id && (
                <div
                  style={{ marginTop: 15, padding: 15, backgroundColor: "#f9f9f9", borderRadius: 5, cursor: "auto" }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <h4 style={{ marginTop: 0 }}>Comments:</h4>
                  {loadingComments && <p>Loading comments...</p>}
                  {commentsError && <p style={{ color: "red" }}>{commentsError}</p>}
                  {!loadingComments && !commentsError && comments.length === 0 && (
                    <p>No comments found.</p>
                  )}
                  {!loadingComments && comments.length > 0 && comments.map(c => (
                    <div key={c.id} style={{ marginBottom: 10, borderBottom: "1px solid #ccc", paddingBottom: 10 }}>
                      <strong>{c.author}</strong> <span style={{ color: "#555", fontSize: "0.9em" }}>(Score: {c.score})</span>
                      <p style={{ margin: "5px 0" }}>{c.body}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default App;