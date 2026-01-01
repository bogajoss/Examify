import { NextRequest, NextResponse } from "next/server";

// Define public routes that don't require authentication
const publicRoutes = [
  "/",
  "/login", // Student login page
  "/admin/login", // Admin login page
  "/register", // Student registration page
  "/about", // About page
  // API routes that don't require authentication
  "/api/auth",
  "/api/proxy",
];

// Define admin-only routes (including sub-routes)
const adminRoutes = ["/admin"];

// Define routes that require authentication but are not admin-specific
const protectedRoutes = [
  "/exams",
  "/batches",
  "/results",
  "/profile",
  "/daily",
];

export function middleware(request: NextRequest) {
  // Check if the current route is public
  const isPublicRoute = isPathInRoutes(request.nextUrl.pathname, publicRoutes);

  // Check if the current route is an admin route
  const isAdminRoute = isPathInRoutes(request.nextUrl.pathname, adminRoutes);

  // Check if the current route is a protected route
  const isProtectedRoute = isPathInRoutes(
    request.nextUrl.pathname,
    protectedRoutes,
  );

  // For server-side middleware, we can't access localStorage directly
  // We need to check for authentication tokens in cookies or headers
  // Since your app uses localStorage on the client, we'll need to implement a proper session/JWT system
  // For now, we'll check for a session cookie that would be set after successful authentication

  const isAuthenticated = checkAuthentication(request);
  const isAdmin = checkAdminStatus(request);

  // If accessing a public route, allow access
  if (isPublicRoute) {
    return NextResponse.next();
  }

  // If accessing a protected route without authentication
  if (isProtectedRoute || isAdminRoute) {
    if (!isAuthenticated) {
      // Redirect to login page with the current path as a redirect parameter
      const loginUrl = isAdminRoute ? "/admin/login" : "/login";
      const url = new URL(loginUrl, request.url);
      url.searchParams.set("redirect", request.nextUrl.pathname);
      return NextResponse.redirect(url);
    }

    // If accessing admin route, check if user is admin
    if (isAdminRoute && !isAdmin) {
      // Redirect to student dashboard or show unauthorized page
      return NextResponse.redirect(new URL("/exams", request.url));
    }
  }

  // Allow access to protected routes if user is authenticated
  return NextResponse.next();
}

// Helper function to check if a path matches any of the routes
function isPathInRoutes(path: string, routes: string[]): boolean {
  return routes.some(
    (route) =>
      path === route ||
      path.startsWith(route + "/") ||
      (route.endsWith("/") && path.startsWith(route)),
  );
}

// Helper function to check authentication
// In a real implementation, you would verify a JWT token or session cookie
function checkAuthentication(request: NextRequest): boolean {
  try {
    const studentToken = request.cookies.get("student-token")?.value;
    const adminToken = request.cookies.get("admin-token")?.value;

    if (studentToken || adminToken) {
      return true;
    }

    // Also check for Authorization header (for API routes)
    const authHeader = request.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      // In a real app, you would verify the JWT token here
      return true; // Placeholder - implement proper JWT verification
    }
    return false;
  } catch (error) {
    console.error("Error checking authentication:", error);
    return false;
  }
}

// Helper function to check if user is admin
// This would need to be implemented based on your admin detection logic
function checkAdminStatus(request: NextRequest): boolean {
  const adminToken = request.cookies.get("admin-token")?.value;
  return !!adminToken;
}

// Configure which routes the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
