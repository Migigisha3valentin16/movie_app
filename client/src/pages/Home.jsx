import { useEffect, useState } from "react";

export default function Home() {
  const [movies, setMovies] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/movies")
      .then((response) => response.json())
      .then(setMovies)
      .catch(() => setError("Could not load movies"));
  }, []);

  return (
    <main style={{ padding: 30 }}>
      <h1>Movie Catalog</h1>

      {error && <p style={{ color: "red" }}>{error}</p>}

      {movies.length === 0 && <p>No movies uploaded yet.</p>}

      {movies.map((movie) => (
        <article
          key={movie.id}
          style={{
            border: "1px solid #ddd",
            padding: 20,
            marginBottom: 15,
            maxWidth: 600
          }}
        >
          <h2>{movie.title}</h2>

          {movie.year && <p>Year: {movie.year}</p>}
          <p>{movie.description}</p>

          <a href={`/api/movies/${movie.id}/download`}>
            Download movie
          </a>
        </article>
      ))}
    </main>
  );
}