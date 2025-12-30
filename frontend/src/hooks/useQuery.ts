"use client";

import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { QueryRequest, QueryResponse } from "@/lib/types";

export function useSubmitQuery() {
  return useMutation<QueryResponse, Error, QueryRequest>({
    mutationFn: (request) => api.submitQuery(request),
  });
}



