export default {
  packages: ["packages/otok"],
  tagPackage: "packages/otok",
  qaCommand: "pnpm release:check",
  commitMessage: (version) => `chore(otok): release v${version}`,
};
