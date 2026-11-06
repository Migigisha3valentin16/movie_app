import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import multer from "multer";
import jwt from "jsonwebtoken";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

/* ---------- paths ---------- */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = path.join(__dirname, "..");
const DATA_DIR = path.join(ROOT_DIR, "data");
const DATA_FILE = path.join(DATA_DIR, "movies.json");

const UPLOAD_DIR = path.join(ROOT_DIR, "uploads");
const IMAGE_DIR = path.join(ROOT_DIR, "images");

/* ---------- create folders and files ---------- */

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(UPLOAD_DIR, { recursive: true });
fs.mkdirSync(IMAGE_DIR, { recursive: true });

if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, "[]");
}

/* ---------- configuration ---------- */

const PORT = process.env.PORT || 4000;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@example.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";

/* ---------- app ---------- */

const app = express();

app.use(
  cors({
    origin: true,
    credentials: true
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ---------- serve uploaded files and images ---------- */

app.use("/uploads", express.static(UPLOAD_DIR));
app.use("/images", express.static(IMAGE_DIR));

/* ---------- JSON database functions ---------- */

function readMovies() {
  try {
    const fileContent = fs.readFileSync(DATA_FILE, "utf8");
    const movies = JSON.parse(fileContent);

    return Array.isArray(movies) ? movies : [];
  } catch (error) {
    console.error("Could not read movies.json:", error.message);
    return [];
  }
}

function writeMovies(movies) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(movies, null, 2));
}

/* ---------- helper functions ---------- */

function cleanText(value, fallback = "") {
  if (typeof value !== "string") {
    return fallback;
  }

  return value.trim();
}

function getPublicFileUrl(req, folder, filename) {
  if (!filename) {
    return null;
  }

  return `${req.protocol}://${req.get("host")}/${folder}/${filename}`;
}

function removeFileIfExists(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    console.error("Could not remove file:", error.message);
  }
}

/* ---------- video upload configuration ---------- */

const videoStorage = multer.diskStorage({
  destination: (req, file, callback) => {
    callback(null, UPLOAD_DIR);
  },

  filename: (req, file, callback) => {
    const safeName = file.originalname.replace(
      /[^a-zA-Z0-9._-]/g,
      "_"
    );

    callback(null, `${Date.now()}-${safeName}`);
  }
});

const videoUpload = multer({
  storage: videoStorage,

  limits: {
    fileSize: 2 * 1024 * 1024 * 1024
  },

  fileFilter: (req, file, callback) => {
    if (file.mimetype && file.mimetype.startsWith("video/")) {
      callback(null, true);
    } else {
      callback(new Error("Only video files are allowed"));
    }
  }
});

/* ---------- image upload configuration ---------- */

const imageStorage = multer.diskStorage({
  destination: (req, file, callback) => {
    callback(null, IMAGE_DIR);
  },

  filename: (req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const baseName = path
      .basename(file.originalname, extension)
      .replace(/[^a-zA-Z0-9_-]/g, "_");

    callback(null, `${Date.now()}-${baseName}${extension}`);
  }
});

const imageUpload = multer({
  storage: imageStorage,

  limits: {
    fileSize: 10 * 1024 * 1024
  },

  fileFilter: (req, file, callback) => {
    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp"
    ];

    if (allowedTypes.includes(file.mimetype)) {
      callback(null, true);
    } else {
      callback(new Error("Only JPG, PNG, and WEBP images are allowed"));
    }
  }
});

/* ---------- authentication middleware ---------- */

function requireAdmin(req, res, next) {
  const authorizationHeader = req.headers.authorization || "";

  const token = authorizationHeader.startsWith("Bearer ")
    ? authorizationHeader.slice(7)
    : "";

  if (!token) {
    return res.status(401).json({
      error: "Not authorized. Please log in again."
    });
  }

  try {
    const decodedUser = jwt.verify(token, JWT_SECRET);

    if (decodedUser.role !== "admin") {
      return res.status(403).json({
        error: "Admin access is required"
      });
    }

    req.user = decodedUser;
    next();
  } catch {
    return res.status(401).json({
      error: "Not authorized. Please log in again."
    });
  }
}

