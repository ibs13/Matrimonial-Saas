export function enumLabel(value: unknown): string {
  if (value === null || value === undefined) return "";

  return String(value)
    .replace(/([A-Z])/g, " $1")
    .replace(/[_-]/g, " ")
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}

export function statusBadgeClass(status: unknown): string {
  const normalizedStatus = String(status);

  switch (normalizedStatus) {
    case "Active":
    case "2":
      return "bg-green-100 text-green-800";

    case "PendingReview":
    case "1":
      return "bg-yellow-100 text-yellow-800";

    case "Paused":
    case "4":
      return "bg-orange-100 text-orange-800";

    case "Draft":
    case "0":
      return "bg-gray-100 text-gray-700";

    case "Rejected":
    case "Deleted":
    case "3":
    case "5":
      return "bg-red-100 text-red-800";

    default:
      return "bg-gray-100 text-gray-700";
  }
}

export function interestStatusClass(status: string): string {
  switch (status) {
    case "Accepted":
      return "bg-green-100 text-green-800";
    case "Pending":
      return "bg-yellow-100 text-yellow-800";
    case "Rejected":
      return "bg-red-100 text-red-800";
    case "Cancelled":
      return "bg-gray-100 text-gray-600";
    default:
      return "bg-gray-100 text-gray-600";
  }
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(iso);
}

export function apiError(err: unknown): string {
  if (
    err &&
    typeof err === "object" &&
    "response" in err &&
    err.response &&
    typeof err.response === "object" &&
    "data" in err.response
  ) {
    const data = (err.response as { data: unknown }).data;

    if (typeof data === "string") {
      return data;
    }

    if (data && typeof data === "object") {
      const body = data as {
        error?: unknown;
        message?: unknown;
        title?: unknown;
        detail?: unknown;
        errors?: unknown;
      };

      if (body.error) return String(body.error);
      if (body.message) return String(body.message);
      if (body.detail) return String(body.detail);
      if (body.title) return String(body.title);

      if (body.errors && typeof body.errors === "object") {
        const firstError = Object.values(
          body.errors as Record<string, unknown>,
        )[0];

        if (Array.isArray(firstError)) {
          return String(firstError[0]);
        }

        return String(firstError);
      }
    }
  }

  if (err instanceof Error) {
    return err.message;
  }

  return "Something went wrong. Please try again.";
}
