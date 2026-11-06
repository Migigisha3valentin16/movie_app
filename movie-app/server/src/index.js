import "dotenv/config";
import express from "express";
import cors from "cors";

import moviesRouter from "./movies.js";
import { login } from "./auth.js";

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.post("/api/auth/login", login);
app.use("/api/movies", moviesRouter);

app.use((error, _req, res, _next) => {
  console.error(error);

  res.status(400).json({
    error: error.message || "Request failed"
  });
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});