'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('App error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 max-w-lg w-full p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
          <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Something went wrong</h2>
        <p className="text-sm text-gray-500 mb-4">
          An unexpected error occurred. Please try again.
        </p>
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-left">
          <p className="text-xs font-medium text-red-800 mb-1">Error details:</p>
          <pre className="text-xs text-red-700 whitespace-pre-wrap break-words font-mono">
            {error.message}
          </pre>
          {error.digest && (
            <p className="text-xs text-red-500 mt-2">Digest: {error.digest}</p>
          )}
        </div>
        {error.stack && (
          <details className="text-left mb-4">
            <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
              Show stack trace
            </summary>
            <pre className="mt-2 text-xs text-gray-600 whitespace-pre-wrap break-words font-mono bg-gray-50 p-3 rounded-lg max-h-60 overflow-y-auto">
              {error.stack}
            </pre>
          </details>
        )}
        <button
          onClick={reset}
          className="px-6 py-2.5 bg-orange-600 text-white font-medium rounded-lg hover:bg-orange-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}