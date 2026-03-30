// ABOUTME: Unit tests for deploy-001 — validates production build config, Dockerfile, and deploy script
// ABOUTME: Ensures App Runner deployment infrastructure is correctly configured

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(__dirname, "..");

describe("deploy-001: App Runner deployment configuration", () => {
  it("next.config.js has standalone output for Docker deployment", () => {
    const config = readFileSync(join(root, "next.config.js"), "utf-8");
    expect(config).toContain('output: "standalone"');
  });

  it("Dockerfile exists with multi-stage build", () => {
    const dockerfile = readFileSync(join(root, "Dockerfile"), "utf-8");
    expect(dockerfile).toContain("FROM node:20-alpine AS base");
    expect(dockerfile).toContain("AS deps");
    expect(dockerfile).toContain("AS builder");
    expect(dockerfile).toContain("AS runner");
    expect(dockerfile).toContain("npm run build");
    expect(dockerfile).toContain(".next/standalone");
  });

  it("Dockerfile exposes port 3000 for App Runner", () => {
    const dockerfile = readFileSync(join(root, "Dockerfile"), "utf-8");
    expect(dockerfile).toContain("EXPOSE 3000");
    expect(dockerfile).toContain("ENV PORT=3000");
  });

  it("deploy script exists and targets ECR + App Runner", () => {
    const scriptPath = join(root, "scripts", "deploy.sh");
    expect(existsSync(scriptPath)).toBe(true);
    const script = readFileSync(scriptPath, "utf-8");
    expect(script).toContain("ecr");
    expect(script).toContain("apprunner");
  });

  it("package.json has build script", () => {
    const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf-8"));
    expect(pkg.scripts.build).toBe("next build");
  });

  it(".dockerignore excludes node_modules and .next", () => {
    const ignore = readFileSync(join(root, ".dockerignore"), "utf-8");
    expect(ignore).toContain("node_modules");
    expect(ignore).toContain(".next");
  });
});
