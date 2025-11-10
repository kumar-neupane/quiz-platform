import { useAuth } from '@/_core/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { trpc } from '@/lib/trpc';
import { Upload, Trash2, Eye, EyeOff, Plus } from 'lucide-react';
import { useState, useRef } from 'react';
import { toast } from 'sonner';

export default function ProviderDashboard() {
  const { user, isAuthenticated } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [timeLimit, setTimeLimit] = useState('3600');
  const [passingScore, setPassingScore] = useState('50');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: quizzes, isLoading, refetch } = trpc.quiz.getMyQuizzes.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const uploadMutation = trpc.quiz.uploadAndCreateQuiz.useMutation({
    onSuccess: () => {
      toast.success('Quiz created successfully!');
      setIsDialogOpen(false);
      setTitle('');
      setDescription('');
      setTimeLimit('3600');
      setPassingScore('50');
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create quiz');
    },
  });

  const publishMutation = trpc.quiz.publishQuiz.useMutation({
    onSuccess: () => {
      toast.success('Quiz published successfully!');
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to publish quiz');
    },
  });

  const deleteMutation = trpc.quiz.deleteQuiz.useMutation({
    onSuccess: () => {
      toast.success('Quiz deleted successfully!');
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete quiz');
    },
  });

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      toast.error('Please select a PDF file');
      return;
    }

    setIsUploading(true);
    try {
      const buffer = await file.arrayBuffer();
      await uploadMutation.mutateAsync({
        file: Buffer.from(buffer),
        fileName: file.name,
        title: title || file.name.replace('.pdf', ''),
        description,
        timeLimit: parseInt(timeLimit),
        passingScore: parseInt(passingScore),
      });
    } catch (error) {
      console.error('Error uploading file:', error);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Provider Dashboard</CardTitle>
            <CardDescription>Please log in to manage quizzes</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              You need to be logged in to access the provider dashboard.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container max-w-6xl">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Provider Dashboard</h1>
            <p className="text-muted-foreground">Manage your quizzes and upload new PDFs</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="gap-2">
                <Plus className="w-4 h-4" />
                Create New Quiz
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Create New Quiz from PDF</DialogTitle>
                <DialogDescription>
                  Upload a PDF file containing quiz questions. The system will automatically extract and structure the questions.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Quiz Title</label>
                  <Input
                    placeholder="Enter quiz title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Description (Optional)</label>
                  <Textarea
                    placeholder="Enter quiz description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Time Limit (seconds)</label>
                    <Input
                      type="number"
                      value={timeLimit}
                      onChange={(e) => setTimeLimit(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Passing Score (%)</label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={passingScore}
                      onChange={(e) => setPassingScore(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">PDF File</label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf"
                    onChange={handleFileSelect}
                    disabled={isUploading}
                    className="block w-full text-sm text-slate-500
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-full file:border-0
                      file:text-sm file:font-semibold
                      file:bg-blue-50 file:text-blue-700
                      hover:file:bg-blue-100"
                  />
                </div>
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading || !title}
                  className="w-full gap-2"
                >
                  <Upload className="w-4 h-4" />
                  {isUploading ? 'Uploading...' : 'Select PDF and Create Quiz'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading quizzes...</p>
          </div>
        ) : quizzes && quizzes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {quizzes.map((quiz) => (
              <Card key={quiz.id} className="flex flex-col">
                <CardHeader>
                  <CardTitle className="line-clamp-2">{quiz.title}</CardTitle>
                  <CardDescription className="line-clamp-2">
                    {quiz.description || 'No description'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1">
                  <div className="space-y-2 text-sm mb-4">
                    <p>
                      <span className="font-medium">Questions:</span> {quiz.totalQuestions}
                    </p>
                    <p>
                      <span className="font-medium">Time Limit:</span> {Math.floor(quiz.timeLimit / 60)} minutes
                    </p>
                    <p>
                      <span className="font-medium">Passing Score:</span> {quiz.passingScore}%
                    </p>
                    <p>
                      <span className="font-medium">Status:</span>{' '}
                      <span className={quiz.isPublished ? 'text-green-600' : 'text-yellow-600'}>
                        {quiz.isPublished ? 'Published' : 'Draft'}
                      </span>
                    </p>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      size="sm"
                      variant={quiz.isPublished ? 'outline' : 'default'}
                      onClick={() =>
                        publishMutation.mutate({
                          quizId: quiz.id,
                          isPublished: !quiz.isPublished,
                        })
                      }
                      className="gap-1"
                    >
                      {quiz.isPublished ? (
                        <>
                          <EyeOff className="w-3 h-3" />
                          Unpublish
                        </>
                      ) : (
                        <>
                          <Eye className="w-3 h-3" />
                          Publish
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        if (confirm('Are you sure you want to delete this quiz?')) {
                          deleteMutation.mutate({ quizId: quiz.id });
                        }
                      }}
                      className="gap-1"
                    >
                      <Trash2 className="w-3 h-3" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">No quizzes yet. Create your first quiz!</p>
              <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                Create Quiz
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
