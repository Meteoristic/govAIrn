
// This is a placeholder file for Supabase client
// Replace with your own backend implementation

export const supabase = {
  from: () => ({
    select: () => ({
      limit: () => Promise.resolve({ data: null, error: null })
    })
  }),
  auth: {
    getSession: () => Promise.resolve({ data: { session: null }, error: null }),
    signOut: () => Promise.resolve({ error: null })
  }
};
