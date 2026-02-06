import { QueryClient, QueryFunction } from "@tanstack/react-query";

function getAuthHeaders(): HeadersInit {
  const userToken = localStorage.getItem("userToken");
  const adminToken = localStorage.getItem("adminToken");
  const token = userToken || adminToken;
  const headers: HeadersInit = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

function handleUnauthorized() {
  const isAdminPage = window.location.pathname.startsWith("/admin");
  if (isAdminPage) {
    localStorage.removeItem("adminToken");
    queryClient.clear();
    window.location.href = "/admin";
  } else {
    localStorage.removeItem("userToken");
    queryClient.clear();
  }
}

class ApiError extends Error {
  response: Response;
  data: any;
  
  constructor(message: string, response: Response, data?: any) {
    super(message);
    this.response = response;
    this.data = data;
  }
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    let data;
    try {
      data = await res.clone().json();
    } catch {
      data = { error: await res.text() || res.statusText };
    }

    if (res.status === 401 && data?.code !== "NO_TOKEN") {
      handleUnauthorized();
    }

    throw new ApiError(data.error || `${res.status}: ${res.statusText}`, res, data);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const headers: Record<string, string> = {
    ...getAuthHeaders() as Record<string, string>,
  };

  if (data) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
      headers: getAuthHeaders(),
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    if (res.status === 401) {
      let data;
      try { data = await res.clone().json(); } catch { data = {}; }
      if (data?.code !== "NO_TOKEN") {
        handleUnauthorized();
      }
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
