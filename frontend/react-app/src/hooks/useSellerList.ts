import { useQuery } from '@tanstack/react-query'

export interface SellerUser {
  id:    string
  name:  string
  email: string
}

const MOCK_SELLERS: SellerUser[] = [
  { id: 's1', name: 'Maria Santos', email: 'maria@acme.com' },
  { id: 's2', name: 'James Park',   email: 'james@steelco.com' },
]

export function useSellerList() {
  return useQuery<SellerUser[]>({
    queryKey: ['sellers'],
    queryFn:  async () => {
      try {
        const res = await fetch('/api/users?role=SELLER', { credentials: 'include' })
        if (!res.ok) return MOCK_SELLERS
        const data = await res.json()
        return (data as SellerUser[]).length > 0 ? data : MOCK_SELLERS
      } catch {
        return MOCK_SELLERS
      }
    },
  })
}
