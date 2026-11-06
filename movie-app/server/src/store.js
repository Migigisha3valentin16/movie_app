import fs from "fs";
import path from "path";

const DATA_FILE = path.join(process.cwd(), "data", "movies.json");

function ensureFile() {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });

  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, "[]");
  }
}

export function getAllMovies() {
  ensureFile();
  return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
}

export function getMovieById(id) {
  return getAllMovies().find((movie) => movie.id === id);
}

export function addMovie(movie) {
  const movies = getAllMovies();
  movies.push(movie);

  fs.writeFileSync(DATA_FILE, JSON.stringify(movies, null, 2));
  return movie;
}

export function deleteMovie(id) {
  const movies = getAllMovies();
  const movie = movies.find((item) => item.id === id);

  const remainingMovies = movies.filter((item) => item.id !== id);
  fs.writeFileSync(DATA_FILE, JSON.stringify(remainingMovies, null, 2));

  return movie;
}