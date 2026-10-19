import { build } from "esbuild";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";
import { readFile, writeFile, mkdir } from "node:fs/promises";
await mkdir("public/fluid", { recursive: true });
await build({
  entryPoints: ["fluid/bridge.tsx"],
  bundle: true,
  format: "esm",
  platform: "browser",
  target: "es2022",
  jsx: "automatic",
  minify: true,
  outfile: "public/fluid/bridge.js",
  define: { "process.env.NODE_ENV": '"production"' },
  tsconfig: "tsconfig.json",
});
const source = await readFile("fluid/registry.css", "utf8");
const result = await postcss([tailwind()]).process(source, {
  from: "fluid/registry.css",
});
// Keep the registry's reset, tokens and utilities inside React islands only.
result.root.walkRules((rule) => {
  if (rule.parent?.type === "atrule" && /keyframes$/.test(rule.parent.name))
    return;
  rule.selector = postcss.list.comma(rule.selector)
    .map((s) => {
      s = s.trim();
      if (s === ":root" || s === ":host") return ".fluid-ui";
      if (s === ".dark") return '[data-theme="dark"] .fluid-ui';
      return ":where(.fluid-ui) " + s;
    })
    .join(",");
});
result.root.walkAtRules("layer", (r) => {
  if (r.nodes) r.replaceWith(...r.nodes);
  else r.remove();
});
await writeFile(
  "public/fluid/bridge.css",
  result.css + "\n" + (await readFile("fluid/bridge.css", "utf8")),
);
