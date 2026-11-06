import { useEffect, useMemo, useState } from "react";
import "./Home.css";

const fallbackMovies = [
  {
    id: 1,
    title: "The Last Horizon",
    year: 2026,
    duration: "2h 18m",
    rating: 8.7,
    genre: "Sci-Fi",
    description:
      "A group of explorers travels beyond the known universe to discover a mysterious world that could change humanity forever.",
    posterUrl: "/images/movie-poster.jpg",
    backdropUrl: "/images/movie-backdrop.jpg",
    trailerUrl: "https://www.youtube.com/embed/ScMzIvxBSi4"
  },
  {
    id: 2,
    title: "Shadow Mission",
    year: 2025,
    duration: "1h 58m",
    rating: 8.2,
    genre: "Action",
    description:
      "An elite agent must complete one final mission before an international threat destroys the city.",
    posterUrl: "/images/movie-poster.jpg",
    backdropUrl: "/images/movie-backdrop.jpg",
    trailerUrl: "https://www.youtube.com/embed/ScMzIvxBSi4"
  },
  {
    id: 3,
    title: "Ocean Secrets",
    year: 2024,
    duration: "2h 05m",
    rating: 7.9,
    genre: "Adventure",
    description:
      "A marine scientist discovers an ancient secret hidden beneath the deepest part of the ocean.",
    posterUrl: "/images/movie-poster.jpg",
    backdropUrl: "/images/movie-backdrop.jpg",
    trailerUrl: "https://www.youtube.com/embed/ScMzIvxBSi4"
  },
  {
    id: 4,
    title: "The Silent House",
    year: 2025,
    duration: "1h 45m",
    rating: 8.1,
    genre: "Horror",
    description:
      "A family moves into an abandoned house where every room hides a dangerous mystery.",
    posterUrl: "/images/movie-poster.jpg",
    backdropUrl: "/images/movie-backdrop.jpg",
    trailerUrl: "https://www.youtube.com/embed/ScMzIvxBSi4"
  }
];

