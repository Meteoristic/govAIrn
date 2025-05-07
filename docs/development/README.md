# Development Guide

This guide covers the development environment setup and processes for contributing to the govAIrn project.

## Prerequisites

- Node.js (v18 or higher)
- npm (v9 or higher)
- Git

## Local Development Setup

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd govairn-vote-pilot
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   - Copy `.env.example` to `.env`
   - Fill in the required Supabase credentials

4. Start the development server:
   ```bash
   npm run dev
   ```

5. The application will be available at `http://localhost:5173`

## Project Structure

```
govairn-vote-pilot/
├── .github/            # GitHub workflows and configurations
├── docs/              # Documentation
├── public/            # Static assets
├── scripts/           # Utility scripts
├── src/
│   ├── components/    # UI components
│   ├── context/       # React context providers
│   ├── hooks/         # Custom React hooks
│   ├── lib/           # Utility functions and services
│   ├── pages/         # Page components
│   ├── styles/        # Global styles
│   ├── types/         # TypeScript type definitions
│   ├── App.tsx        # Main application component
│   └── main.tsx       # Entry point
├── .env               # Environment variables
├── .gitignore         # Git ignore file
├── DB-Design.md       # Database design documentation
├── Implementation-Plan.md # Implementation roadmap
├── package.json       # Dependencies and scripts
└── README.md          # Project overview
```

## Testing

Run tests with:

```bash
# Run all tests
npm test

# Watch mode for development
npm run test:watch

# Generate coverage report
npm run test:coverage
```

## Code Style and Linting

The project uses ESLint for code linting:

```bash
# Run linting
npm run lint
```

## Build Process

To build the application for production:

```bash
npm run build
```

For a development build:

```bash
npm run build:dev
```

## CI/CD Pipeline

The project uses GitHub Actions for continuous integration and deployment. The workflow is defined in `.github/workflows/ci.yml`.

The pipeline performs:
- Code linting
- Building the project
- Running tests
- (When configured) Deployment to production or staging environments

## Environment Configuration

The application uses different environment variables for development and production:

### Development
- Uses development Supabase environment
- Connects to `dev_` prefixed tables
- Enables debug features

### Production
- Uses production Supabase environment
- Connects to production tables
- Disables debug features
