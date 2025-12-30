import { QueryInterface } from "@/components/QueryInterface";

export default function Home(): React.ReactElement {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-12">
        <header className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-800 mb-2">🐦 Talking Bird</h1>
          <p className="text-slate-600">Ask questions about Office of Research documents</p>
        </header>
        <QueryInterface />
      </div>
    </main>
  );
}



