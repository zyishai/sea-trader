import { config } from "dotenv";
import { Octokit } from "@octokit/rest";
import { readFileSync, readdirSync } from "fs";

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

// Custom release notes format
function generateReleaseNotes() {
  const changesetDir = ".changeset";
  const files = readdirSync(changesetDir).filter((file) => file.endsWith(".md") && file !== "README.md");

  let changes = "";

  for (const file of files) {
    const content = readFileSync(`${changesetDir}/${file}`, "utf-8");
    // Changeset files have a frontmatter section and then the description
    // The description is everything after the second '---'
    const [, , ...descriptionParts] = content.split("---");
    const description = descriptionParts.join("---").trim();
    changes += `${description}\n\n`;
  }
  const cleanChanges = stripAnsi(changes)
    .split("\n")
    .filter((line) => line.trim() && !line.includes("---") && !line.includes("NO packages"))
    .join("\n");

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
