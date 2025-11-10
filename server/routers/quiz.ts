import { z } from 'zod';
import { protectedProcedure, publicProcedure, router } from '../_core/trpc';
import * as db from '../db';
import { storagePut, storageGet } from '../storage';
import { extractQuestionsFromPDF, ParsedQuestion } from '../services/pdfParser';
import * as fs from 'fs';
import * as path from 'path';
import { TRPCError } from '@trpc/server';

export const quizRouter = router({
  /**
   * Upload a PDF file and create a quiz from it
   */
  uploadAndCreateQuiz: protectedProcedure
    .input(z.object({
      file: z.instanceof(Buffer),
      fileName: z.string(),
      title: z.string(),
      description: z.string().optional(),
      timeLimit: z.number().default(3600),
      passingScore: z.number().default(50),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        // Save file temporarily for processing
        const tempDir = path.join(process.cwd(), 'temp');
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true });
        }

        const tempFilePath = path.join(tempDir, `${Date.now()}-${input.fileName}`);
        fs.writeFileSync(tempFilePath, input.file);

        // Extract questions from PDF
        const parsedQuestions = await extractQuestionsFromPDF(tempFilePath);

        if (parsedQuestions.length === 0) {
          fs.unlinkSync(tempFilePath);
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'No questions could be extracted from the PDF. Please ensure the PDF contains questions in the format: 1. Question text\na. Option A\nb. Option B\nc. Option C\nd. Option D',
          });
        }

        // Upload file to S3
        const fileKey = `quizzes/${ctx.user.id}/${Date.now()}-${input.fileName}`;
        const { url } = await storagePut(fileKey, input.file, 'application/pdf');

        // Create quiz in database
        const quizResult = await db.createQuiz({
          providerId: ctx.user.id,
          title: input.title,
          description: input.description,
          fileKey: fileKey,
          fileName: input.fileName,
          totalQuestions: parsedQuestions.length,
          timeLimit: input.timeLimit,
          passingScore: input.passingScore,
          isPublished: false,
        });

        const quizId = (quizResult as any).insertId;

        // Create questions in database
        const questionsToInsert = parsedQuestions.map((q, index) => ({
          quizId: quizId,
          questionNumber: index + 1,
          questionText: q.questionText,
          optionA: q.optionA,
          optionB: q.optionB,
          optionC: q.optionC,
          optionD: q.optionD,
          correctAnswer: q.correctAnswer,
          explanation: '',
        }));

        await db.createQuestions(questionsToInsert);

        // Clean up temp file
        fs.unlinkSync(tempFilePath);

        return {
          quizId,
          title: input.title,
          totalQuestions: parsedQuestions.length,
          message: 'Quiz created successfully',
        };
      } catch (error) {
        console.error('Error uploading and creating quiz:', error);
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create quiz from PDF',
        });
      }
    }),

  /**
   * Get all quizzes created by the provider
   */
  getMyQuizzes: protectedProcedure.query(async ({ ctx }) => {
    const quizzes = await db.getQuizzesByProvider(ctx.user.id);
    return quizzes;
  }),

  /**
   * Get a specific quiz by ID
   */
  getQuizById: publicProcedure
    .input(z.object({ quizId: z.number() }))
    .query(async ({ input }) => {
      const quiz = await db.getQuizById(input.quizId);
      if (!quiz) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Quiz not found',
        });
      }
      return quiz;
    }),

  /**
   * Get questions for a quiz
   */
  getQuizQuestions: publicProcedure
    .input(z.object({ quizId: z.number() }))
    .query(async ({ input }) => {
      const questions = await db.getQuestionsByQuizId(input.quizId);
      // Don't expose correct answers to the client
      return questions.map(q => ({
        ...q,
        correctAnswer: undefined,
      }));
    }),

  /**
   * Publish or unpublish a quiz
   */
  publishQuiz: protectedProcedure
    .input(z.object({ quizId: z.number(), isPublished: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const quiz = await db.getQuizById(input.quizId);
      if (!quiz) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Quiz not found',
        });
      }

      if (quiz.providerId !== ctx.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to publish this quiz',
        });
      }

      await db.updateQuiz(input.quizId, { isPublished: input.isPublished });
      return { success: true };
    }),

  /**
   * Delete a quiz
   */
  deleteQuiz: protectedProcedure
    .input(z.object({ quizId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const quiz = await db.getQuizById(input.quizId);
      if (!quiz) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Quiz not found',
        });
      }

      if (quiz.providerId !== ctx.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to delete this quiz',
        });
      }

      await db.deleteQuiz(input.quizId);
      return { success: true };
    }),

  /**
   * Start a quiz attempt
   */
  startQuizAttempt: protectedProcedure
    .input(z.object({ quizId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const quiz = await db.getQuizById(input.quizId);
      if (!quiz) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Quiz not found',
        });
      }

      const attemptResult = await db.createQuizAttempt({
        quizId: input.quizId,
        userId: ctx.user.id,
        status: 'in_progress',
      });

      const attemptId = (attemptResult as any).insertId;

      return {
        attemptId,
        quizId: input.quizId,
        timeLimit: quiz.timeLimit,
      };
    }),

  /**
   * Submit an answer for a question
   */
  submitAnswer: protectedProcedure
    .input(z.object({
      attemptId: z.number(),
      questionId: z.number(),
      selectedAnswer: z.enum(['A', 'B', 'C', 'D']).nullable(),
      timeSpent: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      const attempt = await db.getQuizAttemptById(input.attemptId);
      if (!attempt || attempt.userId !== ctx.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Invalid attempt',
        });
      }

      // Get the question to check the correct answer
      const questions = await db.getQuestionsByQuizId(attempt.quizId);
      const question = questions.find(q => q.id === input.questionId);

      if (!question) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Question not found',
        });
      }

      const isCorrect = input.selectedAnswer === question.correctAnswer;

      await db.createUserResponse({
        attemptId: input.attemptId,
        questionId: input.questionId,
        selectedAnswer: input.selectedAnswer,
        isCorrect,
        timeSpent: input.timeSpent,
      });

      return { isCorrect };
    }),

  /**
   * Complete a quiz attempt and calculate score
   */
  completeQuizAttempt: protectedProcedure
    .input(z.object({
      attemptId: z.number(),
      timeTaken: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      const attempt = await db.getQuizAttemptById(input.attemptId);
      if (!attempt || attempt.userId !== ctx.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Invalid attempt',
        });
      }

      // Get all responses for this attempt
      const responses = await db.getUserResponsesByAttemptId(input.attemptId);
      const correctAnswers = responses.filter(r => r.isCorrect).length;
      const totalMarks = responses.length;
      const score = totalMarks > 0 ? Math.round((correctAnswers / totalMarks) * 100) : 0;

      // Update attempt with results
      await db.updateQuizAttempt(input.attemptId, {
        status: 'completed',
        completedAt: new Date(),
        score,
        totalMarks,
        correctAnswers,
        timeTaken: input.timeTaken,
      });

      return {
        score,
        totalMarks,
        correctAnswers,
        timeTaken: input.timeTaken,
      };
    }),

  /**
   * Get quiz attempt results
   */
  getAttemptResults: protectedProcedure
    .input(z.object({ attemptId: z.number() }))
    .query(async ({ ctx, input }) => {
      const attempt = await db.getQuizAttemptById(input.attemptId);
      if (!attempt || attempt.userId !== ctx.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Invalid attempt',
        });
      }

      const responses = await db.getUserResponsesByAttemptId(input.attemptId);
      const questions = await db.getQuestionsByQuizId(attempt.quizId);

      const detailedResults = responses.map(response => {
        const question = questions.find(q => q.id === response.questionId);
        return {
          questionNumber: question?.questionNumber,
          questionText: question?.questionText,
          selectedAnswer: response.selectedAnswer,
          correctAnswer: question?.correctAnswer,
          isCorrect: response.isCorrect,
          explanation: question?.explanation,
          options: {
            A: question?.optionA,
            B: question?.optionB,
            C: question?.optionC,
            D: question?.optionD,
          },
        };
      });

      return {
        attemptId: input.attemptId,
        quizId: attempt.quizId,
        score: attempt.score,
        totalMarks: attempt.totalMarks,
        correctAnswers: attempt.correctAnswers,
        timeTaken: attempt.timeTaken,
        completedAt: attempt.completedAt,
        results: detailedResults,
      };
    }),

  /**
   * Get user's quiz history
   */
  getQuizHistory: protectedProcedure
    .input(z.object({ quizId: z.number() }))
    .query(async ({ ctx, input }) => {
      const attempts = await db.getUserQuizAttempts(ctx.user.id, input.quizId);
      return attempts;
    }),
});
