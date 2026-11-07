import { useCallback, useEffect, useState } from 'react'
import { ENDPOINTS } from '../config'
import { listConversations } from '../api/chat'

/** status: 'loading' | 'unavailable' (history not supported yet) | 'error' | 'ready' */
export function useConversations() {
  const [state, setState] = useState({ status: ENDPOINTS.conversations ? 'loading' : 'unavailable', items: [], error: '' })

  const load = useCallback(async () => {
    if (!ENDPOINTS.conversations) return setState({ status: 'unavailable', items: [], error: '' })
    setState((s) => ({ ...s, status: 'loading', error: '' }))
    try {
      setState({ status: 'ready', items: await listConversations(), error: '' })
    } catch (err) {
      setState({ status: 'error', items: [], error: err.message || 'Could not load chat history.' })
    }
  }, [])

  useEffect(() => { load() }, [load])
  return { ...state, reload: load }
}
