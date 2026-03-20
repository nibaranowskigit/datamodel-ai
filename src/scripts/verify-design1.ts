import fs from "fs";
import path from "path";

const root = path.resolve(process.cwd(), "src");
const projectRoot = path.resolve(process.cwd());

interface CheckResult {
  name: string;
  passed: boolean;
  reason?: string;
}

const results: CheckResult[] = [];

function check(name: string, passed: boolean, reason?: string) {
  results.push({ name, passed, reason });
}

function readFile(filePath: string): string | null {
  try {
    return fs.readFileSync(filePath, "utf-8");
  } catch {
    return null;
  }
}

// 1. globals.css exists and contains --background and .dark
const globalsCss = readFile(path.join(root, "app/globals.css"));
check(
  "globals.css exists",
  globalsCss !== null
);
check(
  "globals.css contains --background",
  globalsCss?.includes("--background") ?? false
);
check(
  "globals.css contains .dark",
  globalsCss?.includes(".dark") ?? false
);

// 2. globals.css imports Geist
check(
  "globals.css imports Geist",
  (globalsCss?.includes("Geist") ?? false)
);

// 3. globals.css sets Geist as body font-family
check(
  "globals.css sets Geist as body font-family",
  (globalsCss?.includes('font-family') && globalsCss?.includes('"Geist"')) ?? false
);

// 4. layout.tsx has className="dark" on html element
const layoutTsx = readFile(path.join(root, "app/layout.tsx"));
check(
  'layout.tsx has className containing "dark" on html',
  (layoutTsx?.includes('"dark"') ?? false) || (layoutTsx?.includes("'dark'") ?? false) || (layoutTsx?.includes(" dark ") ?? false)
);

// More precise check for dark class in html element — handles template literals too
const layoutContent = layoutTsx ?? "";
const hasDarkInHtml =
  /\bdark\b/.test(layoutContent) &&
  /<html[^>]*className/.test(layoutContent);
check(
  'layout.tsx html element has dark class',
  hasDarkInHtml
);

// 5. typography.ts exists and exports typography object with h1 key
const typographyTs = readFile(path.join(root, "lib/design/typography.ts"));
check(
  "src/lib/design/typography.ts exists",
  typographyTs !== null
);
check(
  "typography.ts exports typography with h1 key",
  (typographyTs?.includes("export const typography") && typographyTs?.includes("h1:")) ?? false
);

// 6. .cursorrules has DESIGN SYSTEM section, bg-background rule, text-muted-foreground rule
const cursorRules = readFile(path.join(projectRoot, ".cursorrules"));
check(
  ".cursorrules has DESIGN SYSTEM section",
  cursorRules?.includes("DESIGN SYSTEM") ?? false
);
check(
  ".cursorrules has bg-background rule",
  cursorRules?.includes("bg-background") ?? false
);
check(
  ".cursorrules has text-muted-foreground rule",
  cursorRules?.includes("text-muted-foreground") ?? false
);

// 7. No files in src/components/ui/ contain hardcoded color utilities
// Exception: status indicators (green, yellow, red) are allowed per design rule #1
const hardcodedColorPattern = /\b(bg|text|border)-(gray|slate|blue|indigo|violet)-\d{3}/;
const bgWhitePattern = /bg-white\b/;

const uiDir = path.join(root, "components/ui");
if (fs.existsSync(uiDir)) {
  const uiFiles = fs.readdirSync(uiDir).filter((f) => f.endsWith(".tsx") || f.endsWith(".ts"));
  const violations: string[] = [];
  for (const file of uiFiles) {
    const content = readFile(path.join(uiDir, file)) ?? "";
    if (hardcodedColorPattern.test(content) || bgWhitePattern.test(content)) {
      violations.push(file);
    }
  }
  check(
    `No hardcoded color utilities in src/components/ui/ (checked ${uiFiles.length} files)`,
    violations.length === 0,
    violations.length > 0 ? `Violations: ${violations.join(", ")}` : undefined
  );
} else {
  check("src/components/ui/ directory exists", false);
}

// Report
const passed = results.filter((r) => r.passed).length;
const total = results.length;
const failed = results.filter((r) => !r.passed);

if (failed.length === 0) {
  console.log(`✅ DESIGN.1 PASSED — ${passed}/${total} checks`);
} else {
  console.log(`❌ DESIGN.1 FAILED — ${failed.length} check(s) failed`);
  for (const f of failed) {
    console.log(`  ✗ ${f.name}${f.reason ? `: ${f.reason}` : ""}`);
  }
}
