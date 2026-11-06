import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Admin() {
  const [movies, setMovies] = useState([]);
  const [title, setTitle] = useState("");
  const [year, setYear] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState(false);

  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }

    loadMovies();
  }, []);

  async function loadMovies() {
    const response = await fetch("/api/movies");
    const data = await response.json();
    setMovies(data);
  }

  async function handleUpload(event) {
    event.preventDefault();

    if (!file) {
      setMessage("Please select a video file");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", title);
    formData.append("year", year);
    formData.append("description", description);

    setUploading(true);
    setMessage("");

    const response = await fetch("/api/movies", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: formData
    });

    const data = await response.json();

    setUploading(false);

    if (!response.ok) {
      setMessage(data.error || "Upload failed");
      return;
    }

    setMessage("Movie uploaded successfully");
    setTitle("");
    setYear("");
    setDescription("");
    setFile(null);

    document.getElementById("movie-file").value = "";
    loadMovies();
  }

  async function deleteMovie(id) {
    const confirmed = window.confirm("Delete this movie?");

    if (!confirmed) return;

    await fetch(`/api/movies/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    loadMovies();
  }

  function logout() {
    localStorage.removeItem("token");
    navigate("/login");
    window.location.reload();
  }

  return (
    <main style={{ padding: 30 }}>
      <h1>Admin Panel</h1>

      <button onClick={logout}>Logout</button>

      <hr />

      <h2>Upload Movie</h2>

      <form onSubmit={handleUpload}>
        <div>
          <input
            placeholder="Movie title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </div>

        <br />

        <div>
          <input
            placeholder="Year"
            value={year}
            onChange={(event) => setYear(event.target.value)}
          />
        </div>

        <br />

        <div>
          <textarea
            placeholder="Description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </div>

        <br />

        <div>
          <input
            id="movie-file"
            type="file"
            accept="video/*"
            onChange={(event) => setFile(event.target.files[0])}
          />
        </div>

        <br />

        <button type="submit" disabled={uploading}>
          {uploading ? "Uploading..." : "Upload Movie"}
        </button>
      </form>

      {message && <p>{message}</p>}

      <hr />

      <h2>Uploaded Movies</h2>

      {movies.map((movie) => (
        <div key={movie.id} style={{ marginBottom: 15 }}>
          <strong>{movie.title}</strong>
          {" "}
          <button onClick={() => deleteMovie(movie.id)}>
            Delete
          </button>
        </div>
      ))}
    </main>
  );
}