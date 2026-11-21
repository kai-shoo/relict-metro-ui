import { readFileSync } from 'node:fs';

const ref = process.env.GITHUB_REF ?? '';
const number = '(?:0|[1-9][0-9]*)';
const identifiers = '[0-9A-Za-z-]+(?:\\.[0-9A-Za-z-]+)*';
const versionRef = new RegExp(`^refs/tags/v?(${number}\\.${number}\\.${number}(?:-(${identifiers}))?(?:\\+${identifiers})?)$`);
const [, taggedVersion, prerelease] = versionRef.exec(ref) ?? [];
const hasLeadingZero = prerelease?.split('.').some(part => /^0\d+$/.test(part));

if (!taggedVersion || hasLeadingZero) {
  console.error(`${ref || 'GITHUB_REF'} is not a version tag. Use a tag such as v1.2.3 or v1.2.3-rc.1.`);
  process.exit(1);
}

const { version } = JSON.parse(readFileSync('package.json', 'utf8'));
if (taggedVersion !== version) {
  console.error(`${ref} does not match package.json version ${version}.`);
  process.exit(1);
}
console.log(`${ref} matches package.json version ${version}.`);