/* ---------- basic routes ---------- */

app.get("/", (req, res) => {
  res.send("Movie API is running");
});

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    message: "Backend is running"
  });
});

/* ---------- authentication ---------- */

app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body || {};

  if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
    return res.status(401).json({
      error: "Wrong email or password"
    });
  }

  const token = jwt.sign(
    {
      role: "admin",
      email
    },
    JWT_SECRET,
    {
      expiresIn: "12h"
    }
  );

  res.json({
    token,
    user: {
      email,
      role: "admin"
    }
  });
});

/* ---------- public movie routes ---------- */

/*
  GET /api/movies

  Returns all movies.
*/
app.get("/api/movies", (req, res) => {
  const movies = readMovies();

  const moviesWithUrls = movies.map((movie) => ({
    ...movie,

    videoUrl: movie.filename
      ? getPublicFileUrl(req, "uploads", movie.filename)
      : null,

    posterUrl: movie.posterFilename
      ? getPublicFileUrl(req, "images", movie.posterFilename)
      : movie.posterUrl || null,

    backdropUrl: movie.backdropFilename
      ? getPublicFileUrl(req, "images", movie.backdropFilename)
      : movie.backdropUrl || null
  }));

  res.json(moviesWithUrls);
});

/*
  GET /api/movies/:id

  Returns one movie.
*/
app.get("/api/movies/:id", (req, res) => {
  const movie = readMovies().find(
    (item) => item.id === req.params.id
  );

  if (!movie) {
    return res.status(404).json({
      error: "Movie not found"
    });
  }

  res.json({
    ...movie,

    videoUrl: movie.filename
      ? getPublicFileUrl(req, "uploads", movie.filename)
      : null,

    posterUrl: movie.posterFilename
      ? getPublicFileUrl(req, "images", movie.posterFilename)
      : movie.posterUrl || null,

    backdropUrl: movie.backdropFilename
      ? getPublicFileUrl(req, "images", movie.backdropFilename)
      : movie.backdropUrl || null
  });
});

/*
  GET /api/movies/:id/stream

  Streams the video file.
*/
app.get("/api/movies/:id/stream", (req, res) => {
  const movie = readMovies().find(
    (item) => item.id === req.params.id
  );

  if (!movie) {
    return res.status(404).json({
      error: "Movie not found"
    });
  }

  if (!movie.filename) {
    return res.status(404).json({
      error: "Movie video is missing"
    });
  }

  const filePath = path.join(UPLOAD_DIR, movie.filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({
      error: "File is missing on the server disk"
    });
  }

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;

  if (!range) {
    res.writeHead(200, {
      "Content-Length": fileSize,
      "Content-Type": "video/mp4",
      "Accept-Ranges": "bytes"
    });

    fs.createReadStream(filePath).pipe(res);
    return;
  }

  const parts = range.replace(/bytes=/, "").split("-");
  const start = parseInt(parts[0], 10);
  const requestedEnd = parts[1]
    ? parseInt(parts[1], 10)
    : fileSize - 1;

  const end = Math.min(requestedEnd, fileSize - 1);
  const chunkSize = end - start + 1;

  const videoStream = fs.createReadStream(filePath, {
    start,
    end
  });

  res.writeHead(206, {
    "Content-Range": `bytes ${start}-${end}/${fileSize}`,
    "Accept-Ranges": "bytes",
    "Content-Length": chunkSize,
    "Content-Type": "video/mp4"
  });

  videoStream.pipe(res);
});

/*
  GET /api/movies/:id/download

  Downloads the video file.
*/
app.get("/api/movies/:id/download", (req, res) => {
  const movie = readMovies().find(
    (item) => item.id === req.params.id
  );

  if (!movie) {
    return res.status(404).json({
      error: "Movie not found"
    });
  }

  if (!movie.filename) {
    return res.status(404).json({
      error: "Movie file is missing"
    });
  }

  const filePath = path.join(UPLOAD_DIR, movie.filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({
      error: "File is missing on the server disk"
    });
  }

  res.download(
    filePath,
    movie.originalName || "movie.mp4"
  );
});

