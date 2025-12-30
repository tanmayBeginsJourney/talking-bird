"use client";

import { useEffect, useState } from "react";
import { QueryInterface } from "@/components/QueryInterface";
import { api } from "@/lib/api";

export default function Home(): React.ReactElement {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Auto-login with hardcoded credentials for MVP
    const autoLogin = async (): Promise<void> => {
      try {
        const response = await api.login({
          email: "admin@talkingbird.com",
          password: "admin123",
        });
        api.setToken(response.access_token);
        setIsReady(true);
      } catch (err) {
        setError("Failed to connect. Is the backend running?");
        console.error("Auto-login failed:", err);
      }
    };

    void autoLogin();
  }, []);

  return (
    <main className="min-h-screen" style={{ background: "var(--background)" }}>
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        {/* Header */}
        <header className="text-center mb-12 animate-fade-in">
          <div className="inline-flex items-center gap-3 mb-4">
            <span className="text-5xl">🐦</span>
            <h1 
              className="text-4xl font-semibold tracking-tight"
              style={{ color: "var(--text-primary)" }}
            >
              Talking Bird
            </h1>
          </div>
          <p 
            className="text-lg"
            style={{ color: "var(--text-secondary)" }}
          >
            Ask questions about university documents
          </p>
        </header>

        {/* Main Content */}
        {error ? (
          <div 
            className="text-center p-8 rounded-xl animate-fade-in"
            style={{ 
              background: "var(--card)", 
              border: "1px solid var(--border)" 
            }}
          >
            <p style={{ color: "var(--error)" }} className="font-medium">
              {error}
            </p>
            <p 
              className="text-sm mt-2"
              style={{ color: "var(--text-secondary)" }}
            >
              Make sure Docker is running with: docker-compose up -d
            </p>
          </div>
        ) : !isReady ? (
          <div className="text-center animate-pulse-slow">
            <p style={{ color: "var(--text-secondary)" }}>
              Connecting...
            </p>
          </div>
        ) : (
          <div className="animate-slide-up">
            <QueryInterface />
          </div>
        )}

        {/* Footer */}
        <footer 
          className="text-center mt-16 text-sm"
          style={{ color: "var(--text-secondary)" }}
        >
          Answers are grounded only in uploaded documents
        </footer>
      </div>
    </main>
  );
}
