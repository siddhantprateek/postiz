// Patches the compiled personal-LinkedIn provider in the official Postiz image:
//  - request only openid/profile/w_member_social (org scopes need Community
//    Management API approval and make LinkedIn reject the login)
//  - drop prompt=none
//  - fall back to the display name when vanityName is unavailable
// Fails the build loudly if anything does not match exactly.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

function walk(dir, out) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules') continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name === 'linkedin.provider.js') out.push(p);
  }
  return out;
}

const files = walk('/app', []);
if (files.length === 0) {
  console.error('PATCH FAILED: no linkedin.provider.js found under /app');
  process.exit(1);
}

const scopesRe = /\[\s*(['"])openid\1\s*,\s*(['"])profile\2\s*,\s*(['"])w_member_social\3\s*,[^\]]*?\]/g;
for (const f of files) {
  let s = fs.readFileSync(f, 'utf8');
  const nScopes = (s.match(scopesRe) || []).length;
  const nPrompt = s.split('&prompt=none').length - 1;
  const nUser = (s.match(/username:\s*vanityName\s*,/g) || []).length;
  if (nScopes !== 1 || nPrompt !== 1 || nUser < 1) {
    console.error(`PATCH FAILED in ${f}: scopes=${nScopes} prompt=${nPrompt} username=${nUser}`);
    process.exit(1);
  }
  s = s.replace(scopesRe, "['openid', 'profile', 'w_member_social']");
  s = s.replace('&prompt=none', '');
  s = s.replace(/username:\s*vanityName\s*,/g, 'username: vanityName || name,');
  if (/rw_organization_admin|r_organization_social/.test(s)) {
    console.error(`PATCH FAILED in ${f}: org scopes still present`);
    process.exit(1);
  }
  fs.writeFileSync(f, s);
  execFileSync(process.execPath, ['--check', f], { stdio: 'inherit' });
  console.log('patched', f);
}
