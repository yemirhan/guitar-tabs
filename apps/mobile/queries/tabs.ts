import { loadLibrary } from "@/lib/library"
import { useMutation, useQuery } from "@tanstack/react-query"

export const useGetTabs = () => {
  return useQuery({
    queryKey: ['tabs'],
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
