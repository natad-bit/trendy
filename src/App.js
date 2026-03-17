import { useState } from "react";

function App() {
  const [sub, setSub] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const analyze = async () => {
    if(!sub) return;
    setLoading(true);
    setError(null);
    setData(null);

    try {
      const res = await fetch(`http://localhost:5000/analyze/${sub}`);
      if(!res.ok) throw new Error("Failed to fetch subreddit data");
      const json = await res.json();
      setData(json);
    } catch(err) {
      setError(err.message);
      console.error(err);
    }

    setLoading(false);
  };

  return (
    <div style={{ padding: 30, fontFamily: "Arial" }}>
      <h1>Reddit Sentiment Dashboard</h1>

      <input
        placeholder="Enter subreddit"
        value={sub}
        onChange={(e) => setSub(e.target.value)}
        style={{ padding: 5, marginRight: 10 }}
      />
      <button onClick={analyze} style={{ padding: 5 }}>Analyze</button>

      {loading && <p>Loading...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}

      {data && (
        <div>
          <h2>Statistics</h2>
          <p>Total comments: {data.totalComments}</p>
          <p>Top word: {data.topWord}</p>

          <h3>Sentiment Analysis</h3>
          <p>Positive: {data.sentiments.positive}</p>
          <p>Neutral: {data.sentiments.neutral}</p>
          <p>Negative: {data.sentiments.negative}</p>

          <h2>Top Posts</h2>
          <table border="1" cellPadding="5" style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th>Title</th>
                <th>Comments</th>
                <th>Score</th>
              </tr>
            </thead>
            <tbody>
              {data.posts.map((p, i) => (
                <tr key={i}>
                  <td>{p.title}</td>
                  <td>{p.comments}</td>
                  <td>{p.score}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default App;