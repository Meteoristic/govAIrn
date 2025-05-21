#!/bin/bash

# Script to push only necessary files to the GovAIrn GitHub repository
# Created for the Meteoristic/govAIrn repository

echo "🚀 Preparing GovAIrn for GitHub..."

# Initialize git if not already done
if [ ! -d .git ]; then
  echo "📁 Initializing git repository..."
  git init
fi

# Make sure we have the right remote
echo "🔗 Setting up remote repository..."
git remote remove origin 2>/dev/null
git remote add origin https://github.com/Meteoristic/govAIrn.git

# Clean any previous staging
git reset

# Add only necessary files
echo "📋 Adding essential project files..."

# Core application code
echo "  - Adding src/ directory..."
git add src/

echo "  - Adding public/ directory..."
git add public/

# Configuration files
echo "  - Adding configuration files..."
git add package.json
git add .gitignore
git add .npmrc
git add tsconfig.json
git add vite.config.js vite.config.ts 2>/dev/null
git add tailwind.config.js postcss.config.js 2>/dev/null

# Documentation
echo "  - Adding documentation..."
git add README.md
git add LICENSE
git add .env.example
git add ARCHITECTURE.md
git add CONTRIBUTING.md

# GitHub specific files
echo "  - Adding GitHub templates and configuration..."
git add .github/
git add CODEOWNERS

# Show what's being committed
echo -e "\n📦 The following files will be committed:"
git status

echo -e "\n⚠️  Files like REFACTORING.md, node_modules/, dist/, and .env are excluded"

# Confirm with the user
read -p "🤔 Do you want to commit and push these files? (y/n): " confirm

if [ "$confirm" != "y" ]; then
  echo "🛑 Operation cancelled. No files were committed or pushed."
  exit 1
fi

# Commit and push
echo "💾 Committing files..."
git commit -m "Initial commit of GovAIrn project"

echo "☁️  Pushing to GitHub..."
git push -u origin main

echo -e "\n✅ Done! Your code has been pushed to https://github.com/Meteoristic/govAIrn"
echo "   You may be prompted for your GitHub credentials during the push." 