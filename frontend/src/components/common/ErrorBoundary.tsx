import { Component, type ErrorInfo, type ReactNode } from "react";
import { withTranslation, type WithTranslation } from "react-i18next";

interface ErrorBoundaryProps extends WithTranslation {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/** Catches render/lifecycle errors so a crash shows a friendly screen instead of white-screening. */
class ErrorBoundaryInner extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Unhandled UI error:", error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ error: null });
  };

  render() {
    const { error } = this.state;
    const { t } = this.props;
    if (!error) return this.props.children;
    if (this.props.fallback) return this.props.fallback;
    return (
      <div className="flex min-h-screen items-center justify-center bg-navy-50 px-4">
        <div className="card w-full max-w-md p-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-2xl">
            ⚠️
          </div>
          <h1 className="font-display text-xl font-extrabold text-navy-900">{t("errorBoundary.somethingWentWrong")}</h1>
          <p className="mt-1 text-sm text-navy-500">
            {t("errorBoundary.unexpectedError")}
          </p>
          {error.message && (
            <pre className="mt-4 max-h-32 overflow-auto rounded-xl bg-navy-50 p-3 text-left text-xs text-red-700">
              {error.message}
            </pre>
          )}
          <div className="mt-5 flex justify-center gap-3">
            <button className="btn-primary" onClick={this.handleReset}>
              {t("errorBoundary.tryAgain")}
            </button>
            <button className="btn-ghost" onClick={() => window.location.assign("/")}>
              {t("errorBoundary.goHome")}
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export const ErrorBoundary = withTranslation()(ErrorBoundaryInner);