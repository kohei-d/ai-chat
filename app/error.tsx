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
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            エラーが発生しました
          </h2>
          <p className="text-gray-600 mb-6">
            申し訳ございません。予期しないエラーが発生しました。
          </p>
          {error.digest && (
            <p className="text-sm text-gray-500 mb-6">
              エラーID: {error.digest}
            </p>
          )}
          <button
            onClick={() => reset()}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
          >
            再試行
          </button>
        </div>
      </div>
    </div>
  );
}
