# govAIrn Database Design - Wallet Authentication

This document outlines the updated database schema design for govAIrn using Supabase. The design now focuses on wallet-based authentication as the primary authentication method, alongside the four pillars: Sense (data ingestion), Think (LLM reasoning), Explain (transparent UI), and Act (autonomous voting).

## Schema Overview

The database schema is organized into the following main sections:
1. Wallet-based Authentication & User Management
2. DAOs & Integrations
3. Proposals & Voting
4. AI Decision Engine
5. Analytics & History

## Development vs Production Tables

The application currently uses two parallel sets of tables:

- **Development tables** prefixed with `dev_` (e.g., `dev_profiles`, `dev_personas`)
- **Production tables** with no prefix (e.g., `profiles`, `personas`)

The application code automatically determines which tables to use based on the environment. In development mode (`import.meta.env.DEV`), it uses the `dev_` prefixed tables. In production, it uses the non-prefixed tables.

### Wallet Address as Primary Relational Key

A key aspect of the govAIrn database design is the use of **wallet addresses** as the primary relational key between profiles and personas, rather than traditional user IDs. This design choice enables:

1. **Wallet-first authentication** - Users can interact with the app primarily through their wallets
2. **Persistent preferences** - User preferences remain accessible via wallet address, even if auth user IDs change
3. **Simplicity** - Direct relationship between on-chain identity and user preferences

## Tables and Relationships

### Authentication & User Management

#### `profiles` and `dev_profiles`
- `id` - UUID (primary key)
- `wallet_address` - String (unique, not null) - Wallet address in lowercase format
- `display_name` - String (nullable)
- `created_at` - Timestamp
- `updated_at` - Timestamp
- `last_sign_in` - Timestamp - Last time wallet was connected

#### `wallet_addresses`
- `id` - UUID (primary key)
- `user_id` - UUID (references profiles.id)
- `wallet_address` - String
- `is_primary` - Boolean
- `created_at` - Timestamp
- `updated_at` - Timestamp

#### `personas` and `dev_personas`
- `id` - UUID (primary key)
- `wallet_address` - String (key relationship to profiles.wallet_address)
- `name` - String
- `risk` - Integer (0-100) - Risk tolerance preference
- `esg` - Integer (0-100) - ESG priority level
- `treasury` - Integer (0-100) - Treasury growth bias
- `horizon` - Integer (0-100) - Time horizon preference
- `frequency` - Integer (0-100) - Vote frequency preference
- `created_at` - Timestamp
- `updated_at` - Timestamp
- `is_active` - Boolean - Whether this is the user's active persona

### DAOs & Integrations

#### `daos`
- `id` - String (primary key)
- `name` - String
- `logo_url` - String
- `description` - Text
- `platform` - String (Ethereum, Base, etc.)
- `contract_address` - String
- `governance_url` - String
- `created_at` - Timestamp
- `updated_at` - Timestamp

#### `user_dao_delegations`
- `id` - UUID (primary key)
- `user_id` - UUID (references profiles.id)
- `dao_id` - String (references daos.id)
- `delegation_pct` - Integer (0-100)
- `persona_id` - UUID (references personas.id)
- `created_at` - Timestamp
- `updated_at` - Timestamp

#### `dao_integrations`
- `id` - UUID (primary key)
- `dao_id` - String (references daos.id)
- `integration_type` - String (snapshot, tally, etc.)
- `api_endpoint` - String
- `api_key` - String
- `config` - JSONB
- `created_at` - Timestamp
- `updated_at` - Timestamp
- `last_sync_at` - Timestamp
- `is_active` - Boolean

### Proposals & Voting

#### `proposals`
- `id` - UUID (primary key)
- `external_id` - String
- `dao_id` - String (references daos.id)
- `title` - String
- `summary` - Text
- `description` - Text
- `status` - String (active, queued, executed, missed)
- `start_time` - Timestamp
- `end_time` - Timestamp
- `voting_type` - String (simple majority, supermajority, etc.)
- `quorum` - String
- `impact` - String (high, medium, low)
- `url` - String
- `created_at` - Timestamp
- `updated_at` - Timestamp
- `raw_data` - JSONB (original proposal data)

#### `proposal_details`
- `id` - UUID (primary key)
- `proposal_id` - UUID (references proposals.id)
- `pros` - Text[] (array of strings)
- `cons` - Text[] (array of strings)
- `analyzed_text` - Text
- `created_at` - Timestamp
- `updated_at` - Timestamp

