# GovAIrn Architecture

This document provides an overview of the GovAIrn application architecture to help developers understand the system organization and component relationships.

## System Overview

GovAIrn is a React-based web application that integrates with Snapshot DAO governance platforms and uses AI to analyze proposals and make recommendations based on user personas. The system uses Supabase for data storage and OpenAI for intelligent proposal analysis.

```
┌─────────────────┐      ┌──────────────┐      ┌─────────────┐
│  React Frontend │<─────│ Supabase DB  │<─────│ Edge        │
│  (User Interface)│─────>│ (Data Store) │─────>│ Functions   │
└─────────────────┘      └──────────────┘      └─────────────┘
        │                                             │
        │                                             │
        ▼                                             ▼
┌─────────────────┐      ┌──────────────┐      ┌─────────────┐
│  Web3 Libraries │      │ OpenAI API   │      │ Snapshot    │
│  (User Auth)    │      │ (AI Analysis)│      │ API         │
└─────────────────┘      └──────────────┘      └─────────────┘
```

## Directory Structure

```
src/
├── components/        # React components
│   ├── auth/          # Authentication components
│   ├── dashboard/     # Dashboard components
│   ├── proposals/     # Proposal-related components
│   ├── settings/      # Settings components
│   └── ui/            # Reusable UI components
├── context/           # React context providers
│   ├── AuthContext.tsx # Authentication context
│   └── ...
├── hooks/             # Custom React hooks
├── lib/               # Utility libraries
│   ├── factories/     # Factory classes
│   ├── services/      # Service classes for API interactions
│   └── utils/         # Utility functions
├── pages/             # Page components
└── styles/            # Global styles
```

## Key Components

### Authentication Flow

Authentication is handled via the Sign-In with Ethereum (SIWE) protocol, managed by the `AuthContext` provider. The workflow is:

1. User connects their wallet using RainbowKit
2. User signs a message to prove wallet ownership
3. AuthContext manages authentication state and provides it to the application

### DAO and Proposal Management

- `DaoService`: Manages interaction with DAO data in Supabase
- `ProposalService`: Handles fetching and processing proposal data
- `SnapshotService`: Interface to the Snapshot GraphQL API

### AI Decision Engine

- `AIDecisionService`: Manages the creation and retrieval of AI-generated decisions
- `OpenAIService`: Handles communication with the OpenAI API
- `AIDecisionFactory`: Creates AI decision objects with appropriate structure

### User Interface Components

The UI is built with React components using shadcn/ui and Tailwind CSS:

- `DashboardLayout`: Main application layout
- `ProposalFeed`: Displays a feed of proposals with AI analysis
- `ConnectWalletModal`: Handles wallet connection and authentication
- Various UI components from shadcn/ui

## Data Flow

1. User authenticates with their Ethereum wallet
2. Application fetches DAOs and proposals from Snapshot
3. Proposals are processed through the AI analysis pipeline
4. Results are stored in Supabase for persistent access
5. UI components display the proposals with AI recommendations

## Integration Points

- **Snapshot API**: Integration for fetching DAO and proposal data
- **OpenAI API**: Used for AI analysis of proposals
- **Supabase**: Persistent data storage and user management
- **RainbowKit/wagmi**: Web3 wallet connection and interaction

## State Management

State is managed primarily through React Context API:
- `AuthContext`: Authentication state
- Component-level state with React hooks for UI components

## Deployment Architecture

The application uses a client-side architecture with serverless functions:

- Frontend: Deployed as a static site (Vercel/Netlify)
- Backend: Supabase provides database and serverless Edge Functions
- Authentication: Decentralized using SIWE protocol

## Security Considerations

- User wallet authentication via Ethereum signatures
- Sensitive data handled through secure Supabase RLS policies
- Environment variables for API keys and sensitive configuration 