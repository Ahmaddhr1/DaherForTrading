// Thrown by core services for an expected, user-facing failure (bad input,
// not found, not enough stock...). Routes turn it into an HTTP response with
// respondError() - services never import next/server themselves, so the same
// business rules can be used from routes, jobs, the store API or tests.
export class ServiceError extends Error {
  // body: the exact JSON the client gets, e.g. { message: "Customer not found" }
  constructor(status, body) {
    super(body?.message || body?.error || "Request failed");
    this.status = status;
    this.body = body;
  }
}

// In a route: `catch (e) { return respondError(e, fallbackBody) }`
export async function respondError(error, fallbackBody) {
  const { NextResponse } = await import("next/server");
  if (error instanceof ServiceError) return NextResponse.json(error.body, { status: error.status });
  return NextResponse.json({ ...fallbackBody, error: error.message }, { status: 500 });
}
