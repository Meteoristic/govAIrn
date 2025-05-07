import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ebchyxgtnyhvvwhzsmrx.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImViY2h5eGd0bnlodnZ3aHpzbXJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYzMTIxMjMsImV4cCI6MjA2MTg4ODEyM30.k9PZ2qdqmBkTPX7Bl8tT986KoJeVxVwzMeLepSDVe8Y';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
