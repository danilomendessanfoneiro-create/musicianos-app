import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ygpukjsuhfgpjhftsfuy.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlncHVranN1aGZncGpoZnRzZnV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxMDIyNDksImV4cCI6MjA5MTY3ODI0OX0.wvy-f2bQ-kVLMl3oHqyR4tyLTTbDwCvXN55lWYVgFI0' // Aquela gigante que começa com eyJ...

export const supabase = createClient(supabaseUrl, supabaseKey)