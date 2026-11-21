import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(new URL('../scripts/verify-release-tag.mjs', import.meta.url));

function verifyTag(ref, version) {
  const cwd = mkdtempSync(join(tmpdir(), 'metro-release-tag-'));
  try {
    writeFileSync(join(cwd, 'package.json'), JSON.stringify({ version }));
    return spawnSync(process.execPath, [script], {
      cwd,
      env: { ...process.env, GITHUB_REF: ref },
      encoding: 'utf8',
    });
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
}

for (const [tag, version] of [
  ['v1.2.3', '1.2.3'],
  ['1.2.3', '1.2.3'],
  ['v1.2.3-rc.1', '1.2.3-rc.1'],
  ['v1.2.3-rc.001a+build.01', '1.2.3-rc.001a+build.01'],
]) {
  test(`accepts ${tag} for package version ${version}`, () => {
    const result = verifyTag(`refs/tags/${tag}`, version);
    assert.equal(result.status, 0, result.stderr);
  });
}

for (const [tag, version] of [
  ['v1.2.4', '1.2.3'],
  ['v1.2.3', '1.2.3-rc.1'],
  ['v1.2.3-rc.2', '1.2.3-rc.1'],
  ['v1.2.3+build.2', '1.2.3+build.1'],
]) {
  test(`rejects ${tag} for package version ${version}`, () => {
    const result = verifyTag(`refs/tags/${tag}`, version);
    assert.equal(result.status, 1, result.stderr);
    assert.match(result.stderr, /does not match package\.json version/);
  });
}

for (const [ref, version] of [
  ['refs/heads/v1.2.3', '1.2.3'],
  ['refs/tags/v01.2.3', '01.2.3'],
  ['refs/tags/v1.2', '1.2'],
  ['refs/tags/v1.2.3-rc.01', '1.2.3-rc.01'],
  ['refs/tags/v1.2.3-rc..1', '1.2.3-rc..1'],
]) {
  test(`rejects invalid release ref ${ref}`, () => {
    const result = verifyTag(ref, version);
    assert.equal(result.status, 1, result.stderr);
    assert.match(result.stderr, /not a version tag/);
  });
}
