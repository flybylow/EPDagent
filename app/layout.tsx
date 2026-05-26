import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EPDagent",
  description: "BEBD EPD extraction pipeline and JSON-LD knowledge graph",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <div className="container-wide header-inner">
            <a href="/" className="brand">
              EPDagent
            </a>
            <nav>
              <a href="/">EPDs</a>
              <a href="/api/graph/corpus" target="_blank" rel="noreferrer">
                corpus.jsonld
              </a>
              <a href="/api/context" target="_blank" rel="noreferrer">
                @context
              </a>
            </nav>
          </div>
        </header>
        <main className="container-wide">{children}</main>
      </body>
    </html>
  );
}