function Home() {
  const [movies, setMovies] = useState([]);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("All");
  const [favorites, setFavorites] = useState([]);
  const [watchlist, setWatchlist] = useState([]);
  const [showTrailer, setShowTrailer] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState("");

  useEffect(() => {
    loadMovies();
  }, []);

  async function loadMovies() {
    try {
      setLoading(true);
      setApiError("");

      const response = await fetch("/api/movies");

      if (!response.ok) {
        throw new Error("Could not load movies");
      }

      const data = await response.json();

      const movieList = Array.isArray(data) ? data : data.movies;

      if (!Array.isArray(movieList) || movieList.length === 0) {
        throw new Error("No movies found");
      }

      setMovies(movieList);
      setSelectedMovie(movieList[0]);
    } catch (error) {
      console.error("Movie loading error:", error);

      setApiError(
        "Backend is unavailable. Showing sample movies instead."
      );

      setMovies(fallbackMovies);
      setSelectedMovie(fallbackMovies[0]);
    } finally {
      setLoading(false);
    }
  }

  const genres = useMemo(() => {
    const allGenres = movies
      .map((movie) => movie.genre)
      .filter(Boolean);

    return ["All", ...new Set(allGenres)];
  }, [movies]);

  const filteredMovies = useMemo(() => {
    return movies.filter((movie) => {
      const title = movie.title?.toLowerCase() || "";
      const genre = movie.genre || "";

      const matchesSearch = title.includes(searchTerm.toLowerCase());
      const matchesGenre =
        selectedGenre === "All" || genre === selectedGenre;

      return matchesSearch && matchesGenre;
    });
  }, [movies, searchTerm, selectedGenre]);

  function getMovieId(movie) {
    return movie.id || movie._id;
  }

  function toggleFavorite(movie) {
    const movieId = getMovieId(movie);

    setFavorites((currentFavorites) => {
      const alreadyFavorite = currentFavorites.some(
        (item) => getMovieId(item) === movieId
      );

      if (alreadyFavorite) {
        return currentFavorites.filter(
          (item) => getMovieId(item) !== movieId
        );
      }

      return [...currentFavorites, movie];
    });
  }

  function toggleWatchlist(movie) {
    const movieId = getMovieId(movie);

    setWatchlist((currentWatchlist) => {
      const alreadyAdded = currentWatchlist.some(
        (item) => getMovieId(item) === movieId
      );

      if (alreadyAdded) {
        return currentWatchlist.filter(
          (item) => getMovieId(item) !== movieId
        );
      }

      return [...currentWatchlist, movie];
    });
  }

  function isFavorite(movie) {
    return favorites.some(
      (item) => getMovieId(item) === getMovieId(movie)
    );
  }

  function isInWatchlist(movie) {
    return watchlist.some(
      (item) => getMovieId(item) === getMovieId(movie)
    );
  }

  function selectMovie(movie) {
    setSelectedMovie(movie);
    setShowDetails(false);

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  }

  function getImageUrl(url, fallback) {
    if (!url) {
      return fallback;
    }

    if (url.startsWith("http") || url.startsWith("/")) {
      return url;
    }

    return `/${url}`;
  }

  if (loading) {
    return (
      <main className="home-page loading-page">
        <div className="loading-spinner"></div>
        <p>Loading movies...</p>
      </main>
    );
  }

  if (!selectedMovie) {
    return (
      <main className="home-page empty-page">
        <h1>No movie selected</h1>
        <button className="primary-button" onClick={loadMovies}>
          Try Again
        </button>
      </main>
    );
  }

  const selectedMovieId = getMovieId(selectedMovie);

  const heroStyle = {
    backgroundImage: `
      linear-gradient(
        90deg,
        rgba(5, 8, 15, 0.98) 0%,
        rgba(5, 8, 15, 0.82) 38%,
        rgba(5, 8, 15, 0.35) 75%,
        rgba(5, 8, 15, 0.7) 100%
      ),
      linear-gradient(
        0deg,
        #080b12 0%,
        transparent 45%
      ),
      url("${getImageUrl(
        selectedMovie.backdropUrl,
        "/images/movie-backdrop.jpg"
      )}")
    `
  };

  return (
    <main className="home-page">
      <section className="hero-section" style={heroStyle}>
        <div className="hero-content">
          <p className="featured-label">FEATURED MOVIE</p>

          <h1>{selectedMovie.title}</h1>

          <div className="movie-meta">
            <span>{selectedMovie.year}</span>
            <span>⭐ {selectedMovie.rating}</span>
            <span>{selectedMovie.duration}</span>
            <span>{selectedMovie.genre}</span>
          </div>

          <p className="hero-description">
            {selectedMovie.description}
          </p>

          <div className="hero-actions">
            <button
              className="primary-button"
              onClick={() => alert(`Playing ${selectedMovie.title}`)}
            >
              ▶ Watch Now
            </button>

            <button
              className="secondary-button"
              onClick={() => setShowTrailer(true)}
            >
              Watch Trailer
            </button>

            <button
              className={`icon-button ${
                isFavorite(selectedMovie) ? "active" : ""
              }`}
              onClick={() => toggleFavorite(selectedMovie)}
              title="Add to favorites"
            >
              {isFavorite(selectedMovie) ? "♥" : "♡"}
            </button>

            <button
              className={`icon-button ${
                isInWatchlist(selectedMovie) ? "active" : ""
              }`}
              onClick={() => toggleWatchlist(selectedMovie)}
              title="Add to watchlist"
            >
              +
            </button>
          </div>

          <button
            className="details-link"
            onClick={() => setShowDetails(!showDetails)}
          >
            {showDetails ? "Hide Details" : "More Details"} ↓
          </button>

          {showDetails && (
            <div className="extra-details">
              <p>
                <strong>Genre:</strong> {selectedMovie.genre}
              </p>
              <p>
                <strong>Duration:</strong> {selectedMovie.duration}
              </p>
              <p>
                <strong>Rating:</strong> {selectedMovie.rating}/10
              </p>
            </div>
          )}
        </div>
      </section>

      {apiError && (
        <div className="api-warning">
          <span>{apiError}</span>
          <button onClick={loadMovies}>Retry</button>
        </div>
      )}

      <section className="movies-section">
        <div className="section-header">
          <div>
            <p className="section-label">DISCOVER</p>
            <h2>Popular Movies</h2>
          </div>

          <div className="movie-stats">
            <span>♥ {favorites.length} Favorites</span>
            <span>+ {watchlist.length} Watchlist</span>
          </div>
        </div>

        <div className="filters">
          <div className="search-box">
            <span>⌕</span>
            <input
              type="search"
              placeholder="Search movies..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>

          <div className="genre-buttons">
            {genres.map((genre) => (
              <button
                key={genre}
                className={selectedGenre === genre ? "selected" : ""}
                onClick={() => setSelectedGenre(genre)}
              >
                {genre}
              </button>
            ))}
          </div>
        </div>

        {filteredMovies.length === 0 ? (
          <div className="no-results">
            <h3>No movies found</h3>
            <p>Try another search term or genre.</p>
          </div>
        ) : (
          <div className="movie-grid">
            {filteredMovies.map((movie) => {
              const movieId = getMovieId(movie);
              const active = movieId === selectedMovieId;

              return (
                <article
                  className={`movie-card ${active ? "selected-card" : ""}`}
                  key={movieId}
                >
                  <div className="poster-wrapper">
                    <img
                      src={getImageUrl(
                        movie.posterUrl,
                        "/images/movie-poster.jpg"
                      )}
                      alt={`${movie.title} poster`}
                    />

                    <div className="poster-overlay">
                      <button onClick={() => selectMovie(movie)}>
                        View Movie
                      </button>
                    </div>

                    <span className="rating-badge">
                      ⭐ {movie.rating}
                    </span>
                  </div>

                  <div className="movie-card-content">
                    <h3>{movie.title}</h3>

                    <p>
                      {movie.year} · {movie.genre} · {movie.duration}
                    </p>

                    <div className="card-actions">
                      <button
                        className={
                          isFavorite(movie) ? "card-active" : ""
                        }
                        onClick={() => toggleFavorite(movie)}
                      >
                        {isFavorite(movie) ? "♥ Saved" : "♡ Favorite"}
                      </button>

                      <button
                        className={
                          isInWatchlist(movie) ? "card-active" : ""
                        }
                        onClick={() => toggleWatchlist(movie)}
                      >
                        {isInWatchlist(movie) ? "✓ Added" : "+ Watchlist"}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {showTrailer && (
        <div
          className="modal-backdrop"
          onClick={() => setShowTrailer(false)}
        >
          <div
            className="trailer-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="close-modal"
              onClick={() => setShowTrailer(false)}
            >
              ×
            </button>

            <h2>{selectedMovie.title} Trailer</h2>

            {selectedMovie.trailerUrl ? (
              <iframe
                src={selectedMovie.trailerUrl}
                title={`${selectedMovie.title} trailer`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            ) : (
              <p className="trailer-unavailable">
                Trailer is not available.
              </p>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

export default Home;