const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../backend/.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

console.log('Testing Supabase Connection with ANON KEY...');
console.log('URL:', supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data, error, count } = await supabase
    .from('reports')
    .select('*', { count: 'exact', head: true });

  if (error) {
    console.error('Error fetching with ANON KEY:', error.message);
  } else {
    console.log('Success! Total reports found with ANON KEY:', count);
  }
  
  // Test if it's an RLS issue by checking a public table if any
  const { data: cats, error: catErr } = await supabase.from('issue_categories').select('id, name').limit(1);
  if (catErr) {
    console.error('Error fetching issue_categories:', catErr.message);
  } else {
    console.log('Categories found:', cats.length);
  }
}

test();
