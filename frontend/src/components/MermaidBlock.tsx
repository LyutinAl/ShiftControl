import { useEffect, useRef } from 'react'
import mermaid from 'mermaid'

mermaid.initialize({ startOnLoad: false, theme: 'neutral' })

let idCounter = 0

export default function MermaidBlock({ code }: { code: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const idRef = useRef(`mermaid-${++idCounter}`)

  useEffect(() => {
    if (!ref.current) return
    const id = idRef.current
    mermaid.render(id, code).then(({ svg }) => {
      if (ref.current) ref.current.innerHTML = svg
    }).catch(() => {
      if (ref.current) ref.current.textContent = code
    })
  }, [code])

  return <div ref={ref} className="my-4 flex justify-center overflow-x-auto" />
}
