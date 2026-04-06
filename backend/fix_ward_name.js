const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixWards() {
  console.log('Correcting Valahalli to Avalahalli...');
  
  // 1. Delete misspelled ward
  const { error: delErr } = await supabase
    .from('wards')
    .delete()
    .eq('name', 'Valahalli');

  if (delErr) {
    console.warn('Could not delete Valahalli (it might not exist):', delErr.message);
  } else {
    console.log('Successfully deleted the misspelled "Valahalli"');
  }

  // 2. Get Bengaluru's ID
  const { data: cities } = await supabase.from('cities').select('id').eq('name', 'Bengaluru').single();
  if (!cities) return;

  // 3. Insert Avalahalli
  const { data, error } = await supabase
    .from('wards')
    .insert([{ name: 'Avalahalli', ward_number: 201, city_id: cities.id }])
    .select();

  if (error) {
    console.error('Error inserting Avalahalli:', error.message);
  } else {
    console.log('Successfully added corrected ward: Avalahalli');
  }
}

fixWards();
