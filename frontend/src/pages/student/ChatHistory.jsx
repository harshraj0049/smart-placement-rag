import { Info } from 'lucide-react'

export default function ChatHistory() {
  return (
    <>
      <div className="page-head"><div><h1>Chat History</h1><p>Conversations are not saved.</p></div></div>
      <div className="callout"><Info size={18} style={{ flex: 'none' }} /><span>The assistant keeps up to five recent exchanges in memory for follow-up questions. Refreshing the page or starting a new chat clears that context.</span></div>
    </>
  )
}
