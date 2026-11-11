import dotenv from "dotenv";
import path from "path";
import { PrismaClient } from "@prisma/client";

const rootEnv = path.resolve(process.cwd(), "../../.env");
const localEnv = path.resolve(process.cwd(), ".env");
dotenv.config({ path: rootEnv });
dotenv.config({ path: localEnv, override: true });

const url = process.env.DATABASE_URL || "";
const masked = url.replace(/:([^:@]+)@/, ":***@");
console.log(`DB: ${masked || "(DATABASE_URL not set)"}`);
console.log(`  loaded: ${rootEnv} / ${localEnv}`);

export const prisma = new PrismaClient();