// Stub middleware for API authentication
export function withApiAuth(handler) {
  return async function apiHandler(req, res) {
    // No-op authentication for development
    return handler(req, res);
  };
}
