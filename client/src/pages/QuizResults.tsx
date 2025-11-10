import { useAuth } from '@/_core/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { trpc } from '@/lib/trpc';
import { useParams, useLocation } from 'wouter';
import { CheckCircle, XCircle, Clock, Award } from 'lucide-react';

export default function QuizResults() {
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const params = useParams<{ attemptId?: string }>();
  const attemptId = parseInt(params.attemptId || '0');

  const { data: results, isLoading } = trpc.quiz.getAttemptResults.useQuery(
    { attemptId },
    { enabled: isAuthenticated && attemptId > 0 }
  );

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Login Required</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">Please log in to view results.</p>
            <Button onClick={() => navigate('/')} className="w-full">
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading || !results) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading results...</p>
      </div>
    );
  }

  const percentage = (results.totalMarks ?? 0) > 0 ? Math.round(((results.correctAnswers ?? 0) / (results.totalMarks ?? 1)) * 100) : 0;
  const isPassed = percentage >= 50; // Assuming 50% is passing

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container max-w-3xl">
        {/* Score Summary */}
        <Card className="mb-8 border-2 border-green-200 bg-green-50">
          <CardContent className="pt-8">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-white border-4 border-green-500 mb-4">
                <span className="text-4xl font-bold text-green-600">{percentage}%</span>
              </div>
              <h1 className="text-3xl font-bold mb-2">
                {isPassed ? '🎉 Congratulations!' : 'Quiz Completed'}
              </h1>
              <p className="text-lg text-muted-foreground">
                You scored {results.correctAnswers ?? 0} out of {results.totalMarks ?? 0} questions correctly
              </p>
            </div>

            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="bg-white p-4 rounded-lg">
                <Award className="w-6 h-6 mx-auto mb-2 text-blue-500" />
                <p className="text-sm text-muted-foreground">Correct</p>
                <p className="text-2xl font-bold">{results.correctAnswers ?? 0}</p>
              </div>
              <div className="bg-white p-4 rounded-lg">
                <XCircle className="w-6 h-6 mx-auto mb-2 text-red-500" />
                <p className="text-sm text-muted-foreground">Incorrect</p>
                <p className="text-2xl font-bold">{(results.totalMarks ?? 0) - (results.correctAnswers ?? 0)}</p>
              </div>
              <div className="bg-white p-4 rounded-lg">
                <Clock className="w-6 h-6 mx-auto mb-2 text-orange-500" />
                <p className="text-sm text-muted-foreground">Time Taken</p>
                <p className="text-2xl font-bold">
                  {Math.floor((results.timeTaken ?? 0) / 60)}:{String((results.timeTaken ?? 0) % 60).padStart(2, '0')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Detailed Results */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">Answer Review</h2>
          <div className="space-y-4">
            {results.results.map((result, index) => (
              <Card key={index} className={result.isCorrect ? 'border-green-200' : 'border-red-200'}>
                <CardHeader className={result.isCorrect ? 'bg-green-50' : 'bg-red-50'}>
                  <div className="flex items-start gap-3">
                    {result.isCorrect ? (
                      <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                    ) : (
                      <XCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
                    )}
                    <div className="flex-1">
                      <CardTitle className="text-lg">
                        Question {result.questionNumber}: {result.questionText}
                      </CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    {Object.entries(result.options).map(([letter, text]) => (
                      <div
                        key={letter}
                        className={`p-3 rounded-lg border-2 ${
                          letter === result.correctAnswer
                            ? 'border-green-500 bg-green-50'
                            : letter === result.selectedAnswer && !result.isCorrect
                            ? 'border-red-500 bg-red-50'
                            : 'border-border'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="font-semibold text-sm">{letter}.</div>
                          <div className="text-sm flex-1">{text}</div>
                          {letter === result.correctAnswer && (
                            <span className="text-xs font-semibold text-green-600">✓ Correct</span>
                          )}
                          {letter === result.selectedAnswer && !result.isCorrect && (
                            <span className="text-xs font-semibold text-red-600">✗ Your answer</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  {result.explanation && (
                    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm font-semibold text-blue-900 mb-1">Explanation:</p>
                      <p className="text-sm text-blue-800">{result.explanation}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4 justify-center">
          <Button variant="outline" onClick={() => navigate('/quiz')}>
            Back to Quizzes
          </Button>
          <Button onClick={() => navigate('/quiz')}>
            Take Another Quiz
          </Button>
        </div>
      </div>
    </div>
  );
}
