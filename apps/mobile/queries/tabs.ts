import { loadLibrary } from "@/lib/library"
import type { ProjectEntry } from "@gtr/shared"
import { useMutation, useQuery } from "@tanstack/react-query"

export const tabsQueryKey = ['tabs'] as const

export const useGetTabs = () => {
  return useQuery({
    queryKey: tabsQueryKey,
    queryFn: async () => {
      return await loadLibrary()
    },
  })
}

export const useAddNewTab = () => {
   return useMutation({
    mutationFn: async (tab: ProjectEntry) => {

    },
  })

}
