import { QueryInterface } from "@/components/QueryInterface";

export default function QueryPage(): React.ReactElement {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-12">
        <QueryInterface />
      </div>
    </main>
  );
}



