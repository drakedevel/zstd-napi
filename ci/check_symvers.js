// @ts-nocheck
const childProcess = require('child_process');

// Maximum defined symbol versions in Debian 10 / EL8
const MAX_VERSIONS = {
  CXXABI: [1, 3, 11],
  GCC: [7, 0, 0],
  GLIBC: [2, 28, 0],
  GLIBCXX: [3, 4, 25],
};

function cmpVersion(v1, v2) {
  for (let i = 0; i < 3; i++) {
    if (v1[i] !== v2[i]) {
      return v1[i] - v2[i];
    }
  }
  return 0;
}

function main() {
  const nmArgs = ['-uD', '--with-symbol-versions', '--', process.argv[2]];
  const nmBin = process.env.NM ?? 'nm';
  const nmOut = childProcess.execFileSync(nmBin, nmArgs, { encoding: 'utf8' });
  let count = 0;
  let ok = true;
  for (const symLine of nmOut.split('\n')) {
    // TODO: Use nm -j option in Debian 12+
    const sym = symLine.split(' ').at(-1);
    if (!sym.includes('@') || sym.endsWith('@Base')) {
      continue;
    }
    count++;
    const versionStr = sym.split('@').at(-1);
    const match = /^([A-Z]+)_(\d+)\.(\d+)(?:\.(\d+))?$/.exec(versionStr);
    if (!match) {
      console.error(`Could not parse symbol version: ${sym}`);
      ok = false;
      continue;
    }
    const [, lib, ...versionParts] = match;
    const version = versionParts.map((v) => parseInt(v ?? '0', 10));
    const maxVersion = MAX_VERSIONS[lib];
    if (!maxVersion) {
      console.error(`Unknown versioned library: ${sym}`);
      ok = false;
      continue;
    }
    if (cmpVersion(version, maxVersion) > 0) {
      console.error(`Version too new: ${sym}`);
      ok = false;
    }
  }
  if (count === 0) {
    console.error("Didn't find any versioned symbols");
    ok = false;
  }
  if (!ok) {
    process.exit(1);
  }
}

main();
