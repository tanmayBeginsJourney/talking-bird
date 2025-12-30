"use client";

import { useMutation, type UseMutationResult } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { QueryRequest, QueryResponse } from "@/lib/types";

export function useSubmitQuery(): UseMutationResult<QueryResponse, Error, QueryRequest> {
  return useMutation<QueryResponse, Error, QueryRequest>({
    mutationFn: (request) => api.submitQuery(request),
  });
}



