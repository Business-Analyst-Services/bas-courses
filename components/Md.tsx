import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function Md({ children }: { children: string }) {
  return (
    <div className="md">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  );
}
