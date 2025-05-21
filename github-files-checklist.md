# GitHub Repository Files Checklist

This document lists which files should be included or excluded when pushing to GitHub.

## Files to Include ✅

### Core Application Code
- [ ] `src/` directory (all application source code)
- [ ] `public/` directory (static assets)

### Configuration Files
- [ ] `package.json` (project metadata and dependencies)
- [ ] `.gitignore` (specifies intentionally untracked files)
- [ ] `.npmrc` (npm configuration)
- [ ] `tsconfig.json` (TypeScript configuration)
- [ ] `vite.config.js` or `vite.config.ts` (Vite configuration)
- [ ] `tailwind.config.js` (Tailwind CSS configuration)
- [ ] `postcss.config.js` (PostCSS configuration)

### Documentation
- [ ] `README.md` (project overview and getting started guide)
- [ ] `LICENSE` (MIT license)
- [ ] `.env.example` (template for environment variables)
- [ ] `ARCHITECTURE.md` (system architecture documentation)
- [ ] `CONTRIBUTING.md` (contribution guidelines)

### GitHub-specific Files
- [ ] `.github/ISSUE_TEMPLATE/bug_report.md` (bug report template)
- [ ] `.github/ISSUE_TEMPLATE/feature_request.md` (feature request template)
- [ ] `.github/PULL_REQUEST_TEMPLATE.md` (PR template)
- [ ] `.github/workflows/ci.yml` (CI/CD workflow)
- [ ] `CODEOWNERS` (code ownership information)

## Files to Exclude ❌

### Internal Documents
- [ ] `REFACTORING.md` (internal refactoring notes)
- [ ] Any personal notes or draft documents
- [ ] Planning documents specific to your team

### Sensitive Information
- [ ] `.env` (contains actual secrets and API keys)
- [ ] Any credential files
- [ ] Private configuration files

### Generated Files
- [ ] `node_modules/` (dependencies, specified in .gitignore)
- [ ] `dist/` or `build/` (build output, specified in .gitignore)
- [ ] `.DS_Store` (macOS specific files, specified in .gitignore)
- [ ] Any log files

## How to Use This Checklist

1. Check off items as you add them to your commit
2. Double-check that excluded files are not being committed
3. Run the `push-to-github.sh` script to automatically select the correct files 