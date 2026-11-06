import { useEffect, useState } from "react";

const API = "/api";

function formatSize(bytes) {
  if (!bytes) return "";
  const mb = bytes / (1024 * 1024);
  return mb > 1024 ? `${(mb / 1024).toFixed(2)} GB` : `${mb.toFixed(1)} MB`;
}

export default function App() {
  const [page, setPage] = useState("home");
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [token, setToken] = useState(() => localStorage.getItem("token") || "");

  async function loadMovies() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API}/movies`);
      if (!res.ok) throw new Error("HTTP " + res.status);
      setMovies(await res.json());
    } catch (e) {
      setError("Could not load movies. Is the backend running on port 4000?");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMovies();
  }, []);

  function logout() {
    localStorage.removeItem("token");
    setToken("");
    setPage("home");
  }

  return (
    <div className="app">
      <nav className="nav">
        <button className="link" onClick={() => setPage("home")}>
          Movie Catalog
        </button>
        <span className="sep">|</span>
        {token ? (
          <>
            <button className="link" onClick={() => setPage("admin")}>
              Admin Panel
            </button>
            <span className="sep">|</span>
            <button className="link" onClick={logout}>
              Logout
            </button>
          </>
        ) : (
          <button className="link" onClick={() => setPage("login")}>
            Admin Login
          </button>
        )}
      </nav>

      <hr className="line" />

      {page === "home" && (
        <Home movies={movies} loading={loading} error={error} onRetry={loadMovies} />
      )}

      {page === "login" && (
        <Login
          onLogin={(t) => {
            setToken(t);
            setPage("admin");
            loadMovies();
          }}
        />
      )}

      {page === "admin" &&
        (token ? (
          <Admin token={token} movies={movies} reload={loadMovies} />
        ) : (
          <p className="error">Please log in first.</p>
        ))}
    </div>
  );
}

/* ---------------- Home ---------------- */
function Home({ movies, loading, error, onRetry }) {
  return (
    <main>
      <h1>Movie Catalog</h1>

      {loading && <p className="muted">Loading…</p>}

      {error && (
        <>
          <p className="error">{error}</p>
          <button className="btn" onClick={onRetry}>
            Retry
          </button>
        </>
      )}

      {!loading && !error && movies.length === 0 && (
        <p className="muted">No movies uploaded yet.</p>
      )}

      <div className="grid">
        {movies.map((m) => (
          <div className="card" key={m.id}>
            <h3>{m.title}</h3>
            {m.description && <p className="muted">{m.description}</p>}
            <p className="muted small">{formatSize(m.size)}</p>
            <a className="btn" href={`${API}/movies/${m.id}/download`}>
              Download
            </a>
          </div>
        ))}
      </div>
    </main>
  );
}

/* ---------------- Login ---------------- */
function Login({ onLogin }) {
  const [email, setEmail] = useState("admin@example.com");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");
      localStorage.setItem("token", data.token);
      onLogin(data.token);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main>
      <h1>Admin Login</h1>
      <form className="form" onSubmit={submit}>
        <label>
          Email
          <input value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <button className="btn" disabled={busy}>
          {busy ? "Logging in…" : "Log in"}
        </button>
        {error && <p className="error">{error}</p>}
      </form>
    </main>
  );
}

/* ---------------- Admin ---------------- */
function Admin({ token, movies, reload }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function upload(e) {
    e.preventDefault();
    const formEl = e.target;

    if (!file) {
      setMessage("Choose a video file first.");
      return;
    }

    setBusy(true);
    setMessage("");

    const form = new FormData();
    form.append("title", title);
    form.append("description", description);
    form.append("file", file);

    try {
      const res = await fetch(`${API}/movies`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");

      setMessage(`Uploaded: ${data.title}`);
      setTitle("");
      setDescription("");
      setFile(null);
      formEl.reset();
      reload();
    } catch (e) {
      setMessage("Error: " + e.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id) {
    if (!window.confirm("Delete this movie?")) return;
    const res = await fetch(`${API}/movies/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) reload();
    else setMessage("Delete failed");
  }

  return (
    <main>
      <h1>Admin Panel</h1>

      <section className="panel">
        <h2>Upload a movie</h2>
        <form className="form" onSubmit={upload}>
          <label>
            Title
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="My Movie"
            />
          </label>
          <label>
            Description
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional"
            />
          </label>
          <label>
            Video file
            <input type="file" accept="video/*" onChange={(e) => setFile(e.target.files[0])} />
          </label>
          <button className="btn" disabled={busy}>
            {busy ? "Uploading…" : "Upload"}
          </button>
          {message && <p className="muted">{message}</p>}
        </form>
      </section>

      <section className="panel">
        <h2>Uploaded movies ({movies.length})</h2>
        {movies.length === 0 && <p className="muted">Nothing uploaded yet.</p>}
        {movies.map((m) => (
          <div className="row" key={m.id}>
            <div>
              <strong>{m.title}</strong>
              <span className="muted small"> — {formatSize(m.size)}</span>
            </div>
            <button className="btn danger" onClick={() => remove(m.id)}>
              Delete
            </button>
          </div>
        ))}
      </section>
    </main>
  );
}