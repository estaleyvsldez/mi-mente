// Renderiza Markdown con matemáticas ($...$) usando KaTeX.
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";

export function Md({ children, inline = false, className }: { children: string; inline?: boolean; className?: string }) {
  const content = children ?? "";
  return (
    <div className={`md ${inline ? "[&>p]:my-0 [&>p]:inline" : ""} ${className ?? ""}`}>
      <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex]}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
