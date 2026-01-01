import { ApiResponse } from "./types";

const API_KEY = process.env.NEXT_PUBLIC_CSV_API_KEY || "";
const BACKEND_URL = process.env.NEXT_PUBLIC_CSV_API_BASE_URL || "";
const USER_AGENT = "Course-MNR-World-Backend/2.0";

/**
 * Robust API request utility for frontend-backend communication.
 * Standardizes the response format to { success, data, message }.
 */
export async function apiRequest<T>(
  route: string,
  method: string = "GET",
  body: unknown = null,
  params: Record<string, string | undefined> = {},
): Promise<ApiResponse<T>> {
  try {
    const isServer = typeof window === "undefined";

    let url: string;
    const urlParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        urlParams.set(key, value);
      }
    }

    // Always set route in params
    urlParams.set("route", route);

    if (isServer) {
      // Server-side: call backend directly
      const baseUrl = BACKEND_URL.endsWith("/")
        ? BACKEND_URL.slice(0, -1)
        : BACKEND_URL;
      url = `${baseUrl}/index.php?${urlParams.toString()}`;
    } else {
      // Client-side: call via proxy to hide API key (if proxy is configured correctly)
      url = `/api/proxy?${urlParams.toString()}`;
    }

    const headers: Record<string, string> = {
      "User-Agent": USER_AGENT,
    };

    if (isServer) {
      headers["Authorization"] = `Bearer ${API_KEY}`;
    }

    if (!(body instanceof FormData)) {
      headers["Content-Type"] = "application/json";
    }

    const options: RequestInit = {
      method,
      headers,
    };

    if (body) {
      options.body = body instanceof FormData ? body : JSON.stringify(body);
    }

    const response = await fetch(url, options);
    const contentType = response.headers.get("content-type");

    if (contentType && contentType.includes("application/json")) {
      const result = await response.json();

      // Handle failure cases (HTTP error or explicit success: false)
      if (!response.ok || (result && result.success === false)) {
        return {
          success: false,
          data: null as T,
          message:
            result?.error || result?.message || `Error ${response.status}`,
        };
      }

      // Consistent unwrapping logic
      let payload: T;
      if (result && typeof result === "object" && !Array.isArray(result)) {
        if ("data" in result) {
          // Standard wrapper: { success: true, data: [...] }
          payload = result.data as T;
        } else if ("success" in result) {
          // Direct response with success flag: { success: true, id: 123, ... }
          // We remove 'success' and 'message' from the payload to keep it clean
          const rest = { ...(result as Record<string, unknown>) };
          delete rest.success;
          delete rest.message;
          // If there are other fields, use them, otherwise use the whole object
          payload = (Object.keys(rest).length > 0 ? rest : result) as T;
        } else {
          // Plain object
          payload = result as T;
        }
      } else {
        // Primitive or array
        payload = result as T;
      }

      return {
        success: true,
        data: payload,
        message: result?.message,
        total: result?.total ? Number(result.total) : undefined,
      };
    } else {
      // Non-JSON response
      const text = await response.text();
      if (!response.ok) {
        return {
          success: false,
          data: null as T,
          message: `HTTP ${response.status}: ${text.substring(0, 100)}`,
        };
      }

      // If text is empty and status is 200, it might be a successful empty response
      if (!text.trim()) {
        return {
          success: true,
          data: null as T,
        };
      }

      // Otherwise, if it's not JSON, it's likely an error message or invalid response
      return {
        success: false,
        data: null as T,
        message: `Invalid JSON response: ${text.substring(0, 100)}`,
      };
    }
  } catch (error) {
    console.error("apiRequest error:", error);
    return {
      success: false,
      data: null as T,
      message: error instanceof Error ? error.message : "Network error",
    };
  }
}
