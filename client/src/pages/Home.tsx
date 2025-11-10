import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { APP_LOGO, APP_TITLE, getLoginUrl } from "@/const";
import { useLocation } from 'wouter';

export default function Home() {
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 container max-w-4xl mx-auto py-12 px-4">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4">Interactive Quiz Platform</h1>
          <p className="text-xl text-muted-foreground mb-8">
            Test your knowledge with interactive quizzes. Upload PDFs, create quizzes, and track your progress.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Button size="lg" onClick={() => navigate('/quiz')}>
              Browse Quizzes
            </Button>
            {isAuthenticated ? (
              <Button size="lg" variant="outline" onClick={() => navigate('/provider-dashboard')}>
                Create Quiz
              </Button>
            ) : (
              <Button size="lg" variant="outline" asChild>
                <a href={getLoginUrl()}>Get Started</a>
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-6 border rounded-lg">
            <h3 className="text-xl font-semibold mb-2">Upload PDFs</h3>
            <p className="text-muted-foreground">
              Upload PDF files containing quiz questions and we will automatically extract and structure them.
            </p>
          </div>
          <div className="p-6 border rounded-lg">
            <h3 className="text-xl font-semibold mb-2">Timed Quizzes</h3>
            <p className="text-muted-foreground">
              Take quizzes with built-in timers. Manage your time effectively and see your performance.
            </p>
          </div>
          <div className="p-6 border rounded-lg">
            <h3 className="text-xl font-semibold mb-2">Detailed Results</h3>
            <p className="text-muted-foreground">
              Get comprehensive results with detailed answer reviews and explanations for each question.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
