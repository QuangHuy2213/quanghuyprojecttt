import { createClient } from '@supabase/supabase-js';

// Thêm link placeholder phòng hờ lúc Vercel đang Build mà chưa kịp đọc biến môi trường
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'public-anon-key-placeholder';

export const supabase = createClient(supabaseUrl, supabaseKey);