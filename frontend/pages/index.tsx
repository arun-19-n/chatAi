import { useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAuth } from '../lib/auth';
import { Code, Sparkles, Zap, Users } from 'lucide-react';

export default function HomePage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="loading-spinner w-8 h-8"></div>
      </div>
    );
  }

  if (isAuthenticated) {
    return null; // Redirecting
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <nav className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Code className="h-8 w-8 text-blue-600" />
            <span className="text-xl font-bold text-gray-900">AI Frontend Playground</span>
          </div>
          <div className="flex items-center space-x-4">
            <Link href="/auth/login" className="btn btn-ghost btn-md">
              Sign In
            </Link>
            <Link href="/auth/signup" className="btn btn-primary btn-md">
              Get Started
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-12">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Build React Components with
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600"> AI Magic</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Generate, preview, and refine React components using powerful AI models. 
            Chat with AI, see live previews, and export your creations instantly.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/signup" className="btn btn-primary btn-lg">
              Start Building Free
            </Link>
            <Link href="#features" className="btn btn-outline btn-lg">
              Learn More
            </Link>
          </div>
        </div>

        {/* Features */}
        <section id="features" className="mt-20">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Why Choose AI Frontend Playground?
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard
              icon={<Sparkles className="h-8 w-8 text-blue-600" />}
              title="AI-Powered Generation"
              description="Generate React components using state-of-the-art AI models like GPT-4, Claude, and more."
            />
            <FeatureCard
              icon={<Zap className="h-8 w-8 text-purple-600" />}
              title="Live Preview"
              description="See your components come to life instantly with our secure sandboxed preview environment."
            />
            <FeatureCard
              icon={<Code className="h-8 w-8 text-green-600" />}
              title="Multiple Frameworks"
              description="Support for React, Vue, and vanilla JavaScript with TailwindCSS styling."
            />
            <FeatureCard
              icon={<Users className="h-8 w-8 text-orange-600" />}
              title="Session Management"
              description="All your work is saved automatically. Resume projects and share with teammates."
            />
            <FeatureCard
              icon={<Sparkles className="h-8 w-8 text-pink-600" />}
              title="Iterative Refinement"
              description="Chat with AI to refine and improve your components with natural language."
            />
            <FeatureCard
              icon={<Zap className="h-8 w-8 text-indigo-600" />}
              title="Export Ready"
              description="Export your components as clean, production-ready code in various formats."
            />
          </div>
        </section>

        {/* CTA */}
        <section className="mt-20 text-center">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white">
            <h3 className="text-3xl font-bold mb-4">Ready to Build Amazing Components?</h3>
            <p className="text-xl mb-6 opacity-90">
              Join thousands of developers using AI to accelerate their frontend development.
            </p>
            <Link href="/auth/signup" className="btn bg-white text-blue-600 hover:bg-gray-100 btn-lg">
              Start Your Free Account
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 mt-20">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Code className="h-6 w-6" />
            <span className="text-lg font-semibold">AI Frontend Playground</span>
          </div>
          <p className="text-gray-400">
            Built with ❤️ for the developer community
          </p>
        </div>
      </footer>
    </div>
  );
}

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <div className="card p-6 text-center hover:shadow-lg transition-shadow">
      <div className="flex justify-center mb-4">{icon}</div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}