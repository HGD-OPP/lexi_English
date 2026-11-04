import { existsSync, readdirSync, rmdirSync, rmSync } from "node:fs";
import { join } from "node:path";

// Next's output tracing creates a junction at `.next/node_modules/@prisma/client`
// on Windows. Remove junctions first; otherwise `rmSync` can fail with
// ENOTEMPTY while trying to clear the real directory they point at.
function removeJunctions(dir) {
  if (!existsSync(dir)) return;

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const target = join(dir, entry.name);

    if (entry.isSymbolicLink()) {
      // `rmSync` rejects junctions with EISDIR; rmdir removes the link itself.
      rmdirSync(target);
    } else if (entry.isDirectory()) {
      removeJunctions(target);
    }
  }
}

removeJunctions(".next");
rmSync(".next", {
  recursive: true,
  force: true,
  maxRetries: 5,
  retryDelay: 200,
});

