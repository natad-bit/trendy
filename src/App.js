import { useState } from "react";

const Comment = ({ comment }) => {
  let sentimentEmoji = "⚪";
  if (comment.sentiment > 0) sentimentEmoji = "🟢";
  else if (comment.sentiment < 0) sentimentEmoji = "🔴";

  return (
    <div style={{ marginBottom: 10, borderLeft: "2px solid #ddd", paddingLeft: 12, marginTop: 10, marginLeft: 5 }}>
      <strong>{comment.author}</strong> <span style={{ color: "#555", fontSize: "0.9em" }}>(Score: {comment.score})</span>
      <span style={{ marginLeft: 10, fontSize: "0.9em" }}>
        Sentiment: {comment.sentiment} {sentimentEmoji}
      </span>
      <p style={{ margin: "5px 0" }}>{comment.body}</p>
      
      {comment.replies && comment.replies.length > 0 && (
        <div style={{ marginTop: 8 }}>
          {comment.replies.map(r => <Comment key={r.id} comment={r} />)}
        </div>
      )}
    </div>
  );
};

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
              {post.analyzedCommentsCount > 0 && (
                <p style={{ margin: "5px 0" }}>
                  <strong>Avg Sentiment:</strong> {post.averageSentiment}{" "}
                  {post.averageSentiment > 0 ? "🟢" : post.averageSentiment < 0 ? "🔴" : "⚪"}
                  <span style={{ fontSize: "0.8em", color: "#666", marginLeft: 8 }}>
                    ({post.analyzedCommentsCount} comments analyzed)
                  </span>
                </p>
              )}

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
                  {!loadingComments && comments.length > 0 && comments.map(c => <Comment key={c.id} comment={c} />)}
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