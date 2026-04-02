function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function applyInlineMarkdown(text: string) {
  const escaped = escapeHtml(text);

  return escaped
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="my-8 w-full rounded-3xl border border-black/10" />')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="font-semibold text-[#d95f02] underline decoration-[#f4b183] underline-offset-4" target="_blank" rel="noreferrer">$1</a>')
    .replace(/`([^`]+)`/g, '<code class="rounded-md bg-[#111827] px-1.5 py-0.5 text-[0.9em] text-[#f9fafb]">$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>");
}

export function renderMarkdown(markdown: string) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const html: string[] = [];
  let paragraph: string[] = [];
  let listType: "ul" | "ol" | null = null;
  let quoteLines: string[] = [];
  let inCodeBlock = false;
  let codeLanguage = "";
  let codeLines: string[] = [];

  const flushParagraph = () => {
    if (!paragraph.length) return;
    html.push(`<p>${applyInlineMarkdown(paragraph.join(" "))}</p>`);
    paragraph = [];
  };

  const flushList = () => {
    if (!listType) return;
    html.push(`</${listType}>`);
    listType = null;
  };

  const flushQuote = () => {
    if (!quoteLines.length) return;
    html.push(`<blockquote>${applyInlineMarkdown(quoteLines.join(" "))}</blockquote>`);
    quoteLines = [];
  };

  const flushCodeBlock = () => {
    const languageClass = codeLanguage ? ` class="language-${escapeHtml(codeLanguage)}"` : "";
    html.push(`<pre><code${languageClass}>${escapeHtml(codeLines.join("\n"))}</code></pre>`);
    codeLanguage = "";
    codeLines = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    if (line.startsWith("```")) {
      flushParagraph();
      flushQuote();
      flushList();

      if (inCodeBlock) {
        flushCodeBlock();
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
        codeLanguage = line.slice(3).trim();
      }

      continue;
    }

    if (inCodeBlock) {
      codeLines.push(rawLine);
      continue;
    }

    if (!line.trim()) {
      flushParagraph();
      flushQuote();
      flushList();
      continue;
    }

    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      flushParagraph();
      flushQuote();
      flushList();
      const depth = headingMatch[1].length;
      html.push(`<h${depth}>${applyInlineMarkdown(headingMatch[2])}</h${depth}>`);
      continue;
    }

    const quoteMatch = line.match(/^>\s?(.*)$/);
    if (quoteMatch) {
      flushParagraph();
      flushList();
      quoteLines.push(quoteMatch[1]);
      continue;
    }

    const unorderedMatch = line.match(/^[-*]\s+(.+)$/);
    const orderedMatch = line.match(/^\d+\.\s+(.+)$/);
    if (unorderedMatch || orderedMatch) {
      flushParagraph();
      flushQuote();
      const nextListType = unorderedMatch ? "ul" : "ol";
      if (listType !== nextListType) {
        flushList();
        listType = nextListType;
        html.push(`<${nextListType}>`);
      }
      html.push(`<li>${applyInlineMarkdown((unorderedMatch || orderedMatch)?.[1] ?? "")}</li>`);
      continue;
    }

    flushQuote();
    flushList();
    paragraph.push(line.trim());
  }

  flushParagraph();
  flushQuote();
  flushList();

  if (inCodeBlock) {
    flushCodeBlock();
  }

  return html.join("\n");
}
