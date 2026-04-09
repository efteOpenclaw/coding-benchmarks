---
name: markdown-rendering
description: Markdown to HTML rendering with marked, TOC extraction from headings, sanitization. Use when building wiki/markdown content or page editor.
globs: "**/lib/markdown.*,**/lib/render.*,**/PageContent.*,**/PageEditor.*"
---

# Markdown Rendering — marked + TOC + Sanitization

## Render function (copy this)

```typescript
import { marked } from 'marked';

// Configure once
marked.setOptions({ gfm: true, breaks: true });

export function renderMarkdown(source: string): string {
  return marked.parse(source) as string;
}
```

## TOC extraction from headings

```typescript
interface TocEntry { level: number; text: string; slug: string; }

export function extractToc(html: string): TocEntry[] {
  const headingRegex = /<h([1-6])[^>]*id="([^"]*)"[^>]*>(.*?)<\/h[1-6]>/gi;
  const entries: TocEntry[] = [];
  let match;
  while ((match = headingRegex.exec(html)) !== null) {
    entries.push({ level: parseInt(match[1]), text: match[3], slug: match[2] });
  }
  return entries;
}
```

## Store both formats at write time

```typescript
// When saving a revision:
const content_html = renderMarkdown(content_markdown);
await createRevision({ page_id, content_markdown, content_html, edited_by });
// Read path returns pre-rendered HTML — no re-rendering needed
```

## Rules

1. ALWAYS store both `content_markdown` and `content_html` in page_revisions.
2. Render at WRITE time (consistent rendering, faster reads).
3. Use `marked` with `gfm: true` for GitHub-flavored markdown.
4. Extract TOC from rendered HTML headings for sidebar navigation.
5. Use `marked.parse()` — synchronous, returns string.
