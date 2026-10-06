import { config } from "dotenv";
import { Octokit } from "@octokit/rest";
import { readFileSync } from "fs";

// Load environment variables
config();

const token = process.env.GITHUB_TOKEN;
if (!token) {
  throw new Error("GITHUB_TOKEN is required. Please set it in your .env file or environment variables.");
}

const pkg = JSON.parse(readFileSync("package.json", "utf-8"));
const version = `v${pkg.version}`;

const isDryRun = process.argv.includes("--dry-run");

function stripAnsi(string) {
  // eslint-disable-next-line no-control-regex
  return string.replace(/\x1B\[\d+m/g, "");
}

// Changesets consume their files when versioning, so the notes come from this version's CHANGELOG section
function getChangelogSection() {
  const changelog = readFileSync("CHANGELOG.md", "utf-8");
  const [, section = ""] = changelog.split(`\n## ${pkg.version}\n`);

  return section
    .split("\n## ")[0]
    .split("\n")
    .filter((line) => line.trim() && !line.startsWith("### "))
    .map((line) => line.replace(/^- [0-9a-f]{7,}: /, "").replace(/^ {2}/, ""))
    .join("\n");
}

// Custom release notes format
function generateReleaseNotes() {
  const cleanChanges = stripAnsi(getChangelogSection());

  const template = `
# Sea Trader ${version}

## What's New
${cleanChanges || "No changes documented for this release."}

## Installation
\`\`\`bash
npx ctrader
\`\`\`

## Feedback
If you encounter any issues or have suggestions, please [open an issue](https://github.com/zyishai/sea-trader/issues).

---
Happy Trading! 🏴‍☠️
`;

  return template.trim();
}

const octokit = new Octokit({
  auth: token,
});

async function createRelease() {
  const releaseNotes = generateReleaseNotes();

  if (isDryRun) {
    console.log("\n📋 Release Preview:");
    console.log("==================");
    console.log(`Version: ${version}`);
    console.log("\nRelease Notes:");
    console.log(releaseNotes);
    console.log("==================");
    return;
  }

  try {
    await octokit.repos.createRelease({
      owner: "zyishai",
      repo: "sea-trader",
      tag_name: version,
      name: `Sea Trader ${version}`,
      body: releaseNotes,
      draft: false,
      prerelease: version.includes("beta") || version.includes("alpha"),
    });
    console.log(`✅ Release ${version} created successfully!`);
  } catch (error) {
    console.error("❌ Failed to create release:", error);
    if (error.response) {
      console.error("Status:", error.response.status);
      console.error("Response:", error.response.data);
    }
    process.exit(1);
  }
}

createRelease();
