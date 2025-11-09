# Publishing maintsight to npm

This guide will help you publish the maintsight CLI tool to npm.

## Prerequisites

1. **npm Account**: Create an account at https://www.npmjs.com/signup
2. **npm Access Token**: Generate a token for automated publishing
3. **GitHub Repository Secrets**: Add the token to your repository

## Step 1: Create npm Access Token

1. Log in to https://www.npmjs.com/
2. Click on your profile picture → "Access Tokens"
3. Click "Generate New Token" → "Classic Token"
4. Select "Automation" type
5. Copy the token (it starts with `npm_`)

## Step 2: Add Token to GitHub Secrets

1. Go to https://github.com/floristafa/maintsight-cli/settings/secrets/actions
2. Click "New repository secret"
3. Name: `NPM_TOKEN`
4. Value: Paste your npm token
5. Click "Add secret"

## Step 3: Verify Package Configuration

Your package.json should have:

```json
{
  "name": "maintsight",
  "version": "1.0.3",
  "publishConfig": {
    "access": "public",
    "registry": "https://registry.npmjs.org/"
  }
}
```

## Step 4: Test Local Publishing (Optional)

Before relying on CI/CD, you can test publishing locally:

```bash
# Login to npm
npm login

# Run a dry-run to see what will be published
npm publish --dry-run

# If everything looks good, publish
npm publish --access public
```

## Step 5: Fix Current State

Since v1.0.3 tag already exists but npm publish failed, you have two options:

### Option A: Manual Publish Current Version

```bash
# Make sure you're on the latest
git pull origin main

# Login to npm
npm login

# Publish current version
npm publish --access public
```

### Option B: Bump to Next Version and Let CI/CD Handle It

```bash
# Make a small change (like updating README)
echo "\n" >> README.md

# Commit and push
git add README.md
git commit -m "docs: trigger new release"
git push origin main
```

## Step 6: Verify GitHub Actions Workflow

The workflow should now work because:

1. ✅ package-lock.json is in sync
2. ✅ Authentication step creates .npmrc file
3. ✅ publishConfig is set in package.json
4. ❓ NPM_TOKEN secret must be configured

## Common Issues and Solutions

### "Tag already exists"

- This happens when a previous release partially succeeded
- Solution: Either publish manually or bump to next version

### "Need auth"

- The NPM_TOKEN is not set or invalid
- Solution: Regenerate token and update GitHub secret

### "Package name too similar to existing packages"

- npm might reject names too similar to existing packages
- Solution: Choose a more unique name or add a scope (@username/package)

## After Successful Publish

1. Verify on npm: https://www.npmjs.com/package/maintsight
2. Test installation:
   ```bash
   npm install -g maintsight
   maintsight --version
   ```
3. Update README with npm badge:
   ```markdown
   [![npm version](https://badge.fury.io/js/maintsight.svg)](https://www.npmjs.com/package/maintsight)
   ```

## Maintaining the Package

- Use conventional commits for automatic version bumping
- `fix:` commits trigger patch release (1.0.3 → 1.0.4)
- `feat:` commits trigger minor release (1.0.3 → 1.1.0)
- `BREAKING CHANGE:` triggers major release (1.0.3 → 2.0.0)
