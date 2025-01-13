import { execSync } from "child_process";

function testRelease() {
  try {
    // 1. Check for uncommitted changes
    console.log("🔍 Checking git status...");
    const status = execSync("git status --porcelain").toString();
    if (status) {
      throw new Error("Working directory is not clean. Commit or stash changes first.");
    }

    // 2. Test changeset version
    console.log("📦 Testing version bump...");
    execSync("changeset version --snapshot test", { stdio: "inherit" });

    // 3. Test npm pack (creates tarball without publishing)
    console.log("📋 Testing package creation...");
    execSync("npm pack --dry-run", { stdio: "inherit" });

    // 4. Test release notes generation
    console.log("📝 Testing release notes generation...");
    execSync("ts-node scripts/create-release.ts --dry-run", { stdio: "inherit" });

    // 5. Reset changes
    console.log("🔄 Cleaning up...");
    execSync("git reset --hard", { stdio: "inherit" });

    console.log("✅ Release test completed successfully!");
  } catch (error) {
    console.error("❌ Release test failed:", error);
    // Cleanup on failure
    execSync("git reset --hard", { stdio: "inherit" });
    process.exit(1);
  }
}

testRelease();