#### `votes`
- `id` - UUID (primary key)
- `user_id` - UUID (references profiles.id)
- `proposal_id` - UUID (references proposals.id)
- `vote_choice` - String (for, against, abstain)
- `vote_weight` - Numeric
- `executed` - Boolean
- `transaction_hash` - String
- `voted_at` - Timestamp
- `created_at` - Timestamp
- `updated_at` - Timestamp
- `is_ai_decided` - Boolean
- `is_manual_override` - Boolean

### AI Decision Engine

#### `ai_decisions`
- `id` - UUID (primary key)
- `user_id` - UUID (references profiles.id)
- `proposal_id` - UUID (references proposals.id)
- `persona_id` - UUID (references personas.id)
- `decision` - String (for, against, abstain)
- `confidence` - Numeric (0-100)
- `persona_match` - Numeric (0-100)
- `reasoning` - Text
- `chain_of_thought` - Text
- `created_at` - Timestamp

#### `ai_processing_queue`
- `id` - UUID (primary key)
- `proposal_id` - UUID (references proposals.id)
- `status` - String (pending, processing, completed, failed)
- `created_at` - Timestamp
- `updated_at` - Timestamp
- `completed_at` - Timestamp (nullable)
- `error` - Text (nullable)

#### `decision_factors`
- `id` - UUID (primary key)
- `ai_decision_id` - UUID (references ai_decisions.id)
- `factor_name` - String
- `factor_value` - Numeric
- `factor_weight` - Numeric
- `explanation` - Text
- `created_at` - Timestamp

#### `ai_prompts`
- `id` - UUID (primary key)
- `prompt_type` - String (proposal_analysis, vote_decision, etc.)
- `prompt_template` - Text
- `created_at` - Timestamp
- `updated_at` - Timestamp
- `is_active` - Boolean

### Analytics & History

#### `voting_history`
- `id` - UUID (primary key)
- `user_id` - UUID (references profiles.id)
- `dao_id` - String (references daos.id)
- `proposal_id` - UUID (references proposals.id)
- `vote_id` - UUID (references votes.id)
- `ai_recommendation` - String (for, against, abstain)
- `actual_vote` - String (for, against, abstain)
- `voted_at` - Timestamp
- `created_at` - Timestamp

#### `user_activity`
- `id` - UUID (primary key)
- `user_id` - UUID (references profiles.id)
- `activity_type` - String
- `activity_data` - JSONB
- `created_at` - Timestamp

## Indexes

- `profiles(wallet_address)` - For fast wallet authentication lookups
- `wallet_addresses(wallet_address)` - For multi-wallet support
- `personas(wallet_address, is_active)` - For active persona lookups
- `proposals(dao_id, status)` - For efficient proposal filtering
- `proposals(start_time, end_time)` - For time-based filtering
- `votes(user_id, proposal_id)` - For user's votes
- `votes(proposal_id, vote_choice)` - For vote analytics
- `ai_decisions(user_id, proposal_id)` - For AI decision history
- `voting_history(user_id)` - For user voting history
- `voting_history(dao_id)` - For DAO-specific history

## Row-Level Security (RLS) Policies

The following RLS policies ensure data security:

1. **Profiles Table**:
   - Users can view any profile
   - Users can update/delete only their own profile

2. **Wallet Addresses Table**:
   - Users can only access their own wallet addresses

3. **Personas Table**:
   - Users can only access personas associated with their wallet address

4. **DAOs and Proposals**:
   - DAOs and proposals are publicly readable
   - Only authenticated users can create or update delegations

5. **Votes and AI Decisions**:
   - Users can only access their own votes and AI decisions

## State Synchronization

Data synchronization between the client application and database follows these principles:

1. **Wallet Authentication Flow**:
   - On wallet connection: Check if profile exists, create if needed
   - Update last_sign_in timestamp on wallet connection
   - On disconnect: Clear session and sign out

2. **Profile Management**:
   - User profiles automatically created on first wallet connection
   - Wallet addresses stored in wallet_addresses table
   - Support for multiple wallet addresses per user

3. **Persona Management**:
   - UI preferences saved immediately to dev_personas/personas table based on environment
   - Active personas marked with is_active=true
   - Each wallet address can have multiple personas but only one active
   - Personas are referenced by wallet_address to ensure they remain accessible regardless of auth state

4. **DAO and Voting**:
   - Default DAOs created for testing
   - User delegations saved per DAO
   - Voting decisions stored with timestamps for auditing

## Supabase Storage Buckets

1. `avatars` - For user profile images
2. `dao-logos` - For DAO logo images
3. `proposal-assets` - For any images or files related to proposals
