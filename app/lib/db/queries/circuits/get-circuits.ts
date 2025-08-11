import { getPool } from '@/app/lib/db/db';
import { BoardName } from '@/app/lib/types';
import { getTable } from '../util/table-select';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { eq, or, desc } from 'drizzle-orm';

export interface Circuit {
  uuid: string;
  name: string | null;
  description: string | null;
  color: string | null;
  userId: number | null;
  isPublic: boolean | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface CircuitWithClimbs extends Circuit {
  climbUuids: string[];
}

export async function getCircuitsByUser(boardName: BoardName, userId: number): Promise<Circuit[]> {
  const pool = getPool();
  const client = await pool.connect();

  try {
    const db = drizzle(client);
    const circuitsTable = getTable('circuits', boardName);

    const circuits = await db
      .select()
      .from(circuitsTable)
      .where(eq(circuitsTable.userId, userId))
      .orderBy(desc(circuitsTable.updatedAt));

    return circuits as Circuit[];
  } finally {
    client.release();
  }
}

export async function getPublicCircuits(boardName: BoardName, limit = 50): Promise<Circuit[]> {
  const pool = getPool();
  const client = await pool.connect();

  try {
    const db = drizzle(client);
    const circuitsTable = getTable('circuits', boardName);

    const circuits = await db
      .select()
      .from(circuitsTable)
      .where(eq(circuitsTable.isPublic, true))
      .orderBy(desc(circuitsTable.updatedAt))
      .limit(limit);

    return circuits as Circuit[];
  } finally {
    client.release();
  }
}

export async function getUserAndPublicCircuits(boardName: BoardName, userId?: number): Promise<Circuit[]> {
  const pool = getPool();
  const client = await pool.connect();

  try {
    const db = drizzle(client);
    const circuitsTable = getTable('circuits', boardName);

    let whereCondition;
    if (userId) {
      whereCondition = or(
        eq(circuitsTable.userId, userId),
        eq(circuitsTable.isPublic, true)
      );
    } else {
      whereCondition = eq(circuitsTable.isPublic, true);
    }

    const circuits = await db
      .select()
      .from(circuitsTable)
      .where(whereCondition)
      .orderBy(desc(circuitsTable.updatedAt));

    return circuits as Circuit[];
  } finally {
    client.release();
  }
}

export async function getClimbsByCircuit(boardName: BoardName, circuitUuid: string): Promise<string[]> {
  const pool = getPool();
  const client = await pool.connect();

  try {
    const db = drizzle(client);
    const circuitsClimbsTable = getTable('circuitsClimbs', boardName);

    const climbs = await db
      .select({
        climbUuid: circuitsClimbsTable.climbUuid,
        position: circuitsClimbsTable.position,
      })
      .from(circuitsClimbsTable)
      .where(eq(circuitsClimbsTable.circuitUuid, circuitUuid))
      .orderBy(circuitsClimbsTable.position || circuitsClimbsTable.climbUuid); // fallback to uuid if position is null

    return climbs.map((c) => c.climbUuid);
  } finally {
    client.release();
  }
}

export async function getCircuitsForClimb(boardName: BoardName, climbUuid: string): Promise<Circuit[]> {
  const pool = getPool();
  const client = await pool.connect();

  try {
    const db = drizzle(client);
    const circuitsTable = getTable('circuits', boardName);
    const circuitsClimbsTable = getTable('circuitsClimbs', boardName);

    const circuits = await db
      .select({
        uuid: circuitsTable.uuid,
        name: circuitsTable.name,
        description: circuitsTable.description,
        color: circuitsTable.color,
        userId: circuitsTable.userId,
        isPublic: circuitsTable.isPublic,
        createdAt: circuitsTable.createdAt,
        updatedAt: circuitsTable.updatedAt,
      })
      .from(circuitsTable)
      .innerJoin(
        circuitsClimbsTable,
        eq(circuitsTable.uuid, circuitsClimbsTable.circuitUuid)
      )
      .where(eq(circuitsClimbsTable.climbUuid, climbUuid));

    return circuits as Circuit[];
  } finally {
    client.release();
  }
}

export async function getCircuitWithClimbs(boardName: BoardName, circuitUuid: string): Promise<CircuitWithClimbs | null> {
  const pool = getPool();
  const client = await pool.connect();

  try {
    const db = drizzle(client);
    const circuitsTable = getTable('circuits', boardName);

    const [circuit] = await db
      .select()
      .from(circuitsTable)
      .where(eq(circuitsTable.uuid, circuitUuid))
      .limit(1);

    if (!circuit) {
      return null;
    }

    const climbUuids = await getClimbsByCircuit(boardName, circuitUuid);

    return {
      ...(circuit as Circuit),
      climbUuids,
    };
  } finally {
    client.release();
  }
}