/* ---------- admin upload route ---------- */

/*
  POST /api/movies

  FormData fields:

  file:
  title:
  description:
  year:
  duration:
  rating:
  genre:
  trailerUrl:
  posterUrl:
  backdropUrl:
  poster:
  backdrop:

  The video field is called "file".
  The poster image field is called "poster".
  The backdrop image field is called "backdrop".
*/
app.post(
  "/api/movies",
  requireAdmin,
  videoUpload.single("file"),
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({
        error: "No video file uploaded"
      });
    }

    const title = cleanText(
      req.body.title,
      req.file.originalname
    );

    const description = cleanText(req.body.description);

    const year = Number(req.body.year) || new Date().getFullYear();

    const duration = cleanText(
      req.body.duration,
      "Unknown"
    );

    const rating = Number(req.body.rating) || 0;

    const genre = cleanText(req.body.genre, "Other");

    const trailerUrl = cleanText(req.body.trailerUrl);

    const posterUrl = cleanText(req.body.posterUrl);

    const backdropUrl = cleanText(req.body.backdropUrl);

    const movie = {
      id: Date.now().toString(),

      title,
      description,
      year,
      duration,
      rating,
      genre,
      trailerUrl,

      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,

      posterUrl: posterUrl || null,
      backdropUrl: backdropUrl || null,

      posterFilename: null,
      backdropFilename: null,

      createdAt: new Date().toISOString()
    };

    const movies = readMovies();

    movies.unshift(movie);
    writeMovies(movies);

    res.status(201).json({
      ...movie,

      videoUrl: getPublicFileUrl(
        req,
        "uploads",
        movie.filename
      )
    });
  }
);

/* ---------- admin upload with video and images ---------- */

/*
  This route allows uploading:

  - file: video
  - poster: poster image
  - backdrop: background image

  Use this route if you want to upload all files together.
*/
app.post(
  "/api/movies/complete",
  requireAdmin,
  (req, res, next) => {
    const uploadFields = multer({
      storage: videoStorage,
      limits: {
        fileSize: 2 * 1024 * 1024 * 1024
      },
      fileFilter: (request, file, callback) => {
        if (
          file.fieldname === "file" &&
          file.mimetype.startsWith("video/")
        ) {
          callback(null, true);
          return;
        }

        if (
          ["poster", "backdrop"].includes(file.fieldname) &&
          file.mimetype.startsWith("image/")
        ) {
          callback(null, true);
          return;
        }

        callback(
          new Error(
            "Use a video in the file field and images in poster/backdrop fields"
          )
        );
      }
    }).fields([
      { name: "file", maxCount: 1 },
      { name: "poster", maxCount: 1 },
      { name: "backdrop", maxCount: 1 }
    ]);

    uploadFields(req, res, (error) => {
      if (error) {
        next(error);
        return;
      }

      next();
    });
  },
  (req, res) => {
    const videoFile = req.files?.file?.[0];
    const posterFile = req.files?.poster?.[0];
    const backdropFile = req.files?.backdrop?.[0];

    if (!videoFile) {
      return res.status(400).json({
        error: "No video file uploaded"
      });
    }

    const title = cleanText(
      req.body.title,
      videoFile.originalname
    );

    const movie = {
      id: Date.now().toString(),

      title,
      description: cleanText(req.body.description),
      year: Number(req.body.year) || new Date().getFullYear(),
      duration: cleanText(req.body.duration, "Unknown"),
      rating: Number(req.body.rating) || 0,
      genre: cleanText(req.body.genre, "Other"),
      trailerUrl: cleanText(req.body.trailerUrl),

      filename: videoFile.filename,
      originalName: videoFile.originalname,
      size: videoFile.size,

      posterFilename: posterFile
        ? posterFile.filename
        : null,

      backdropFilename: backdropFile
        ? backdropFile.filename
        : null,

      posterUrl: cleanText(req.body.posterUrl) || null,
      backdropUrl: cleanText(req.body.backdropUrl) || null,

      createdAt: new Date().toISOString()
    };

    const movies = readMovies();

    movies.unshift(movie);
    writeMovies(movies);

    res.status(201).json({
      ...movie,

      videoUrl: getPublicFileUrl(
        req,
        "uploads",
        movie.filename
      ),

      posterUrl: movie.posterFilename
        ? getPublicFileUrl(
            req,
            "uploads",
            movie.posterFilename
          )
        : movie.posterUrl,

      backdropUrl: movie.backdropFilename
        ? getPublicFileUrl(
            req,
            "uploads",
            movie.backdropFilename
          )
        : movie.backdropUrl
    });
  }
);

