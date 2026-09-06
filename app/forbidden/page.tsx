import React from "react";

export default function ForbiddenPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-[#f6f6f6]">
      <div className="max-w-2xl w-full p-8 bg-white rounded-lg shadow text-center">
        <h1 className="text-2xl font-semibold mb-4">403 — Forbidden</h1>
        <p className="text-sm text-gray-600 mb-6">
          You do not have permission to access this page.
        </p>
        <a href="/" className="text-sm text-indigo-600 hover:underline">
          Return to home
        </a>
      </div>
    </main>
  );
}
