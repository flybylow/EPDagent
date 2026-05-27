import { buildTocTree, type TocNode } from "@/lib/extract/docmap-parse";

export interface PhaseDocmapData {
  toc_title: string | null;
  source_pages: number[];
  entries: TocNode[];
  flat_entries: Array<{
    number: string;
    title: string;
    page: number | null;
    level: number;
  }>;
  _source?: {
    entry_count: number;
    tree_node_count: number;
    extracted_at: string;
    page_spec_source: string;
  };
}

function TocBranch({ nodes }: { nodes: TocNode[] }) {
  return (
    <ul className="docmap-tree">
      {nodes.map((node) => (
        <li key={`${node.number}-${node.title}`} className="docmap-tree-item" data-level={node.level}>
          <div className="docmap-tree-row">
            <span className="docmap-tree-number">{node.number}</span>
            <span className="docmap-tree-title">{node.title}</span>
            {node.page != null ? (
              <span className="docmap-tree-page">p{node.page}</span>
            ) : null}
          </div>
          {node.children?.length ? <TocBranch nodes={node.children} /> : null}
        </li>
      ))}
    </ul>
  );
}

export function DocmapTreeView({ docmap }: { docmap: PhaseDocmapData }) {
  return (
    <div className="docmap-doc">
      <header className="docmap-doc-header">
        <p className="docmap-doc-meta">
          {docmap.toc_title ?? "Document index"}
          {docmap.source_pages.length
            ? ` · pages ${docmap.source_pages.join(", ")}`
            : ""}
          {docmap._source?.entry_count != null
            ? ` · ${docmap._source.entry_count} entries`
            : ""}
        </p>
      </header>
      {docmap.flat_entries.length ? (
        <TocBranch nodes={buildTocTree(docmap.flat_entries)} />
      ) : (
        <p className="hint">No index entries captured for this PDF.</p>
      )}
    </div>
  );
}
