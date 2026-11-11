import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import hpp from "hpp";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import crypto from "crypto";
import { prisma } from "./db/prisma";
import { requireAuth } from "./middleware/auth";
import { errorHandler } from "./middleware/errorHandler";
import { logger } from "./services/logger";

import authRouter from "./routes/auth";
import importRouter from "./routes/import";
import personsRouter from "./routes/persons";
import schoolsRouter from "./routes/schools";
import configRouter from "./routes/config";
import exportRouter from "./routes/export";
import passwordsRouter from "./routes/passwords";
import asmRouter from "./routes/asm";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 7420;

const c = {
  reset: "\x1b[0m", bold: "\x1b[1m", dim: "\x1b[2m",
  cyan: "\x1b[36m", green: "\x1b[32m", yellow: "\x1b[33m",
};

app.use(helmet());
app.use(compression());
app.use(hpp());
app.use(cors({ origin: process.env.CORS_ORIGIN || "http://localhost:7430", credentials: true }));
app.use(express.json({ limit: "20mb" }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 200 }));

app.use((req, _res, next) => {
  (req as any).requestId = crypto.randomUUID().slice(0, 8);
  const t = new Date().toISOString().slice(11, 19);
  console.log(`${c.dim}${t}${c.reset} ${c.cyan}${req.method}${c.reset} ${req.path} ${c.dim}${(req as any).requestId}${c.reset}`);
  logger.info(`${req.method} ${req.path}`, { requestId: (req as any).requestId });
  next();
});

app.get("/health", (_req, res) => res.json({ ok: true, time: new Date().toISOString() }));

app.use("/api/auth", authRouter);
app.use("/api/import", requireAuth, importRouter);
app.use("/api/persons", requireAuth, personsRouter);
app.use("/api/schools", requireAuth, schoolsRouter);
app.use("/api/config", requireAuth, configRouter);
app.use("/api/export", requireAuth, exportRouter);
app.use("/api/passwords", requireAuth, passwordsRouter);
app.use("/api/asm", requireAuth, asmRouter);

app.use(errorHandler);

app.listen(PORT, () => {
  console.log("");
  console.log(`${c.bold}${c.green}  KIDS API${c.reset}  ${c.dim}ready${c.reset}`);
  console.log(`${c.dim}  Local:${c.reset}   ${c.cyan}http://localhost:${PORT}${c.reset}`);
  console.log(`${c.dim}  Health:${c.reset}  ${c.cyan}http://localhost:${PORT}/health${c.reset}`);
  console.log(`${c.dim}  Logs:${c.reset}    ${c.cyan}${process.env.LOG_DIR || "./logs"}${c.reset}`);
  console.log("");
  logger.info("Server started", { port: PORT });
});

process.on("SIGTERM", async () => {
  logger.info("Shutting down");
  await prisma.$disconnect();
  process.exit(0);
});