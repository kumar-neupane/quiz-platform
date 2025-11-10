import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocation } from 'wouter';
import { Clock, BookOpen, BarChart3, ArrowRight } from 'lucide-react';

export default function Home() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Navigation */}
      <nav className="border-b bg-white sticky top-0 z-50">
        <div className="container max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-blue-600">Quiz Platform</h1>
          <Button onClick={() => navigate('/quizzes')} size="lg">
            Start Quiz
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container max-w-6xl mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="text-5xl font-bold mb-6">Test Your Knowledge</h2>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Take interactive quizzes with real-time feedback, detailed scoring, and comprehensive answer reviews.
          </p>
          <Button 
            size="lg" 
            onClick={() => navigate('/quizzes')}
            className="text-lg px-8 py-6"
          >
            Browse Available Quizzes
          </Button>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
          <Card>
            <CardHeader>
              <BookOpen className="w-8 h-8 text-blue-600 mb-2" />
              <CardTitle>Multiple Quizzes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Choose from a variety of quizzes covering different topics and difficulty levels.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Clock className="w-8 h-8 text-orange-600 mb-2" />
              <CardTitle>Timed Challenges</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Each quiz has a built-in timer to help you manage your time effectively.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <BarChart3 className="w-8 h-8 text-green-600 mb-2" />
              <CardTitle>Instant Results</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Get detailed results with explanations for each answer immediately after completion.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-blue-600 text-white py-16 mt-16">
        <div className="container max-w-6xl mx-auto px-4 text-center">
          <h3 className="text-3xl font-bold mb-4">Ready to Test Your Skills?</h3>
          <p className="text-blue-100 mb-8 max-w-2xl mx-auto">
            Start taking quizzes now and track your progress across different topics.
          </p>
          <Button 
            size="lg" 
            onClick={() => navigate('/quizzes')}
            variant="secondary"
            className="text-lg px-8 py-6"
          >
            Browse Quizzes Now
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8">
        <div className="container max-w-6xl mx-auto px-4 text-center">
          <p>&copy; 2024 Interactive Quiz Platform. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
