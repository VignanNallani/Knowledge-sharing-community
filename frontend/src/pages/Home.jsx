import React from "react";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <h1 className="text-5xl font-extrabold text-blue-700 mb-6">
        Welcome to Knowledge Sharing Community
      </h1>
      <p className="text-lg text-gray-700 max-w-xl mb-8">
        Join our community to collaborate, share insights, and grow your knowledge.
      </p>
      <a
        href="/signup"
        className="px-6 py-3 bg-blue-600 text-white rounded-lg shadow-lg hover:bg-blue-700 transition"
      >
        Get Started
      </a>
    </div>
  );
}
