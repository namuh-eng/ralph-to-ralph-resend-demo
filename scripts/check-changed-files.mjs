#!/usr/bin/env node
import { execFileSync, spawnSync } from "node:child_process";
import process from "node:process";

const repoRoot = execFileSync("git", ["rev-parse", "--show-toplevel"], {
  cwd: process.cwd(),
  encoding: "utf8",
}).trim();

const BIOME_EXTENSIONS = new Set([
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
  ".mjs",
  ".cjs",
  ".json",
  ".jsonc",
  ".css",
  ".md",
]);
const TYPECHECK_EXTENSIONS = new Set([
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
  ".mjs",
  ".cjs",
]);

function git(args) {
  return execFileSync("git", args, {
    cwd: repoRoot,
    encoding: "utf8",
  }).trim();
}

function tryGit(args) {
  try {
    return git(args);
  } catch {
    return null;
  }
}

function getMergeBase() {
  return (
    tryGit(["merge-base", "HEAD", "origin/main"]) ??
    tryGit(["rev-parse", "HEAD~1"]) ??
    git(["rev-parse", "HEAD"])
  );
}

function getChangedFiles(mergeBase) {
  const output = git([
    "diff",
    "--name-only",
    "--diff-filter=ACMR",
    `${mergeBase}...HEAD`,
  ]);
  return output ? output.split("\n").filter(Boolean) : [];
}

function filterByExtension(files, extensions) {
  return files.filter((file) => {
    const lower = file.toLowerCase();
    for (const extension of extensions) {
      if (lower.endsWith(extension)) return true;
    }
    return false;
  });
}

function runTypecheck(changedFiles) {
  const typedFiles = filterByExtension(changedFiles, TYPECHECK_EXTENSIONS);
  if (typedFiles.length === 0) {
    console.log("✓ No changed JS/TS files to typecheck");
    return;
  }

  console.log(
    `→ Typechecking changed JS/TS files against baseline (${typedFiles.length})...`,
  );
  const result = spawnSync("bunx", ["tsc", "--noEmit", "--pretty", "false"], {
    cwd: repoRoot,
    encoding: "utf8",
  });

  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
  if ((result.status ?? 0) === 0) {
    console.log("✓ Typecheck passed");
    return;
  }

  const relevant = typedFiles.some((file) => output.includes(`${file}(`));
  if (relevant) {
    process.stderr.write(output);
    process.exit(result.status ?? 1);
  }

  console.log(
    "↷ Full-project typecheck is red outside the files changed on this branch; allowing push.",
  );
}

function runLint(changedFiles) {
  const lintableFiles = filterByExtension(changedFiles, BIOME_EXTENSIONS);
  if (lintableFiles.length === 0) {
    console.log("✓ No changed Biome-supported files to lint");
    return;
  }

  console.log(
    `→ Linting changed files with Biome (${lintableFiles.length})...`,
  );
  const result = spawnSync(
    "bunx",
    [
      "biome",
      "check",
      "--files-ignore-unknown=true",
      "--no-errors-on-unmatched",
      ...lintableFiles,
    ],
    {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: "inherit",
    },
  );

  if ((result.status ?? 0) !== 0) {
    process.exit(result.status ?? 1);
  }

  console.log("✓ Lint passed");
}

const mergeBase = getMergeBase();
const changedFiles = getChangedFiles(mergeBase);

if (changedFiles.length === 0) {
  console.log("✓ No branch changes detected against baseline");
  process.exit(0);
}

runTypecheck(changedFiles);
runLint(changedFiles);
