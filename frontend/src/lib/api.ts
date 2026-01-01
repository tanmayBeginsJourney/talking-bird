/**
 * API client for Talking Bird backend using Axios
 */

import axios from "axios";
import type { QueryRequest, QueryResponse } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Store token in memory (will be set after login)
let authToken: string | null = null;

// Create Axios instance with base configuration
const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add auth token to requests
apiClient.interceptors.request.use((config) => {
  if (authToken) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }
  return config;
});

// Types for auth
interface LoginRequest {
  email: string;
  password: string;
}

interface LoginResponse {
  access_token: string;
  token_type: string;
}

/**
 * Login to get access token
 */
export async function login(credentials: LoginRequest): Promise<LoginResponse> {
  try {
    const response = await apiClient.post<LoginResponse>("/api/v1/auth/login", credentials);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        (error.response?.data as { detail?: string })?.detail ||
          "Login failed"
      );
    }
    throw new Error("An error occurred during login");
  }
}

/**
 * Set the auth token for subsequent requests
 */
export function setToken(token: string): void {
  authToken = token;
}

/**
 * Get the current auth token
 */
export function getToken(): string | null {
  return authToken;
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return authToken !== null;
}

/**
 * Send a query to the API
 */
export async function sendQuery(
  message: string,
  maxChunks: number = 5
): Promise<QueryResponse> {
  try {
    const request: QueryRequest = {
      query: message,
      max_chunks: maxChunks,
    };

    const response = await apiClient.post<QueryResponse>("/api/v1/query", request);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response) {
        const errorMessage =
          (error.response.data as { detail?: string })?.detail ||
          `API error: ${error.response.status}`;
        throw new Error(errorMessage);
      } else if (error.request) {
        throw new Error(
          `Cannot connect to backend. Please ensure the backend is running.`
        );
      }
    }
    throw new Error(error instanceof Error ? error.message : "An unknown error occurred");
  }
}

/**
 * Submit a query (alias for sendQuery, for compatibility)
 */
export async function submitQuery(request: QueryRequest): Promise<QueryResponse> {
  return sendQuery(request.query, request.max_chunks);
}

/**
 * Get the download URL for a document
 */
export function getDocumentDownloadUrl(documentId: string): string {
  return `${API_URL}/api/v1/documents/${documentId}/download`;
}

/**
 * Download a document by ID
 */
export async function downloadDocument(
  documentId: string,
  filename: string
): Promise<void> {
  try {
    const response = await apiClient.get(`/api/v1/documents/${documentId}/download`, {
      responseType: "blob",
    });

    const blob = new Blob([response.data]);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 404) {
        throw new Error("Document not found. It may have been deleted.");
      }
      throw new Error(
        (error.response?.data as { detail?: string })?.detail ||
          "Failed to download document"
      );
    }
    throw new Error("An error occurred while downloading the document");
  }
}

/**
 * API client object
 */
export const api = {
  login,
  setToken,
  getToken,
  isAuthenticated,
  sendQuery,
  submitQuery,
  downloadDocument,
  getDocumentDownloadUrl,
};
