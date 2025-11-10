import { useAuth } from '@/_core/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { trpc } from '@/lib/trpc';
import { useLocation } from 'wouter';
import { Clock, BookOpen, BarChart3 } from 'lucide-react';
import { getLoginUrl } from '@/const';

export default function QuizList() {
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();

  const { data: quizzes, isLoading } = trpc.quiz.getMyQuizzes.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container max-w-6xl">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold mb-4">Available Quizzes</h1>
          <p className="text-lg text-muted-foreground">
            Test your knowledge with our interactive quizzes. Each quiz includes a timer and detailed results.
          </p>
        </div>

        {!isAuthenticated ? (
          <Card className="mb-8 border-blue-200 bg-blue-50">
            <CardContent className="pt-6">
              <p className="text-blue-900 mb-4">
                Please log in to take quizzes and track your progress.
              </p>
              <Button asChild>
                <a href={getLoginUrl()}>Log In to Take Quizzes</a>
              </Button>
            </CardContent>
          </Card>
        ) : null}

        {isAuthenticated && (
          <div className="mb-8 flex gap-4">
            <Button onClick={() => navigate('/provider-dashboard')} variant="outline">
              Provider Dashboard
            </Button>
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading quizzes...</p>
          </div>
        ) : quizzes && quizzes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {quizzes.map((quiz) => (
              <Card key={quiz.id} className="flex flex-col hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="line-clamp-2">{quiz.title}</CardTitle>
                  <CardDescription className="line-clamp-2">
                    {quiz.description || 'No description available'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  <div className="space-y-3 mb-6 flex-1">
                    <div className="flex items-center gap-2 text-sm">
                      <BookOpen className="w-4 h-4 text-blue-500" />
                      <span>{quiz.totalQuestions} Questions</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="w-4 h-4 text-orange-500" />
                      <span>{Math.floor(quiz.timeLimit / 60)} Minutes</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <BarChart3 className="w-4 h-4 text-green-500" />
                      <span>Pass: {quiz.passingScore}%</span>
                    </div>
                  </div>
                  {isAuthenticated ? (
                    <Button
                      onClick={() => navigate(`/quiz/take/${quiz.id}`)}
                      className="w-full"
                    >
                      Start Quiz
                    </Button>
                  ) : (
                    <Button asChild className="w-full">
                      <a href={getLoginUrl()}>Log In to Start</a>
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">No quizzes available yet.</p>
              {isAuthenticated && (
                <Button onClick={() => navigate('/provider-dashboard')}>
                  Create First Quiz
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
