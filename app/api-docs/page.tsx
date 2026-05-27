import Link from "next/link";
import { ApiExampleCard } from "@/app/components/ApiExampleCard";
import { buildApiDocExamples } from "@/lib/api-docs/samples";
import { publicApiBase } from "@/lib/api-docs/public-base";

export const dynamic = "force-dynamic";

export default function ApiDocsPage() {
  const base = publicApiBase();
  const examples = buildApiDocExamples(base);

  return (
    <div className="api-docs-page stack-lg">
      <header>
        <h1>Product Facts API</h1>
        <p className="lede">
          Read-only JSON endpoints for Tabulas and other apps. Extract locally; call these URLs
          from your domain (CORS enabled on catalog and facts routes).
        </p>
        <p className="hint">
          Base URL: <code>{base}</code> — set <code>EPDAGENT_PUBLIC_URL</code> on Vercel if curl
          should show your production hostname.
        </p>
      </header>

      <section className="panel api-docs-links">
        <h2>More</h2>
        <ul className="api-docs-more">
          <li>
            <a href={`${base}/api/graph/corpus`} target="_blank" rel="noreferrer">
              corpus.jsonld
            </a>
          </li>
          <li>
            <a href={`${base}/api/context`} target="_blank" rel="noreferrer">
              JSON-LD @context
            </a>
          </li>
          <li>
            <Link href="/">EPD workspace</Link>
          </li>
        </ul>
        <p className="hint">
          Full reference: <code>docs/facts-api.md</code> in the repository.
        </p>
      </section>

      {examples.map((ex) => (
        <ApiExampleCard
          key={ex.id}
          title={ex.title}
          description={ex.description}
          method={ex.method}
          path={ex.path}
          curl={ex.curl}
          status={ex.status}
          response={ex.response}
        />
      ))}
    </div>
  );
}
