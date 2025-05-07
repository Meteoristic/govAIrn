# API Documentation

This section documents the APIs used in the govAIrn platform, including both client-side and server-side endpoints.

## Authentication API

### Sign-In with Ethereum

```typescript
// Client-side API call to authenticate with wallet
async function signInWithEthereum(address, signMessageAsync) {
  // Create SIWE message
  // Request signature from wallet
  // Verify signature
  // Authenticate with Supabase
}
```

Authentication flow:
1. User connects wallet
2. Application generates a SIWE message
3. User signs the message with their wallet
4. Signature is verified
5. User is authenticated with Supabase

## User Management API

### Get Current User

```typescript
// Get the current authenticated user
const { data, error } = await supabase.auth.getUser()
```

### Update User Profile

```typescript
// Update user profile
const { data, error } = await supabase
  .from('profiles')
  .update({ display_name: 'New Name' })
  .eq('id', userId)
```

## Persona API

### Get User Personas

```typescript
// Get all personas for a user
const { data, error } = await supabase
  .from('personas')
  .select('*')
  .eq('wallet_address', walletAddress)
```

### Create Persona

```typescript
// Create a new persona
const { data, error } = await supabase
  .from('personas')
  .insert({
    wallet_address: walletAddress,
    name: 'Default Persona',
    risk: 50,
    esg: 50,
    treasury: 50,
    horizon: 50,
    frequency: 50,
    is_active: true
  })
```

### Update Persona

```typescript
// Update an existing persona
const { data, error } = await supabase
  .from('personas')
  .update({
    risk: 75,
    esg: 80
  })
  .eq('id', personaId)
```

## Data API

### DAOs

```typescript
// Get all DAOs
const { data, error } = await supabase
  .from('daos')
  .select('*')
```

### Proposals

```typescript
// Get proposals for a specific DAO
const { data, error } = await supabase
  .from('proposals')
  .select('*')
  .eq('dao_id', daoId)
```

## Real-time Subscriptions

```typescript
// Subscribe to proposal changes
const subscription = supabase
  .from('proposals')
  .on('INSERT', (payload) => {
    // Handle new proposal
  })
  .on('UPDATE', (payload) => {
    // Handle proposal update
  })
  .subscribe()
```

## Error Handling

All API calls should include proper error handling:

```typescript
const { data, error } = await supabase.from('table').select('*')

if (error) {
  console.error('API Error:', error)
  // Handle error appropriately
  return
}

// Process data
console.log('Success:', data)
```

## Response Formats

Standard response format for all API calls:

```json
{
  "success": true,
  "data": {
    // Requested data
  },
  "error": null
}
```

Or in case of error:

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "ERROR_CODE",
    "message": "Error message"
  }
}
```

## Rate Limiting

API rate limits:
- Authentication: 10 requests per minute
- User Profile: 60 requests per minute
- Data Operations: 120 requests per minute

## Environment-Specific Endpoints

The application automatically determines which endpoints to use based on the environment (development vs production).
