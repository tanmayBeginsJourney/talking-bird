"use client";

import { useEffect, useState } from "react";
import { QueryInterface } from "@/components/QueryInterface";
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
        setError("Unable to connect to backend");
        console.error("Auto-login failed:", err);
      }
    };

    void autoLogin();
  }, []);

  return (
    <main className="min-h-screen" style={{ background: "var(--bg-primary)" }}>
      {/* Subtle gradient overlay */}
      <div 
        className="fixed inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at top, rgba(99, 102, 241, 0.08) 0%, transparent 50%)",
        }}
      />
      
      <div className="relative z-10 max-w-3xl mx-auto px-6 py-20">
        {/* Header */}
        <header className="text-center mb-16 animate-fade-in">
          <h1 
            className="text-5xl font-semibold mb-3"
            style={{ color: "var(--text-primary)" }}
          >
            Talking Bird
          </h1>
          <p 
            className="text-lg"
            style={{ color: "var(--text-secondary)" }}
          >
            Ask questions about your documents
          </p>
        </header>

        {/* Main Content */}
        {error ? (
          <div 
            className="text-center p-8 rounded-2xl animate-fade-in"
            style={{ 
              background: "var(--bg-secondary)", 
              border: "1px solid var(--border)" 
            }}
          >
            <p style={{ color: "var(--error)" }} className="font-medium mb-2">
              {error}
            </p>
            <p 
              className="text-sm"
              style={{ color: "var(--text-tertiary)" }}
            >
              Run: docker-compose up -d
            </p>
          </div>
        ) : !isReady ? (
          <div className="flex items-center justify-center gap-3">
            <div 
              className="w-2 h-2 rounded-full animate-pulse"
              style={{ background: "var(--accent)" }}
            />
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
          className="text-center mt-20 text-sm"
          style={{ color: "var(--text-tertiary)" }}
        >
          Answers are grounded in uploaded documents only
        </footer>
      </div>
    </main>
  );
}
