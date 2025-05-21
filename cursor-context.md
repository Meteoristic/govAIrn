# GovAIrn Project Context

## Project Overview

GovAIrn is a decentralized governance platform that leverages AI to enhance user participation in DAO (Decentralized Autonomous Organization) governance. The platform enables users to connect their wallets, create governance personas based on their preferences, and participate in DAO governance directly or through AI-powered auto-voting agents.

### Core Value Proposition

GovAIrn addresses several key challenges in the DAO governance space:

1. **Governance Fatigue**: By providing AI agents that can vote on behalf of users according to their preferences
2. **Information Asymmetry**: By analyzing and summarizing complex proposals
3. **Low Participation Rates**: By lowering the barrier to meaningful participation
4. **Alignment with User Values**: By allowing users to define detailed governance personas

## Technical Architecture

### Frontend

- **Framework**: React with Vite
- **Styling**: TailwindCSS with custom components inspired by ShadcnUI
- **State Management**: React Context for authentication and global state
- **Web3 Integration**: RainbowKit and wagmi for wallet connectivity and interactions
- **UI Components**:
  - Custom `CardSpotlight` for interactive card elements
  - Modal components for setup flows
  - Dashboard layouts for different sections

### Backend

- **Database**: Supabase (PostgreSQL)
- **Authentication**: Sign-In with Ethereum (SIWE) integrated with Supabase auth
- **Storage**: Supabase storage for user data
- **Security**: Row-Level Security (RLS) policies in Supabase with service role key bypass for admin functions

### Authentication Flow

GovAIrn uses a wallet-first authentication approach:

1. **Wallet Connection**:
   - Users connect their Ethereum wallet through RainbowKit
   - The application captures the wallet address and stores it in lowercase format

2. **SIWE Authentication**:
   - Sign-In with Ethereum (SIWE) is used for secure authentication
   - Users sign a message with their wallet to verify ownership
   - A deterministic password is generated based on the wallet address

3. **Supabase Integration**:
   - Upon successful verification, user profiles are created/updated in Supabase
   - The wallet address is linked to the user profile
   - The AuthContext component manages the user session and database synchronization

4. **Multiple Wallet Support**:
   - Users can connect multiple wallets to their profile
   - All wallet addresses are stored in the wallet_addresses table

5. **Authentication State**:
   - Authentication state is tracked in the AuthContext component
   - This state is critical for operations requiring user identification, including auto-vote functionality

### Key Tables