/* ---------- admin update route ---------- */

app.put(
  "/api/movies/:id",
  requireAdmin,
  (req, res) => {
    const movies = readMovies();

    const movieIndex = movies.findIndex(
      (item) => item.id === req.params.id
    );

    if (movieIndex === -1) {
      return res.status(404).json({
        error: "Movie not found"
      });
    }

    const oldMovie = movies[movieIndex];

    const updatedMovie = {
      ...oldMovie,

      title:
        req.body.title !== undefined
          ? cleanText(req.body.title)
          : oldMovie.title,

      description:
        req.body.description !== undefined
          ? cleanText(req.body.description)
          : oldMovie.description,

      year:
        req.body.year !== undefined
          ? Number(req.body.year)
          : oldMovie.year,

      duration:
        req.body.duration !== undefined
          ? cleanText(req.body.duration)
          : oldMovie.duration,

      rating:
        req.body.rating !== undefined
          ? Number(req.body.rating)
          : oldMovie.rating,

      genre:
        req.body.genre !== undefined
          ? cleanText(req.body.genre)
          : oldMovie.genre,

      trailerUrl:
        req.body.trailerUrl !== undefined
          ? cleanText(req.body.trailerUrl)
          : oldMovie.trailerUrl,

      posterUrl:
        req.body.posterUrl !== undefined
          ? cleanText(req.body.posterUrl)
          : oldMovie.posterUrl,

      backdropUrl:
        req.body.backdropUrl !== undefined
          ? cleanText(req.body.backdropUrl)
          : oldMovie.backdropUrl,

      updatedAt: new Date().toISOString()
    };

    movies[movieIndex] = updatedMovie;
    writeMovies(movies);

    res.json(updatedMovie);
  }
);

/* ---------- admin delete route ---------- */

app.delete(
  "/api/movies/:id",
  requireAdmin,
  (req, res) => {
    const movies = readMovies();

    const movie = movies.find(
      (item) => item.id === req.params.id
    );

    if (!movie) {
      return res.status(404).json({
        error: "Movie not found"
      });
    }

    if (movie.filename) {
      removeFileIfExists(
        path.join(UPLOAD_DIR, movie.filename)
      );
    }

    if (movie.posterFilename) {
      removeFileIfExists(
        path.join(IMAGE_DIR, movie.posterFilename)
      );
    }

    if (movie.backdropFilename) {
      removeFileIfExists(
        path.join(IMAGE_DIR, movie.backdropFilename)
      );
    }

    const remainingMovies = movies.filter(
      (item) => item.id !== req.params.id
    );

    writeMovies(remainingMovies);

    res.json({
      ok: true,
      message: "Movie deleted successfully"
    });
  }
);

/* ---------- error handler ---------- */

app.use((error, req, res, next) => {
  console.error("Server error:", error);

  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        error: "File is too large"
      });
    }

    return res.status(400).json({
      error: error.message
    });
  }

  res.status(400).json({
    error: error.message || "Request failed"
  });
});

/* ---------- start server ---------- */

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Movies API: http://localhost:${PORT}/api/movies`);
});