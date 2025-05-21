# DAO Seeding Instructions

This document explains how to add custom DAOs to your local development database for testing purposes.

## Files Added for DAO Seeding

Several files have been added to facilitate DAO seeding and management:

1. **`seed-custom-dao.js`** - A client-side script that lets you add any Snapshot space as a DAO to your database
2. **`check-functions.js`** - A utility script to check if all required edge functions are deployed
3. **`supabase/functions/add-custom-dao/index.ts`** - An edge function that handles adding DAOs, bypassing RLS policies

## npm Commands

New npm commands have been added to package.json:

```bash
# Add a DAO by its Snapshot space ID
npm run seed:dao aave.eth

# Discover DAOs with active proposals
npm run seed:dao -- --discover

# Check if all required edge functions are deployed
npm run check:functions
```

## Adding Any Snapshot DAO

The application allows you to add any DAO from Snapshot to your database for testing purposes. This is useful for:

1. Testing with real-world DAOs
2. Experimenting with different governance styles
3. Developing new features with diverse data
4. Debugging with specific DAO structures

### Prerequisites

Make sure you have:

1. Node.js installed
2. The repository cloned and dependencies installed (`npm install`)
3. A running local Supabase instance or connection to a development database
4. The `.env` file configured with your Supabase credentials:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. The `add-custom-dao` edge function deployed to your Supabase project

### How It Works

The seeding tool uses a Supabase Edge Function to bypass Row-Level Security (RLS) policies. This allows you to:

1. Add new DAOs directly to the database using admin privileges
2. Discover active DAOs from Snapshot without permission issues
3. Sync proposals using existing edge functions

### Using the Seed Script

#### Option 1: Using npm script

```bash
# Replace "aave.eth" with any Snapshot space ID
npm run seed:dao aave.eth
```

#### Option 2: Running the script directly

```bash
node seed-custom-dao.js aave.eth
```

### Discovering DAOs with Active Proposals

Not sure which DAOs to add? Use the discover feature to find DAOs that currently have active proposals:

```bash
# Find DAOs with active proposals
npm run seed:dao -- --discover

# Or run directly
node seed-custom-dao.js --discover
```

This will:
1. Query the Snapshot API for popular spaces (via the edge function)
2. Check each space to see if it has active proposals
3. Display a list of spaces with active proposals, including:
   - Space ID
   - Name
   - Network
   - Number of active proposals

Once you find a space you're interested in, you can add it using the standard command.

### How to Find Snapshot Space IDs

1. Visit [Snapshot](https://snapshot.org/)
2. Search for the DAO you're interested in
3. Navigate to the DAO's page
4. The space ID is in the URL: `https://snapshot.org/#/<space-id>`

### Popular Snapshot Spaces to Try

- `aave.eth` - Aave
- `ens.eth` - Ethereum Name Service
- `optimism.eth` - Optimism
- `uniswapgovernance.eth` - Uniswap
- `gitcoin.eth` - Gitcoin
- `apecoin.eth` - ApeCoin
- `sushigov.eth` - SushiSwap
- `basedghouls.eth` - Based Ghouls
- `opcollective.eth` - Optimism Collective
- `safesnapshotgov.eth` - Safe

### After Adding a DAO

Once you've added a DAO, you can:

1. Sync its active proposals (the script will ask if you want to do this)
2. View it in the application UI
3. Generate AI advice for its proposals

### Deploying the Required Edge Function

If the edge function isn't already deployed, you can deploy it with:

```bash
# Navigate to your project root
cd /path/to/project

# Deploy the edge function
npx supabase functions deploy add-custom-dao --project-ref your-project-ref
```

### Troubleshooting

If you encounter any issues:

1. Make sure your Supabase credentials are correct
2. Check that the Snapshot space ID is valid
3. Look for error messages in the console output
4. Verify that the edge function is properly deployed and accessible
5. Check your Supabase logs for any function-related errors

### Database Impact

Adding a DAO will:

1. Create an entry in the `daos` table
2. If you choose to sync proposals, add entries to the `proposals` table
3. Generate relevant entries in related tables like `proposal_details` 