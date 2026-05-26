# Open standards

EPDagent aligns extraction and publication with public specifications where possible. Custom fields are last resort.

## Core web & data

| Standard | Use in EPDagent |
|----------|-----------------|
| [JSON-LD 1.1](https://www.w3.org/TR/json-ld11/) | Canonical knowledge graph serialization |
| [JSON Schema draft-07](https://json-schema.org/) | Phase extraction contracts in `schemas/` |
| [IRI](https://www.w3.org/TR/rdf11-concepts/#iri)s | Stable `@id` for EPDs, organizations, products |
| [schema.org](https://schema.org/) | Generic types where they fit (`Product`, `Organization`, `Person`, dates) |
| [PROV-O](https://www.w3.org/TR/prov-o/) | Provenance: PDF source, extraction run, phase |

## EPD / LCA domain

| Standard | Use in EPDagent |
|----------|-----------------|
| EN 15804 | EPD content structure, verification types, LCA modules (A1–D) |
| ISO 14025 | Type III environmental declarations context |
| ISO 21930 / relevant PCRs | Referenced via `pcr_reference` in header phase |
| ISO 3166-1 alpha-2 | Country codes in extraction |
| ISO 8601 dates | `YYYY-MM-DD` in phase JSON and JSON-LD |

Program operator strings (e.g. canonical `BE-BD` for BEBD) are documented in phase-specific notes as we implement them.

## Implementation stance

1. **Extract literally** — phase JSON mirrors the PDF; normalization happens in mapping to JSON-LD, not in the LLM paraphrase step.
2. **Publish linked** — graph edges use `@id` references, not duplicated strings, when the entity appears more than once (e.g. same producer across EPDs).
3. **Version contexts** — `@context` URLs or bundled contexts are versioned so old graph files remain interpretable.
4. **No lock-in** — RDF export must remain possible from the same JSON-LD without vendor tooling.

## Related docs

- [architecture.md](architecture.md) — where standards sit in the stack
- [knowledge-graph.md](knowledge-graph.md) — JSON-LD node graph details
- [pipeline-overview.md](pipeline-overview.md) — phase outputs that feed the graph