#### Core User Tables
1. **dev_profiles**: Main production user data with the following structure:
   - `id`: UUID (primary key)
   - `wallet_address`: Text (user's wallet address in lowercase)
   - `display_name`: Text (optional)
   - `created_at`, `updated_at`, `last_sign_in`: Timestamps

2. **profiles**: Legacy/backup user data table 

3. **wallet_addresses**: Supporting multiple wallets per user with links to profiles

#### User Preferences
4. **dev_personas**: Production user governance preferences with fields:
   - `id`: UUID (primary key)
   - `wallet_address`: Text (user's wallet address in lowercase)
   - `name`: Text
   - `risk`, `esg`, `treasury`, `horizon`, `frequency`: Integer preference values
   - `is_active`: Boolean

5. **personas**: Legacy/backup persona data

#### Agent and Auto-Vote System
6. **agent_wallets**: AI execution agents for auto-voting
   - Stores the AI agent wallet information with the following structure:
     - `id`: UUID (primary key)
     - `user_id`: UUID (foreign key to auth.users)
     - `name`: Text (agent name)
     - `description`: Text (optional)
     - `cdp_wallet_id`: Text (CDP wallet identifier)
     - `public_address`: Text (agent's public wallet address)
     - `created_at`: Timestamp
   - This table must be populated first before creating entries in user_dao_agents
   - The `createAgentWallet` function in agent-kit.service.ts handles the creation of these records

7. **user_dao_agents**: Critical table for auto-vote functionality
   - Links users, DAOs, and their agents with the following structure:
     - `id`: UUID (primary key)
     - `user_id`: UUID (foreign key to auth.users)
     - `dao_id`: Text (DAO identifier)
     - `agent_id`: UUID (foreign key to agent_wallets)
     - `wallet_address`: Text (user's wallet address - critical field) 
     - `is_active`: Boolean
     - `created_at`, `updated_at`: Timestamps
   - This is the key table for the auto-vote feature that's currently broken
   - The `enableAutoVote` function in agent-kit.service.ts fails to properly insert records into this table

#### DAO and Governance
8. **daos**: DAO information and metadata
9. **proposals**: Governance proposals from DAOs
10. **votes**: Recorded votes (both manual and auto-votes)
11. **ai_decisions**: AI-generated voting decisions based on user personas

## Current Implementation Status

### Completed Features

1. **Authentication System**:
   - Wallet-based authentication through RainbowKit and wagmi
   - SIWE implementation for secure wallet verification
   - Automatic profile creation when connecting wallets
   - Handling multiple wallet addresses per user account

2. **UI Framework**:
   - Modern, responsive design with a dark theme
   - Interactive components with animation effects
   - Dashboard layout with sidebar navigation
   - Modal components for various user workflows

3. **DAO Exploration**:
   - DAO cards with key information
   - Visual indicators for active proposals
   - Integration with DAO data sources

4. **Persona Builder**:
   - User preference capture for governance decisions
   - Storage of these preferences for agent guidance

5. **Proposal Analysis**:
   - AI-powered summary generation for complex proposals
   - Recommendation engine based on user personas

6. **Agent Intelligence**:
   - Refinement of agent decision-making based on user preferences
   - Predictive voting models

7. **Visual Identity**:
   - Logo implementation and brand identity
   - Consistent styling and UI elements

### In-Progress Features

1. **Auto-Vote System**: [CRITICAL - NEEDS IMMEDIATE ATTENTION]
   - Agent setup modal implementation is incomplete
   - UI functionality is broken - clicking "Enable Auto-Vote" button does nothing
   - Database operations for agent creation need debugging
   - Fix for agent wallet creation and association with user needed
   - This is a critical feature that needs to be fixed in Cursor

2. **Vote Execution**:
   - On-chain vote confirmation and execution
   - Transaction handling and confirmation

3. **Analytics Dashboard**:
   - Visualization of user voting patterns
   - Performance metrics for auto-voting agents

### Known Issues

1. **Auto-Vote System (CRITICAL)**: 
   - **Critical Issue**: The "Enable Auto-Vote" button in the modal doesn't trigger the expected actions - clicking it produces no visible effect
   - Backend operations for agent creation and wallet linking are failing silently
   - Database writes to user_dao_agents table are not completing successfully
   - The modal fails to advance to the success screen after clicking the button
   - The agent creation flow using AgentKitService is incomplete/broken
   - **Important Note for Cursor**: This needs to be fixed without modifying the UI components or layouts - the design must remain unchanged while fixing the backend and event handling logic

2. **Authentication Edge Cases**:
   - Occasional errors in the SIWE flow with certain wallet providers
   - Better error recovery needed for failed sign-in attempts
   - Ensure wallet addresses are consistently stored in lowercase format as required

3. **Performance Optimization**:
   - Potential for state management improvements 
   - Opportunity for better caching of proposal data
   - Console error cleanup needed

## Technical Debt and Future Considerations

### Immediate Priorities

1. **Fix Auto-Vote Feature (HIGHEST PRIORITY)**:
   - Fix the `handleCreateAgent` function in `AgentSetupModal.tsx` to properly handle button clicks
   - Debug the `enableAutoVote` method in `agent-kit.service.ts` to ensure it correctly saves records to the database
   - Add proper state management to ensure the modal advances to step 2 (success state) after enabling auto-vote
   - Ensure proper error handling and user feedback during the process
   - Fix the RLS policy bypass using the service role key to allow proper database operations
   - Maintain compatibility with the wallet-based authentication system
   - Current implementation attempts are located in:
     - `/src/components/modals/AgentSetupModal.tsx` (UI and event handling)
     - `/src/lib/services/agent-kit.service.ts` (Backend operations)
     - `/src/components/daos/DaoCard.tsx` (Integration with modal and status updates)

2. **Robust Error Handling**:
   - Implement comprehensive error handling across all async operations
   - Provide meaningful feedback to users during failures
   - Add logging infrastructure for better debugging

3. **Database Schema Optimization**:
   - Ensure proper indexing on frequently queried fields
   - Review and refine RLS policies for security
   - Optimize join queries for performance

4. **Wallet Integration Improvements**:
   - Support for more wallet providers
   - Better handling of disconnection scenarios
   - Session persistence optimization

### Medium-term Goals

1. **Multi-chain Support**:
   - Extend architecture to support multiple blockchain networks
   - Abstract chain-specific logic for easier expansion

2. **Enhanced Agent Intelligence**:
   - Integration with more sophisticated AI models for better decision-making
   - Learning from user feedback to improve agent performance
   - More nuanced persona preference capture

3. **Mobile Responsiveness**:
   - Refine mobile experience across all views
   - Consider native mobile app development

### Long-term Vision

1. **Governance Analytics Platform**:
   - Advanced analytics on governance participation
   - DAO performance metrics and insights

2. **Cross-DAO Identity**:
   - Unified reputation system across DAOs
   - Portable governance profiles

3. **Governance-as-a-Service**:
   - White-label solution for existing DAOs
   - Custom governance workflows for different types of organizations

## Development Best Practices

### Code Organization

- React components are organized by function (UI, layout, modals, etc.)
- Services are separated by domain (authentication, DAO, agent, etc.)
- Context providers handle global state management

### Styling Approach

- TailwindCSS for utility-first styling
- Component composition for reusable UI elements
- Custom animations for interactive elements

### Testing Strategy

- Unit tests for key utility functions
- Component testing for UI elements
- Integration tests for critical user flows

### Deployment Pipeline

- GitHub-based workflow
- Automated builds and deployments
- Environment-specific configuration

## Next Steps for Development

### Immediate Tasks for Cursor

1. **Fix Auto-Vote Functionality (CRITICAL PATH)**:
   - **Button Click Handling**: Debug and fix the button click event in AgentSetupModal.tsx to ensure it properly triggers the handleCreateAgent function
   - **State Transition**: Fix the state transition to ensure the modal moves from step 1 to step 2 after clicking "Enable Auto-Vote"
   - **Database Operations**: Debug the agent-kit.service.ts file to ensure it correctly creates and links the agent with the DAO
   - **Technical Details**:
     - The current implementation attempts to use the Supabase admin client with service role key to bypass RLS
     - Primary tables involved: agent_wallets, user_dao_agents
     - The UI component should remain unchanged, fixing only the event handling and backend logic
   - **Recommended Approach**:
     1. Add console logs to track the event flow from button click to final database operation
     2. Ensure the appropriate authorization headers are set for the service role key
     3. Verify all Promises are properly awaited and errors are caught
     4. Test with a default fallback implementation that forces UI success even if backend fails

2. **Fix Authentication Robustness**:
   - Address SIWE flow errors
   - Improve session management
   - Ensure wallet addresses are consistently stored in lowercase format

3. **Add Comprehensive Logging**:
   - Implement structured logging
   - Capture key user actions for debugging

### Near-term Goals

1. **Vote Execution Implementation**:
   - Connect the auto-vote system to actual on-chain transactions
   - Implement transaction monitoring and confirmation

2. **Polish User Experience**:
   - Address UX friction points
   - Add guided onboarding for new users
   - Improve loading states and transitions

## Auto-Vote Feature Bug Details

### Issue Description

The auto-vote feature is currently broken with the following symptoms:

1. When a user clicks the "Enable Auto-Vote" button in the AgentSetupModal, nothing happens
2. The modal does not advance to the success step (step 2)
3. No new records are created in the user_dao_agents table
4. No error messages are displayed to the user

### Technical Analysis

Based on code analysis, the following technical issues need to be fixed:

1. **Event Handling**: The button click event in AgentSetupModal.tsx appears to be properly connected to the handleCreateAgent function, but the function isn't executing completely or is failing silently

2. **Database Operations**: The enableAutoVote method in agent-kit.service.ts is not successfully creating records in the user_dao_agents table

3. **Authentication Integration**: The service role key bypass for Row-Level Security (RLS) is not working correctly

4. **Error Handling**: Errors are not being caught and handled properly, leading to silent failures

### Fix Strategy

1. **AgentSetupModal.tsx**:
   - Add debouncing or event completion checking to the button click handler
   - Ensure state transitions happen even if the backend operations fail
   - Add console.log statements to track the execution flow
   - Make sure wallet addresses are consistently handled in lowercase format

2. **agent-kit.service.ts**:
   - Fix the supabaseAdmin client to properly use the service role key
   - Improve error handling to catch and log all issues
   - Add fallback mechanisms to ensure data gets saved
   - Verify the user_id, dao_id, and agent_id parameters are correctly passed

3. **Integration with Wallet Authentication**:
   - Ensure the wallet address is correctly retrieved from the authentication context
   - Verify it matches the format expected by the database (lowercase)

### Implementation Notes

1. **Do Not Change UI**: Per strict requirements, do not modify any UI components, layout, styling, or placement
2. **Focus on Logic**: Only fix the event handling and backend integration logic
3. **Test With Console Logs**: Add temporary console logs to debug the issue, which can be removed later

## Transition to Cursor

### Key Files to Focus On

1. **Auto-Vote Functionality**:
   - `/src/components/modals/AgentSetupModal.tsx` - Contains the modal UI and handleCreateAgent function
   - `/src/lib/services/agent-kit.service.ts` - Contains backend logic for creating agents and enabling auto-vote
   - `/src/components/daos/DaoCard.tsx` - Contains the integration with the modal and status updates

2. **Authentication Flow**:
   - `/src/context/AuthContext.tsx` - Contains the authentication logic including SIWE implementation
   - `/src/lib/supabase.ts` - Contains the Supabase client configuration

### Development Environment Setup

1. **Required Environment Variables**:
   - VITE_SUPABASE_URL - The URL of your Supabase instance
   - VITE_SUPABASE_ANON_KEY - The anonymous key for public operations
   - VITE_SUPABASE_SERVICE_ROLE_KEY - The service role key for admin operations (critical for auto-vote)

2. **Running the Application**:
   - Use `npm run dev` to start the development server
   - Navigate to the DAOs page to test the auto-vote functionality
   - Click on "Setup" for a DAO card to open the agent setup modal
   - The "Enable Auto-Vote" button should advance to the success step upon clicking (currently broken)

## Conclusion

GovAIrn represents a significant innovation in the DAO governance space by combining AI capabilities with decentralized governance. The current implementation provides a solid foundation with the core wallet connectivity, user authentication, and agent setup framework in place. The next phase of development should focus on completing the auto-vote functionality, refining the user experience, and implementing the proposal analysis capabilities that form the core value proposition of the platform.

The move to Cursor will facilitate better error handling, collaborative development, and overall code quality improvements necessary to bring this ambitious vision to reality.
