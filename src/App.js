import { useState } from "react";

function App() {
  const [subreddit, setSubreddit] = useState("programming");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  const loadPosts = async () => {
    setError("");
    setData(null);

    try {
      const res = await fetch(`http://localhost:5050/api/reddit/${subreddit}`);
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Request failed");
      }

      setData(json);
    } catch (err) {
      setError(err.message);
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
              style={{ border: "1px solid #ddd", padding: 12, marginTop: 10 }}
            >
              <h3>{post.title}</h3>
              <p>Author: {post.author}</p>
              <p>Score: {post.score}</p>
              <p>Comments: {post.numComments}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default App;