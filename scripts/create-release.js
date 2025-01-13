import { config } from "dotenv";
import { Octokit } from "@octokit/rest";
import { execSync } from "child_process";
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

// Custom release notes format
function generateReleaseNotes() {
  const changes = execSync("npx changeset status").toString();

  const template = `
# Sea Trader ${version}

## What's New
${changes}

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
    process.exit(1);
  }
}

createRelease();
