import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Validate that environment variables are loaded
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase credentials missing!', {
    url: supabaseUrl ? 'SET' : 'MISSING',
    key: supabaseAnonKey ? 'SET' : 'MISSING'
  })
}

console.log('Supabase initialized with URL:', supabaseUrl)

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
