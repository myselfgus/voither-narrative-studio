import React, { Component, ErrorInfo } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { AlertTriangle, RefreshCw } from 'lucide-react';
interface Props {
  children: React.ReactNode;
}
interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}
export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };
  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }
  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    console.error(`Error in ${window.location.pathname}:`, error, errorInfo);
    toast.error(`An unexpected error occurred.`, {
      description: error.message || "Please try refreshing the page.",
      duration: 10000,
      action: {
        label: 'Retry',
        onClick: this.handleRetry,
      },
    });
  }
  handleRetry = () => {
    toast.info('Reloading page...');
    window.location.reload();
  };
  render() {
    if (this.state.hasError) {
      return (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="flex h-screen w-screen items-center justify-center bg-background"
          role="alert"
        >
          <div className="text-center p-4">
            <AlertTriangle className="mx-auto h-12 w-12 text-destructive" />
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-5xl">
              Something went wrong
            </h1>
            <p className="mt-6 text-base leading-7 text-muted-foreground">
              We're sorry for the inconvenience. Please try again.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Button onClick={this.handleRetry}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh Page
              </Button>
              <a href="/" className="text-sm font-semibold text-foreground">
                Go to Homepage <span aria-hidden="true">&rarr;</span>
              </a>
            </div>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-8 text-left max-w-2xl mx-auto">
                <summary className="cursor-pointer text-muted-foreground">Error Details</summary>
                <pre className="mt-2 whitespace-pre-wrap rounded-md bg-muted p-4 text-sm text-muted-foreground overflow-auto">
                  {this.state.error.toString()}
                  <br />
                  {this.state.error.stack}
                  <br />
                  <hr className="my-2" />
                  Component Stack:
                  <br />
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
          </div>
        </motion.div>
      );
    }
    return this.props.children;
  }
}