import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function Md({ children }: { children: string }) {
  return (
    <div className="md">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Visuals open full size in a new tab.
          img: ({ src, alt }) => (
            <a href={typeof src === "string" ? src : undefined} target="_blank" rel="noopener noreferrer">
              <img src={typeof src === "string" ? src : undefined} alt={alt ?? ""} loading="lazy" />
            </a>
          ),
        }}
      >{children}</ReactMarkdown>
    </div>
  );
}
