import { eq, and, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, quizzes, questions, quizAttempts, userResponses, Quiz, Question, QuizAttempt, UserResponse } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Quiz-related database functions

export async function createQuiz(quiz: typeof quizzes.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(quizzes).values(quiz);
  return result;
}

export async function getQuizzesByProvider(providerId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db.select().from(quizzes).where(eq(quizzes.providerId, providerId)).orderBy(desc(quizzes.createdAt));
}

export async function getQuizById(quizId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.select().from(quizzes).where(eq(quizzes.id, quizId)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function updateQuiz(quizId: number, updates: Partial<typeof quizzes.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db.update(quizzes).set(updates).where(eq(quizzes.id, quizId));
}

export async function deleteQuiz(quizId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db.delete(quizzes).where(eq(quizzes.id, quizId));
}

// Question-related functions

export async function createQuestions(questionList: typeof questions.$inferInsert[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db.insert(questions).values(questionList);
}

export async function getQuestionsByQuizId(quizId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db.select().from(questions).where(eq(questions.quizId, quizId)).orderBy(questions.questionNumber);
}

export async function deleteQuestionsByQuizId(quizId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db.delete(questions).where(eq(questions.quizId, quizId));
}

// Quiz attempt functions

export async function createQuizAttempt(attempt: typeof quizAttempts.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(quizAttempts).values(attempt);
  return result;
}

export async function getQuizAttemptById(attemptId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.select().from(quizAttempts).where(eq(quizAttempts.id, attemptId)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function updateQuizAttempt(attemptId: number, updates: Partial<typeof quizAttempts.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db.update(quizAttempts).set(updates).where(eq(quizAttempts.id, attemptId));
}

export async function getUserQuizAttempts(userId: number, quizId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db.select().from(quizAttempts).where(
    and(eq(quizAttempts.userId, userId), eq(quizAttempts.quizId, quizId))
  ).orderBy(desc(quizAttempts.createdAt));
}

// User response functions

export async function createUserResponse(response: typeof userResponses.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db.insert(userResponses).values(response);
}

export async function createUserResponses(responseList: typeof userResponses.$inferInsert[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db.insert(userResponses).values(responseList);
}

export async function getUserResponsesByAttemptId(attemptId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db.select().from(userResponses).where(eq(userResponses.attemptId, attemptId));
}

export async function updateUserResponse(responseId: number, updates: Partial<typeof userResponses.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db.update(userResponses).set(updates).where(eq(userResponses.id, responseId));
}
