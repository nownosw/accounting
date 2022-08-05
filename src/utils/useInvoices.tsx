import { useEffect, useState } from 'react'
import useSWR, { useSWRConfig } from 'swr'

import { Invoice } from '@apideck/node'
import { useConnection } from './useConnections'
import { usePrevious } from '@apideck/components'
import { useSession } from './useSession'

export const useInvoices = () => {
  const [cursor, setCursor] = useState(null)
  const { connection } = useConnection()
  const { session } = useSession()
  const serviceId = connection?.service_id || ''
  const prevServiceId = usePrevious(serviceId)
  const prevCursor = usePrevious(cursor)
  const { mutate } = useSWRConfig()

  const fetcher = (...args: any) => fetch(args).then((res) => res.json())

  const hasNewCursor = cursor && (!prevServiceId || prevServiceId === serviceId)
  const cursorParams = hasNewCursor ? `&cursor=${cursor}` : ''
  const getInvoicesUrl = serviceId
    ? `/api/accounting/invoices/all?jwt=${session?.jwt}&serviceId=${serviceId}${cursorParams}`
    : null

  const { data, error } = useSWR(getInvoicesUrl, fetcher)

  useEffect(() => {
    if (prevServiceId && prevServiceId !== serviceId) {
      setCursor(null)
    }
  }, [serviceId, prevServiceId])

  const addInvoice = async (invoice: Invoice) => {
    const response = await fetch(
      `/api/crm/companies/add?jwt=${session?.jwt}&serviceId=${serviceId}`,
      {
        method: 'POST',
        body: JSON.stringify(invoice)
      }
    )
    return response.json()
  }

  const createInvoice = async (invoice: Invoice) => {
    const invoices = [...data, invoice]
    const options = { optimisticData: invoices, rollbackOnError: true }
    mutate(getInvoicesUrl, addInvoice(invoice), options)
  }

  const nextPage = () => {
    const nextCursor = data?.meta?.cursors?.next

    if (nextCursor) {
      setCursor(nextCursor)
    }
  }

  const prevPage = () => {
    const prevCursor = data?.meta?.cursors?.previous
    setCursor(prevCursor)
  }

  useEffect(() => {
    if (prevCursor && prevCursor !== cursor) {
      // revalidate()
    }
  }, [cursor, prevCursor])

  return {
    invoices: data?.data,
    isLoading: !error && !data,
    isError: data?.error || error,
    hasNextPage: data?.meta?.cursors?.next,
    currentPage: data?.meta?.cursors?.current,
    hasPrevPage: data?.meta?.cursors?.previous,
    nextPage,
    prevPage,
    createInvoice
  }
}
