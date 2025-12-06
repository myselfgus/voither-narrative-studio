import React, { Component, ErrorInfo } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { AlertTriangle } from 'lucide-react';
interface Props {
  children: React.ReactNode;
}
interface State {
  hasError: boolean;
  error?: Error;
}
export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };
  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }
  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    // You can also log the error to an error reporting service
    // errorReporter.report(error, errorInfo);
    toast.error("An unexpected error occurred", {
      description: "The application encountered a problem. Please try refreshing the page.",
      duration: 10000,
    });
  }
  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
    // You might want to reload the page for a full reset
    window.location.reload();
  };
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen w-screen items-center justify-center bg-background" role="alert">
          <div className="text-center">
            <AlertTriangle className="mx-auto h-12 w-12 text-destructive" />
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-5xl">
              Something went wrong
            </h1>
            <p className="mt-6 text-base leading-7 text-muted-foreground">
              We're sorry for the inconvenience. Please try again.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Button onClick={this.handleRetry}>
                Refresh Page
              </Button>
              <a href="/" className="text-sm font-semibold text-foreground">
                Go to Homepage <span aria-hidden="true">&rarr;</span>
              </a>
            </div>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-8 text-left">
                <summary className="cursor-pointer text-muted-foreground">Error Details</summary>
                <pre className="mt-2 whitespace-pre-wrap rounded-md bg-muted p-4 text-sm text-muted-foreground">
                  {this.state.error.toString()}
                  <br />
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}