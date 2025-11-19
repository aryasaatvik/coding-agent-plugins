/**
 * @param {import('@turbo/gen').PlopTypes.NodePlopAPI} plop
 */
module.exports = function generator(plop) {
  // Helper for PascalCase conversion
  plop.setHelper("pascalCase", (text) => {
    return text
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join("");
  });

  // Helper for proper case
  plop.setHelper("properCase", (text) => {
    return text
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  });

  // Plugin generator
  plop.setGenerator("plugin", {
    description: "Create a new plugin for Claude Code and OpenCode",
    prompts: [
      {
        type: "input",
        name: "name",
        message: "What is the name of your plugin?",
        validate: (input) => {
          if (input.includes(" ")) {
            return "Plugin name cannot contain spaces";
          }
          if (input.match(/^[a-z0-9-]+$/)) {
            return true;
          }
          return "Plugin name must be lowercase alphanumeric with hyphens";
        },
      },
      {
        type: "input",
        name: "description",
        message: "Brief description of the plugin:",
      },
      {
        type: "list",
        name: "category",
        message: "Plugin category:",
        choices: ["development", "productivity", "testing", "utilities", "other"],
        default: "development",
      },
      {
        type: "checkbox",
        name: "platforms",
        message: "Which platforms will this plugin support?",
        choices: [
          { name: "Claude Code", value: "claude", checked: true },
          { name: "OpenCode", value: "opencode", checked: true },
        ],
        validate: (answer) => {
          if (answer.length < 1) {
            return "You must choose at least one platform";
          }
          return true;
        },
      },
    ],
    actions: [
      // Create package.json
      {
        type: "add",
        path: "plugins/{{ dashCase name }}/package.json",
        templateFile: "turbo/generators/templates/plugin/package.json.hbs",
      },
      // Create README.md
      {
        type: "add",
        path: "plugins/{{ dashCase name }}/README.md",
        templateFile: "turbo/generators/templates/plugin/README.md.hbs",
      },
      // Create tsconfig.json
      {
        type: "add",
        path: "plugins/{{ dashCase name }}/tsconfig.json",
        templateFile: "turbo/generators/templates/plugin/tsconfig.json.hbs",
      },
      // Claude Code files
      {
        type: "add",
        path: "plugins/{{ dashCase name }}/claude-code/{{ dashCase name }}.ts",
        templateFile: "turbo/generators/templates/plugin/claude-code/plugin.ts.hbs",
        skip: (data) => {
          if (!data.platforms.includes("claude")) {
            return "Skipping Claude Code implementation";
          }
          return false;
        },
      },
      {
        type: "add",
        path: "plugins/{{ dashCase name }}/hooks/hooks.json",
        templateFile: "turbo/generators/templates/plugin/hooks/hooks.json.hbs",
        skip: (data) => {
          if (!data.platforms.includes("claude")) {
            return "Skipping Claude Code hooks";
          }
          return false;
        },
      },
      // Claude plugin metadata
      {
        type: "add",
        path: "plugins/{{ dashCase name }}/.claude-plugin/plugin.json",
        templateFile: "turbo/generators/templates/plugin/.claude-plugin/plugin.json.hbs",
        skip: (data) => {
          if (!data.platforms.includes("claude")) {
            return "Skipping Claude plugin metadata";
          }
          return false;
        },
      },
      // OpenCode files
      {
        type: "add",
        path: "plugins/{{ dashCase name }}/opencode/{{ dashCase name }}-plugin.ts",
        templateFile: "turbo/generators/templates/plugin/opencode/plugin.ts.hbs",
        skip: (data) => {
          if (!data.platforms.includes("opencode")) {
            return "Skipping OpenCode implementation";
          }
          return false;
        },
      },
      // Shared directory
      {
        type: "add",
        path: "plugins/{{ dashCase name }}/shared/types.ts",
        templateFile: "turbo/generators/templates/plugin/shared/types.ts.hbs",
      },
      // Tests
      {
        type: "add",
        path: "plugins/{{ dashCase name }}/tests/{{ dashCase name }}.test.ts",
        templateFile: "turbo/generators/templates/plugin/tests/plugin.test.ts.hbs",
      },
      // Update marketplace.json
      {
        type: "modify",
        path: ".claude-plugin/marketplace.json",
        pattern: /(  "plugins": \[)/,
        template:
          '$1\n    {\n      "name": "{{ dashCase name }}",\n      "path": "plugins/{{ dashCase name }}",\n      "description": "{{ description }}",\n      "version": "1.0.0",\n      "author": {\n        "name": "Saatvik Arya",\n        "email": "aryasaatvik@gmail.com"\n      },\n      "license": "MIT",\n      "category": "{{ category }}",\n      "tags": [],\n      "keywords": [],\n      "platforms": {{ json platforms }},\n      "homepage": "https://github.com/aryasaatvik/coding-agent-plugins/tree/main/plugins/{{ dashCase name }}"\n    },',
      },
      // Instructions
      (answers) => {
        return `
✨ Plugin '${answers.name}' created successfully!

Next steps:
  1. cd plugins/${answers.name}
  2. bun install
  3. Implement your plugin logic
  4. turbo run build --filter=${answers.name}
  5. bun test

Run 'turbo run build --filter=${answers.name}' to build just this plugin.
        `.trim();
      },
    ],
  });
};
