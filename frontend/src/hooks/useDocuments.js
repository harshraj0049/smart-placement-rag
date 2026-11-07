import { useCallback, useEffect, useState } from 'react'
import { ENDPOINTS } from '../config'
import { listDocuments } from '../api/documents'

/** status: 'loading' | 'unavailable' (endpoint not configured) | 'error' | 'ready' */
export function useDocuments() {
  const [state, setState] = useState({ status: ENDPOINTS.documentsList ? 'loading' : 'unavailable', items: [], error: '' })

  const load = useCallback(async () => {
    if (!ENDPOINTS.documentsList) return setState({ status: 'unavailable', items: [], error: '' })
    setState((s) => ({ ...s, status: 'loading', error: '' }))
    try {
      setState({ status: 'ready', items: await listDocuments(), error: '' })
    } catch (err) {
      setState({ status: 'error', items: [], error: err.message || 'Could not load documents.' })
    }
  }, [])

  useEffect(() => { load() }, [load])
  return { ...state, reload: load }
}
