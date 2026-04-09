---
name: dx-setup
description: Developer experience files — README.md, package.json scripts, .gitignore, TypeScript strict config. Use when creating project configuration or documentation files.
globs: "**/README.md,**/package.json,**/tsconfig.json,**/.gitignore,**/.env.example"
---

# Developer Experience Setup

## README.md (include all sections)

```markdown
# Project Name

One-sentence description.

## Setup

npm install
cp .env.example .env.local
npm run dev    # http://localhost:3000

## Scripts

| Command | Description |
|---------|-------------|
| npm run dev | Development server |
| npm run build | Production build |
| npm test | Run tests |

## Architecture

- src/lib/ — Database, auth, validation
- src/components/ — React components
- src/app/ — Pages and API routes
```

## package.json scripts (minimum)

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit"
  }
}
```

## tsconfig.json (strict mode required)

```json
{
  "compilerOptions": {
    "strict": true,
    "noEmit": true,
    "jsx": "preserve",
    "moduleResolution": "bundler",
    "paths": { "@/*": ["./src/*"], "@tests/*": ["./tests/*"] }
  }
}
```

## Rules

1. README must let a new developer run the project in under 5 minutes.
2. `.env.example` with every variable documented.
3. `.gitignore` includes `.env*`, `*.db`, `node_modules/`, `.next/`.
4. TypeScript strict mode — always.
