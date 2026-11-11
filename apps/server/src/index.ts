import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { prisma } from "./db/prisma";
import { requireAuth } from "./middleware/auth";
import authRouter from "./routes/auth";
import usersRouter from "./routes/users";
import personsRouter from "./routes/persons";
import schoolsRouter from "./routes/schools";
import configRouter from "./routes/config";
import historyRouter from "./routes/history";
import importRouter from "./routes/import";
import asmRouter from "./routes/asm";
import passwordsRouter from "./routes/passwords";
import exportRouter from "./routes/export";
import { requestLogger, errorHandler } from "./middleware/requestLogger";
import { gzipYesterday, logError } from "./lib/logger";
import { initRedis } from "./lib/redis";

dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });
dotenv.config({ path: path.resolve(process.cwd(), ".env"), override: true });
console.log(`Env: pepper=${process.env.PASSWORD_PEPPER ? "set" : "missing"}, admin=${process.env.ADMIN_EMAIL || "default"}`);
if (process.env.NODE_ENV !== "production") {
  console.log(`Dev login: ${process.env.ADMIN_EMAIL || "admin@kids.local"} / ${process.env.ADMIN_PASSWORD || "ChangeMe123!"}`);
}
const app = express();
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(requestLogger);

app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.use("/api/auth", authRouter);
app.use("/api/users", requireAuth, usersRouter);
app.use("/api/persons", requireAuth, personsRouter);
app.use("/api/schools", requireAuth, schoolsRouter);
app.use("/api/config", requireAuth, configRouter);
app.use("/api/history", requireAuth, historyRouter);
app.use("/api/import", requireAuth, importRouter);
app.use("/api/asm", requireAuth, asmRouter);
app.use("/api/passwords", requireAuth, passwordsRouter);
app.use("/api/export", requireAuth, exportRouter);

const port = process.env.PORT || 7420;
app.use(errorHandler);
process.on("uncaughtException", (err) => logError(err, { source: "uncaughtException" }));
process.on("unhandledRejection", (err: any) => logError(err, { source: "unhandledRejection" }));
app.listen(port, async () => {
  gzipYesterday();
  await initRedis();
  console.log(`Server on :${port}`);
});

process.on("SIGTERM", () => prisma.$disconnect());