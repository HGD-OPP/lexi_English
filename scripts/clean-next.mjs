import { rmSync } from "node:fs";

// Next's output tracing creates a junction at `.next/node_modules/@prisma/client`
// on Windows. A second build cannot unlink that junction in restricted
// filesystems, so remove the previous output before every build.
rmSync(".next", { recursive: true, force: true });
