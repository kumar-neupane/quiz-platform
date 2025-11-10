import { useAuth } from '@/_core/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { trpc } from '@/lib/trpc';
import { useParams, useLocation } from 'wouter';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react';

interface Question {
  id: number;
  questionNumber: number;
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
}

export default function QuizTaking() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const params = useParams<{ quizId?: string }>();
  const quizId = parseInt(params.quizId || '0');

  const [attemptId, setAttemptId] = useState<number | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string | null>>({});
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [questionStartTime, setQuestionStartTime] = useState<number | null>(null);

  const { data: quiz } = trpc.quiz.getQuizById.useQuery({ quizId });
  const { data: questions } = trpc.quiz.getQuizQuestions.useQuery({ quizId });

  const startAttemptMutation = trpc.quiz.startQuizAttempt.useMutation({
    onSuccess: (data) => {
      setAttemptId(data.attemptId);
      setTimeRemaining(data.timeLimit);
      setStartTime(Date.now());
      setQuestionStartTime(Date.now());
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to start quiz');
      navigate('/quiz', { replace: true });
    },
  });

  const submitAnswerMutation = trpc.quiz.submitAnswer.useMutation();

  const completeAttemptMutation = trpc.quiz.completeQuizAttempt.useMutation({
    onSuccess: (data) => {
      navigate(`/quiz/results/${attemptId}`, { replace: true });
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to complete quiz');
    },
  });

  // Start quiz on mount
  useEffect(() => {
    if (isAuthenticated && quizId && !attemptId) {
      startAttemptMutation.mutate({ quizId });
    }
  }, [isAuthenticated, quizId, attemptId]);

  // Timer countdown
  useEffect(() => {
    if (timeRemaining === null) return;

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev === null || prev <= 0) {
          clearInterval(interval);
          handleCompleteQuiz();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timeRemaining]);

  const handleSelectAnswer = async (answer: string) => {
    if (!attemptId || !questions) return;

    const currentQuestion = questions[currentQuestionIndex];
    const timeSpent = questionStartTime ? Math.floor((Date.now() - questionStartTime) / 1000) : 0;

    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: answer,
    }));

    await submitAnswerMutation.mutateAsync({
      attemptId,
      questionId: currentQuestion.id,
      selectedAnswer: answer as 'A' | 'B' | 'C' | 'D',
      timeSpent,
    });
  };

  const handleNextQuestion = () => {
    if (questions && currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
      setQuestionStartTime(Date.now());
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
      setQuestionStartTime(Date.now());
    }
  };

  const handleCompleteQuiz = async () => {
    if (!attemptId || !startTime) return;

    const timeTaken = Math.floor((Date.now() - startTime) / 1000);
    await completeAttemptMutation.mutateAsync({
      attemptId,
      timeTaken,
    });
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Login Required</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">Please log in to take a quiz.</p>
            <Button onClick={() => navigate('/')} className="w-full">
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!quiz || !questions || !attemptId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading quiz...</p>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;
  const formattedTime = timeRemaining
    ? `${Math.floor(timeRemaining / 60)}:${String(timeRemaining % 60).padStart(2, '0')}`
    : '0:00';

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container max-w-2xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-3xl font-bold">{quiz.title}</h1>
              <p className="text-muted-foreground">
                Question {currentQuestionIndex + 1} of {questions.length}
              </p>
            </div>
            <div className="flex items-center gap-2 bg-red-50 text-red-700 px-4 py-2 rounded-lg font-semibold">
              <Clock className="w-4 h-4" />
              {formattedTime}
            </div>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Question Card */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-xl">{currentQuestion.questionText}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { label: 'A', text: currentQuestion.optionA },
                { label: 'B', text: currentQuestion.optionB },
                { label: 'C', text: currentQuestion.optionC },
                { label: 'D', text: currentQuestion.optionD },
              ].map((option) => (
                <button
                  key={option.label}
                  onClick={() => handleSelectAnswer(option.label)}
                  className={`w-full p-4 text-left border-2 rounded-lg transition-all ${
                    answers[currentQuestion.id] === option.label
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-border hover:border-blue-300'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        answers[currentQuestion.id] === option.label
                          ? 'border-blue-500 bg-blue-500 text-white'
                          : 'border-border'
                      }`}
                    >
                      {answers[currentQuestion.id] === option.label && '✓'}
                    </div>
                    <div>
                      <div className="font-semibold">{option.label}.</div>
                      <div className="text-sm text-muted-foreground">{option.text}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between gap-4">
          <Button
            onClick={handlePreviousQuestion}
            disabled={currentQuestionIndex === 0}
            variant="outline"
            className="gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </Button>

          {currentQuestionIndex === questions.length - 1 ? (
            <Button
              onClick={handleCompleteQuiz}
              disabled={completeAttemptMutation.isPending}
              className="gap-2"
            >
              {completeAttemptMutation.isPending ? 'Submitting...' : 'Submit Quiz'}
            </Button>
          ) : (
            <Button
              onClick={handleNextQuestion}
              className="gap-2"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
