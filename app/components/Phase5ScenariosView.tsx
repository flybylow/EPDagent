import type { Phase5ScenariosData } from "@/lib/types";

export function Phase5ScenariosView({ data }: { data: Phase5ScenariosData }) {
  return (
    <div className="phase3-doc">
      {data.section_title ? <p className="docmap-doc-meta">{data.section_title}</p> : null}
      {data.scenarios.length > 0 ? (
        <div className="stack-md">
          {data.scenarios.map((s, i) => (
            <section key={`${s.module}-${i}`} className="scenario-block">
              <h3 className="scenario-head">
                {s.module ? `${s.module}` : ""}
                {s.title ? ` · ${s.title}` : ""}
                {s.number ? ` (${s.number})` : ""}
              </h3>
              {s.description ? <p className="scenario-text">{s.description}</p> : null}
            </section>
          ))}
        </div>
      ) : (
        <p className="hint">No scenarios extracted.</p>
      )}
    </div>
  );
}
