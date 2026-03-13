import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env' })

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)

async function check() {
  const { data, error } = await supabase.from('five_s_inspections').select('id, inspection_date, photo_urls').order('inspection_date', { ascending: false }).limit(5)
  if (error) {
    console.error("DB Error:", error)
  } else {
    console.log("Recent 5S Inspections:", JSON.stringify(data, null, 2))
  }
}
check()
