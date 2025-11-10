import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { Clock, BookOpen, BarChart3 } from "lucide-react";

export default function QuizzesList() {
  const [, navigate] = useLocation();

  // Get all published quizzes
  const { data: quizzes, isLoading } = trpc.quiz.getMyQuizzes.useQuery();

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container max-w-6xl">
        {/* Header */}
        <div className="mb-12">
          <Button 
            variant="outline" 
            onClick={() => navigate('/')}
            className="mb-6"
          >
            ← Back to Home
          </Button>
          <h1 className="text-4xl font-bold mb-4">Available Quizzes</h1>
          <p className="text-lg text-muted-foreground">
            Choose a quiz and test your knowledge. Each quiz includes a timer and detailed results.
          </p>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading quizzes...</p>
          </div>
        ) : quizzes && quizzes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {quizzes.map((quiz) => (
              <Card 
                key={quiz.id} 
                className="flex flex-col hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => navigate(`/quiz/take/${quiz.id}`)}
              >
                <CardHeader>
                  <CardTitle className="line-clamp-2">{quiz.title}</CardTitle>
                  <CardDescription className="line-clamp-2">
                    {quiz.description || 'Test your knowledge'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  <div className="space-y-3 mb-6 flex-1">
                    <div className="flex items-center gap-2 text-sm">
                      <BookOpen className="w-4 h-4 text-blue-500 flex-shrink-0" />
                      <span className="text-gray-700">{quiz.totalQuestions} Questions</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="w-4 h-4 text-orange-500 flex-shrink-0" />
                      <span className="text-gray-700">{Math.floor(quiz.timeLimit / 60)} Minutes</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <BarChart3 className="w-4 h-4 text-green-500 flex-shrink-0" />
                      <span className="text-gray-700">Pass: {quiz.passingScore}%</span>
                    </div>
                  </div>
                  <Button className="w-full">
                    Start Quiz
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">No quizzes available yet.</p>
              <Button onClick={() => navigate('/')}>
                Go Back Home
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
