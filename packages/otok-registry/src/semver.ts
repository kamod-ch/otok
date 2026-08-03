/** Minimal semver range check — aligned with @otok/config kit-merge. */
export function satisfiesRange(version: string, range: string): boolean {
  const normalize = (v: string) => v.replace(/^v/, "").split("-")[0]!.split(".").map(Number);
  const ver = normalize(version);
  const matchCaret = range.match(/^\^(\d+)\.(\d+)\.(\d+)/);
  if (matchCaret) {
    const major = Number(matchCaret[1]);
    const minor = Number(matchCaret[2]);
    const patch = Number(matchCaret[3]);
    if (major === 0) {
      return compareSemver(ver, [0, minor, patch]) >= 0 && compareSemver(ver, [0, minor + 1, 0]) < 0;
    }
    return ver[0] === major && compareSemver(ver, [major, minor, patch]) >= 0;
  }
  const matchGte = range.match(/^>=\s*(\d+\.\d+\.\d+)/);
  if (matchGte) return compareSemver(ver, normalize(matchGte[1]!)) >= 0;
  return version.replace(/^v/, "") === range.replace(/^v/, "");
}

function compareSemver(a: number[], b: number[]): number {
  for (let i = 0; i < 3; i++) {
    const diff = (a[i] ?? 0) - (b[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}
