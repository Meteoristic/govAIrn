# govAIrn Architecture

This section describes the architecture of the govAIrn platform.

## System Overview

govAIrn follows a modern web application architecture with several key components:

1. **Client Application**: React-based frontend using Vite
2. **Backend Services**: Supabase for authentication, database, and storage
3. **AI Processing**: Integration with language models for proposal analysis
4. **Blockchain Integration**: Connection to Ethereum-based governance systems

## Architectural Diagram

```
┌─────────────────┐     ┌───────────────────┐     ┌─────────────────┐
│                 │     │                   │     │                 │
│  React Frontend │◄────┤  Supabase Backend │◄────┤  AI Processing  │
│                 │     │                   │     │                 │
└────────┬────────┘     └─────────┬─────────┘     └─────────────────┘
         │                        │
         │                        │
         ▼                        ▼
┌─────────────────┐     ┌───────────────────┐
│                 │     │                   │
│ Web3/Blockchain │     │   Storage/Logs    │
│                 │     │                   │
└─────────────────┘     └───────────────────┘
```

## Key Components

### Frontend Architecture

- **Authentication**: Wallet-based authentication using SIWE
- **State Management**: Context API and custom hooks
- **UI Framework**: TailwindCSS with shadcn/ui components
- **Routing**: React Router
- **API Integration**: Custom fetch wrapper and Supabase client

### Backend Architecture

- **Database**: PostgreSQL via Supabase
- **Authentication**: Supabase Auth with SIWE integration
- **Storage**: Supabase Storage for assets
- **Security**: Row-Level Security policies
- **Real-time**: Supabase real-time subscriptions

### Data Flow

1. User connects wallet and authenticates
2. User profile and personas are retrieved/created
3. Proposals are fetched from blockchain or database
4. AI analysis is performed on proposals
5. Results are presented to the user for decision-making

## Database Schema

See the [DB-Design.md](../../DB-Design.md) file for a detailed database schema.
