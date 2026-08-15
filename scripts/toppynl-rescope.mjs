#!/usr/bin/env node
/**
 * Rewrite the package.json files of the packages we publish from this fork so
 * they can go to GitHub Packages under the @toppynl scope.
 *
 * WHY THIS IS A SCRIPT AND NOT A COMMIT
 * -------------------------------------
 * `@evidence-dev` is not ours, so anything we publish has to live under
 * `@toppynl`. Committing that rename would mean:
 *   - every `workspace:*` cross-reference in the monorepo has to be renamed too,
 *   - every `import ... from '@evidence-dev/sdk'` in the source has to change,
 *   - and every future merge from upstream conflicts on all of it.
 *
 * So the rename happens at publish time instead. Source stays byte-identical to
 * upstream, and merging `evidence-dev/evidence` back in stays a fast-forward.
 *
 * HOW THE CROSS-REFERENCES SURVIVE
 * --------------------------------
 * The dependency *keys* keep their `@evidence-dev/...` names and only the value
 * becomes an npm alias:
 *
 *   "@evidence-dev/sdk": "npm:@toppynl/evidence-sdk@4.0.3"
 *
 * The consumer therefore installs our build, but finds it in node_modules under
 * the name the source imports. Packages we do *not* fork (icons, tailwind,
 * telemetry, universal-sql, preprocess, db-commons) keep their `workspace:*`
 * ranges; `pnpm publish` turns those into the exact version, which resolves from
 * npmjs as usual.
 *
 * Usage: node scripts/toppynl-rescope.mjs [--check]
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const REPO_URL = 'git+https://github.com/toppynl/evidence.git';
const REGISTRY = 'https://npm.pkg.github.com';

/** package directory -> published name under our scope */
export const PACKAGES = {
	'packages/lib/sdk': '@toppynl/evidence-sdk',
	'packages/lib/component-utilities': '@toppynl/evidence-component-utilities',
	'packages/ui/core-components': '@toppynl/evidence-core-components',
	'packages/datasources/bigquery': '@toppynl/evidence-bigquery',
	'packages/evidence': '@toppynl/evidence'
};

const read = (dir) => JSON.parse(readFileSync(join(root, dir, 'package.json'), 'utf-8'));

// original @evidence-dev name -> { newName, version }
const rename = new Map();
for (const dir of Object.keys(PACKAGES)) {
	const pkg = read(dir);
	rename.set(pkg.name, { newName: PACKAGES[dir], version: pkg.version, dir });
}

const check = process.argv.includes('--check');
let changed = 0;

for (const [dir, newName] of Object.entries(PACKAGES)) {
	const path = join(root, dir, 'package.json');
	const pkg = JSON.parse(readFileSync(path, 'utf-8'));
	const original = pkg.name;

	pkg.name = newName;
	pkg.repository = { type: 'git', url: REPO_URL, directory: dir };
	pkg.publishConfig = { ...pkg.publishConfig, registry: REGISTRY, access: 'restricted' };

	for (const field of ['dependencies', 'devDependencies', 'peerDependencies']) {
		const deps = pkg[field];
		if (!deps) continue;
		for (const name of Object.keys(deps)) {
			const target = rename.get(name);
			if (!target) continue;
			// Keep the key so imports still resolve; point the value at our build.
			deps[name] = `npm:${target.newName}@${target.version}`;
		}
	}

	const next = JSON.stringify(pkg, null, '\t') + '\n';
	if (check) {
		console.log(`${original} -> ${newName}@${pkg.version}`);
	} else {
		writeFileSync(path, next);
		console.log(`rescoped ${original} -> ${newName}@${pkg.version}`);
	}
	changed++;
}

if (!changed) {
	console.error('nothing rescoped - PACKAGES is empty?');
	process.exit(1);
}
