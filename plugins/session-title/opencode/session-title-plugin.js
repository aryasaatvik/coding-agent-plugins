// @bun
// opencode/session-title-plugin.ts
import { existsSync } from "fs";
import { basename, join } from "path";

// shared/title.ts
var CATEGORY_INSTRUCTION = `Output exactly one line: category: title
- category: a short lowercase slug naming the topic area, as if it were a folder or repository name (e.g. opencode, neovim, taxes). Not a filesystem path.
- title: the session title per the rules above
- entire line lowercase
- no quotes or extra text`;
function firstLine(generated) {
  return generated.split(`
`).map((item) => item.trim().replace(/^["'`]+|["'`]+$/g, "")).find((item) => item.length > 0);
}
function formatTitle(prefix, generated) {
  const line = firstLine(generated);
  if (!line)
    return;
  const title = stripLeadingPrefix(prefix, line);
  if (!title)
    return;
  return `${prefix}: ${title}`.toLowerCase();
}
function stripLeadingPrefix(prefix, line) {
  const lower = line.toLowerCase();
  const head = prefix.toLowerCase();
  if (lower === head)
    return "";
  if (lower.startsWith(`${head}:`))
    return line.slice(head.length + 1).trim();
  if (lower.startsWith(`${head} `))
    return line.slice(head.length).trim();
  return line;
}
function formatCategorized(generated) {
  const line = firstLine(generated);
  if (!line)
    return;
  return line.toLowerCase();
}

// opencode/session-title-plugin.ts
var session_title_plugin_default = {
  id: "session-title",
  async setup(ctx) {
    const registration = await ctx.session.hook("title", async (event) => {
      const prefix = repositoryName(ctx.location.project.directory);
      const prompt = composePrompt(event.system, event.messages, prefix === undefined);
      if (!prompt)
        return;
      try {
        const generated = await ctx.generate.text({
          model: event.model,
          prompt
        });
        const title = prefix === undefined ? formatCategorized(generated.text) : formatTitle(prefix, generated.text);
        if (title)
          event.result = title;
      } catch (error) {
        console.error("[session-title] generate failed", error);
      }
    });
    return () => registration.dispose();
  }
};
function repositoryName(directory) {
  if (existsSync(join(directory, ".git")) || existsSync(join(directory, ".hg")))
    return basename(directory);
}
function composePrompt(system, messages, categorize) {
  const instructions = system.map((part) => part.text?.trim()).filter(Boolean);
  if (categorize)
    instructions.push(CATEGORY_INSTRUCTION);
  const conversation = messages.flatMap((message) => (message.content ?? []).filter((part) => part.type === "text").map((part) => part.text?.trim()).filter(Boolean));
  return [...instructions, ...conversation].join(`

`);
}
export {
  session_title_plugin_default as default
};
