"use client";

import { useEffect, useState } from "react";
import { ChatInterface } from "@/components/ChatInterface";
import { api } from "@/lib/api";

export default function Home(): React.ReactElement {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const autoLogin = async (): Promise<void> => {
      try {
        const response = await api.login({
          email: "admin@talkingbird.com",
          password: "admin123",
        });
        api.setToken(response.access_token);
        setIsReady(true);
      } catch (err) {
        setError("Unable to connect to backend. Please ensure Docker is running.");
        console.error("Auto-login failed:", err);
      }
    };

    void autoLogin();
  }, []);

  if (error) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-slate-800 mb-2">Connection Error</h2>
          <p className="text-slate-600 mb-4">{error}</p>
          <code className="block bg-slate-100 rounded-lg px-4 py-2 text-sm text-slate-700">
            docker-compose up -d
          </code>
        </div>
      </main>
    );
  }

  if (!isReady) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 bg-slate-600 rounded-full animate-pulse" />
          <p className="text-slate-600 font-medium">Connecting to Talking Bird...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 py-8 px-4">
      <div className="container mx-auto max-w-6xl">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-slate-800 mb-2">🐦 Talking Bird</h1>
          <p className="text-slate-600 text-lg">Your AI University Concierge</p>
        </header>
        <ChatInterface />
      </div>
    </main>
  );
}
