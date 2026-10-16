import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { $ } from "bun";

const root = resolve(import.meta.dir, "..");
const temporary = mkdtempSync(join(tmpdir(), "plugin-artifacts-"));
try {
  for (const name of ["ni", "wt", "session-title"]) {
    await $`${process.execPath} scripts/package-plugin.ts ${name}`.cwd(root);
    const archive = join(root, "build", `${name}-plugin.tar.gz`);
    const contents = await $`tar -tzf ${archive}`.text();
    assert(!/\.ts$|node_modules|(^|\/)tests\//m.test(contents), contents);
    const extracted = join(temporary, name);
    mkdirSync(extracted);
    await $`tar -xzf ${archive} -C ${extracted}`;
    const metadata = await Bun.file(join(extracted, ".claude-plugin/plugin.json")).json();
    const manifest = await Bun.file(join(extracted, "package.json")).json();
    assert.equal(metadata.version, manifest.version);
    const hooks = await Bun.file(join(extracted, "hooks/hooks.json")).text();
    for (const match of hooks.matchAll(/\$\{CLAUDE_PLUGIN_ROOT\}\/([^\s"]+)/g)) {
      assert(await Bun.file(join(extracted, match[1]!)).exists(), match[0]);
    }
    const module = await import(join(extracted, "opencode", `${name}-plugin.js`));
    assert.equal(module.default.id, metadata.name);
    assert.equal(typeof module.default.setup, "function");
    if (name === "session-title") {
      assert(await Bun.file(join(extracted, "commands/title.md")).exists());
      assert(await Bun.file(join(extracted, "hooks/generate.js")).exists());
    }
    // A project config and explicit plugin-data dir keep hook smoke tests local.
    await Bun.write(join(extracted, `.${name}-plugin.json`), "{}");
    const hook = name === "session-title" ? "session-title-hook.js" : `${name}-hook.js`;
    const input = Buffer.from(JSON.stringify({
      session_id: "artifact", cwd: extracted, prompt: "hello",
      tool_name: "Bash", tool_input: { command: "ls" },
    }));
    await $`${process.execPath} ${join(extracted, "hooks", hook)} < ${input}`.env({
      ...process.env, CLAUDE_PLUGIN_DATA: extracted,
    });
  }
  const cli = join(root, "packages/cli");
  const manifest = await Bun.file(join(cli, "package.json")).json();
  await $`${process.execPath} pm pack --destination ${temporary} --ignore-scripts`.cwd(cli);
  const archive = join(temporary, `${manifest.name}-${manifest.version}.tgz`);
  const consumer = join(temporary, "consumer");
  mkdirSync(consumer);
  await Bun.write(join(consumer, "package.json"), '{"private":true}');
  const userconfig = join(temporary, "npmrc");
  const globalconfig = join(temporary, "global-npmrc");
  await Bun.write(userconfig, "");
  await Bun.write(globalconfig, "");
  await $`npm install ${archive} --offline --ignore-scripts --no-audit --no-fund --cache ${join(temporary, "cache")} --userconfig ${userconfig} --globalconfig ${globalconfig}`.cwd(consumer);
  const binary = join(consumer, "node_modules/.bin/coding-agent-plugins");
  const help = await $`${binary} --help`.cwd(consumer).text();
  const version = await $`${binary} --version`.cwd(consumer).text();
  assert(help.includes("USAGE:") && help.includes("--plugins="), help);
  assert.equal(version.trim(), `coding-agent-plugins v${manifest.version}`);
  const installed = join(consumer, "node_modules/coding-agent-plugins/dist");
  assert(await Bun.file(join(installed, ".claude-plugin/marketplace.json")).exists());
  console.log("Plugin tarballs and offline installed CLI consumer passed.");
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
