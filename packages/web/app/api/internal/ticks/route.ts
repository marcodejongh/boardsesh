import { getServerSession } from "next-auth/next";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/app/lib/db/db";
import * as schema from "@/app/lib/db/schema";
import { eq, and, inArray, desc } from "drizzle-orm";
import { z } from "zod";
import { authOptions } from "@/app/lib/auth/auth-options";
import { generateUuid } from "@/app/lib/api-wrappers/aurora/util";

const tickStatusSchema = z.enum(["flash", "send", "attempt"]);

const saveTickSchema = z.object({
  boardType: z.enum(["kilter", "tension"]),
  climbUuid: z.string().min(1),
  angle: z.number().int(),
  isMirror: z.boolean().default(false),
  status: tickStatusSchema,
  attemptCount: z.number().int().min(1).default(1),
  quality: z.number().int().min(1).max(5).optional().nullable(), // 1-5 stars, null for attempts
  difficulty: z.number().int().optional().nullable(), // null for attempts
  isBenchmark: z.boolean().default(false),
  comment: z.string().default(""),
  climbedAt: z.string(), // ISO date string
  sessionId: z.string().optional(), // Optional party mode session
}).refine(
  (data) => {
    // Flash must have attemptCount of 1
    if (data.status === "flash" && data.attemptCount !== 1) {
      return false;
    }
    // Send must have attemptCount > 1
    if (data.status === "send" && data.attemptCount <= 1) {
      return false;
    }
    return true;
  },
  {
    message: "Flash requires attemptCount of 1, send requires attemptCount > 1",
    path: ["attemptCount"]
  }
).refine(
  (data) => {
    // Attempts (failed) should not have quality ratings
    if (data.status === "attempt" && data.quality !== undefined && data.quality !== null) {
      return false;
    }
    return true;
  },
  {
    message: "Attempts cannot have quality ratings",
    path: ["quality"]
  }
);

export type SaveTickInput = z.infer<typeof saveTickSchema>;

// Custom error classes for specific error types
class ValidationError extends Error {
  constructor(message: string, public details?: unknown) {
    super(message);
    this.name = "ValidationError";
  }
}

class AuthenticationError extends Error {
  constructor(message: string = "Unauthorized") {
    super(message);
    this.name = "AuthenticationError";
  }
}

class DatabaseError extends Error {
  constructor(message: string, public originalError?: unknown) {
    super(message);
    this.name = "DatabaseError";
  }
}

// POST: Save a new tick
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      throw new AuthenticationError();
    }

    let body;
    try {
      body = await request.json();
    } catch {
      throw new ValidationError("Invalid JSON in request body");
    }

    const validationResult = saveTickSchema.safeParse(body);

    if (!validationResult.success) {
      throw new ValidationError("Invalid request data", validationResult.error.issues);
    }

    const data = validationResult.data;
    const db = getDb();
    const uuid = generateUuid();

    // Use ISO format consistently for all timestamps
    const now = new Date().toISOString();
    const climbedAt = new Date(data.climbedAt).toISOString();

    // Save to local database
    let savedTick;
    try {
      const [result] = await db
        .insert(schema.boardseshTicks)
        .values({
          uuid,
          userId: session.user.id,
          boardType: data.boardType,
          climbUuid: data.climbUuid,
          angle: data.angle,
          isMirror: data.isMirror,
          status: data.status,
          attemptCount: data.status === "flash" ? 1 : data.attemptCount,
          quality: data.quality ?? null,
          difficulty: data.difficulty ?? null,
          isBenchmark: data.isBenchmark,
          comment: data.comment,
          climbedAt,
          createdAt: now,
          updatedAt: now,
          sessionId: data.sessionId ?? null,
          // Aurora sync fields are null - will be populated by periodic sync job
          auroraType: null,
          auroraId: null,
          auroraSyncedAt: null,
          auroraSyncError: null,
        })
        .returning();
      savedTick = result;
    } catch (dbError) {
      throw new DatabaseError("Failed to insert tick into database", dbError);
    }

    return NextResponse.json({ tick: savedTick });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message, code: "AUTH_ERROR" }, { status: 401 });
    }

    if (error instanceof ValidationError) {
      return NextResponse.json(
        { error: error.message, code: "VALIDATION_ERROR", details: error.details },
        { status: 400 }
      );
    }

    if (error instanceof DatabaseError) {
      console.error("Database error saving tick:", error.originalError);
      return NextResponse.json(
        { error: "Failed to save tick to database", code: "DB_ERROR" },
        { status: 500 }
      );
    }

    console.error("Unexpected error saving tick:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

// GET: Get user's ticks (logbook entries)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ entries: [] });
    }

    const { searchParams } = new URL(request.url);
    const boardType = searchParams.get("boardType");
    const climbUuidsParam = searchParams.get("climbUuids");

    if (!boardType || !["kilter", "tension"].includes(boardType)) {
      return NextResponse.json({ error: "Invalid board type" }, { status: 400 });
    }

    const climbUuids = climbUuidsParam ? climbUuidsParam.split(",") : undefined;

    const db = getDb();

    // Build query conditions
    const conditions = [
      eq(schema.boardseshTicks.userId, session.user.id),
      eq(schema.boardseshTicks.boardType, boardType),
    ];

    if (climbUuids && climbUuids.length > 0) {
      conditions.push(inArray(schema.boardseshTicks.climbUuid, climbUuids));
    }

    // Fetch ticks
    const ticks = await db
      .select()
      .from(schema.boardseshTicks)
      .where(and(...conditions))
      .orderBy(desc(schema.boardseshTicks.climbedAt));

    // Transform to a format compatible with existing LogbookEntry interface
    const entries = ticks.map((tick) => ({
      uuid: tick.uuid,
      climb_uuid: tick.climbUuid,
      angle: tick.angle,
      is_mirror: tick.isMirror ?? false,
      user_id: 0, // Not used for local entries
      attempt_id: 0,
      tries: tick.attemptCount,
      quality: tick.quality,
      difficulty: tick.difficulty,
      is_benchmark: tick.isBenchmark ?? false,
      is_listed: true,
      comment: tick.comment ?? "",
      climbed_at: tick.climbedAt,
      created_at: tick.createdAt,
      updated_at: tick.updatedAt,
      wall_uuid: null,
      // Map status to is_ascent for compatibility
      is_ascent: tick.status === "flash" || tick.status === "send",
      // Include new fields
      status: tick.status,
      aurora_synced: tick.auroraId !== null,
    }));

    return NextResponse.json({ entries });
  } catch (error) {
    console.error("Failed to get ticks:", error);
    return NextResponse.json({ error: "Failed to get ticks" }, { status: 500 });
  }
}
