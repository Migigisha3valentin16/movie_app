import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";

import * as store from "./store.js";
import { requireAdmin } from "./auth.js";

const router = express.Router();

const uploadDirectory = path.resolve(
  process.env.UPLOAD_DIR || "uploads"
);

const maxFileSize =
  Number(process.env.MAX_FILE_MB || 2048) * 1024 * 1024;

fs.mkdirSync(uploadDirectory, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    callback(null, uploadDirectory);
  },

  filename: (_req, file, callback) => {
    const extension = path.extname(file.originalname);
    callback(null, `${crypto.randomUUID()}${extension}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: maxFileSize
  },
  fileFilter: (_req, file, callback) => {
    if (!file.mimetype.startsWith("video/")) {
      return callback(new Error("Only video files are allowed"));
    }

    callback(null, true);
  }
});

// Get all movies
router.get("/", (_req, res) => {
  const movies = store.getAllMovies().map(({ filename, ...movie }) => movie);
  res.json(movies);
});

// Upload a movie
router.post("/", requireAdmin, upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      error: "Please select a video file"
    });
  }

  const movie = {
    id: crypto.randomUUID(),
    title: req.body.title || req.file.originalname,
    description: req.body.description || "",
    year: req.body.year || "",
    filename: req.file.filename,
    originalName: req.file.originalname,
    size: req.file.size,
    createdAt: new Date().toISOString()
  };

  store.addMovie(movie);

  const { filename, ...publicMovie } = movie;
  res.status(201).json(publicMovie);
});

// Delete a movie
router.delete("/:id", requireAdmin, (req, res) => {
  const movie = store.deleteMovie(req.params.id);

  if (!movie) {
    return res.status(404).json({
      error: "Movie not found"
    });
  }

  const filePath = path.join(uploadDirectory, movie.filename);
  fs.promises.unlink(filePath).catch(() => {});

  res.json({ message: "Movie deleted" });
});

// Download a movie
router.get("/:id/download", (req, res) => {
  const movie = store.getMovieById(req.params.id);

  if (!movie) {
    return res.status(404).json({
      error: "Movie not found"
    });
  }

  const filePath = path.join(uploadDirectory, movie.filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({
      error: "Video file not found"
    });
  }

  const fileStats = fs.statSync(filePath);
  const range = req.headers.range;

  const headers = {
    "Content-Type": "video/mp4",
    "Accept-Ranges": "bytes",
    "Content-Disposition": `attachment; filename="${movie.originalName}"`
  };

  if (!range) {
    res.writeHead(200, {
      ...headers,
      "Content-Length": fileStats.size
    });

    return fs.createReadStream(filePath).pipe(res);
  }

  const parts = range.replace("bytes=", "").split("-");
  const start = Number(parts[0]);
  const requestedEnd = parts[1] ? Number(parts[1]) : fileStats.size - 1;
  const end = Math.min(requestedEnd, fileStats.size - 1);

  if (start >= fileStats.size || start > end) {
    res.status(416).set("Content-Range", `bytes */${fileStats.size}`);
    return res.end();
  }

  res.writeHead(206, {
    ...headers,
    "Content-Range": `bytes ${start}-${end}/${fileStats.size}`,
    "Content-Length": end - start + 1
  });

  fs.createReadStream(filePath, { start, end }).pipe(res);
});

export default router;