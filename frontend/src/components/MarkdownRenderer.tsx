import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import type { Components } from 'react-markdown'
import MermaidBlock from './MermaidBlock'

const components: Components = {
  // Mermaid code blocks
  code({ className, children, ...props }) {
    const lang = /language-(\w+)/.exec(className || '')?.[1]
    const code = String(children).replace(/\n$/, '')

    if (lang === 'mermaid') {
      return <MermaidBlock code={code} />
    }

    return (
      <code
        className={`${className ?? ''} rounded bg-muted px-1.5 py-0.5 text-sm font-mono`}
        {...props}
      >
        {children}
      </code>
    )
  },
  pre({ children }) {
    return (
      <pre className="rounded-lg bg-muted p-4 overflow-x-auto text-sm font-mono my-4">
        {children}
      </pre>
    )
  },
  h1: ({ children }) => <h1 className="text-2xl font-bold mt-6 mb-3">{children}</h1>,
  h2: ({ children }) => <h2 className="text-xl font-semibold mt-5 mb-2 border-b pb-1">{children}</h2>,
  h3: ({ children }) => <h3 className="text-lg font-semibold mt-4 mb-2">{children}</h3>,
  p:  ({ children }) => <p className="my-2 leading-relaxed">{children}</p>,
  ul: ({ children }) => <ul className="my-2 ml-5 list-disc space-y-1">{children}</ul>,
  ol: ({ children }) => <ol className="my-2 ml-5 list-decimal space-y-1">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="border-l-4 border-muted-foreground/30 pl-4 my-3 text-muted-foreground italic">
      {children}
    </blockquote>
  ),
  table: ({ children }) => (
    <div className="my-4 overflow-x-auto">
      <table className="w-full text-sm border-collapse border border-border">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border border-border bg-muted px-3 py-2 text-left font-semibold">{children}</th>
  ),
  td: ({ children }) => (
    <td className="border border-border px-3 py-2">{children}</td>
  ),
  a: ({ href, children }) => (
    <a href={href} className="text-primary underline underline-offset-2 hover:opacity-80" target="_blank" rel="noreferrer">
      {children}
    </a>
  ),
  img: ({ src, alt }) => (
    <img src={src} alt={alt} className="max-w-full rounded-lg my-3" />
  ),
  hr: () => <hr className="my-6 border-border" />,
}

export default function MarkdownRenderer({ content }: { content: string }) {
  return (
    <div className="prose-sm text-foreground">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
