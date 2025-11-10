import { boolean, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Quizzes table - stores quiz metadata and source file information
 */
export const quizzes = mysqlTable("quizzes", {
  id: int("id").autoincrement().primaryKey(),
  providerId: int("providerId").notNull().references(() => users.id),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  fileKey: varchar("fileKey", { length: 255 }).notNull(),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  totalQuestions: int("totalQuestions").notNull().default(0),
  timeLimit: int("timeLimit").notNull().default(3600),
  passingScore: int("passingScore").notNull().default(50),
  isPublished: boolean("isPublished").notNull().default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Quiz = typeof quizzes.$inferSelect;
export type InsertQuiz = typeof quizzes.$inferInsert;

/**
 * Questions table - stores individual quiz questions
 */
export const questions = mysqlTable("questions", {
  id: int("id").autoincrement().primaryKey(),
  quizId: int("quizId").notNull().references(() => quizzes.id, { onDelete: "cascade" }),
  questionNumber: int("questionNumber").notNull(),
  questionText: text("questionText").notNull(),
  optionA: text("optionA").notNull(),
  optionB: text("optionB").notNull(),
  optionC: text("optionC").notNull(),
  optionD: text("optionD").notNull(),
  correctAnswer: varchar("correctAnswer", { length: 1 }).notNull(),
  explanation: text("explanation"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Question = typeof questions.$inferSelect;
export type InsertQuestion = typeof questions.$inferInsert;

/**
 * Quiz attempts table - tracks each user's quiz attempt
 */
export const quizAttempts = mysqlTable("quizAttempts", {
  id: int("id").autoincrement().primaryKey(),
  quizId: int("quizId").notNull().references(() => quizzes.id, { onDelete: "cascade" }),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
  score: int("score"),
  totalMarks: int("totalMarks"),
  correctAnswers: int("correctAnswers"),
  timeTaken: int("timeTaken"),
  status: mysqlEnum("status", ["in_progress", "completed", "abandoned"]).notNull().default("in_progress"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type QuizAttempt = typeof quizAttempts.$inferSelect;
export type InsertQuizAttempt = typeof quizAttempts.$inferInsert;

/**
 * User responses table - stores individual answer responses
 */
export const userResponses = mysqlTable("userResponses", {
  id: int("id").autoincrement().primaryKey(),
  attemptId: int("attemptId").notNull().references(() => quizAttempts.id, { onDelete: "cascade" }),
  questionId: int("questionId").notNull().references(() => questions.id, { onDelete: "cascade" }),
  selectedAnswer: varchar("selectedAnswer", { length: 1 }),
  isCorrect: boolean("isCorrect"),
  timeSpent: int("timeSpent"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type UserResponse = typeof userResponses.$inferSelect;
export type InsertUserResponse = typeof userResponses.$inferInsert;
