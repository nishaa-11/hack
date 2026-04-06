const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function addWards() {
  console.log('Adding new wards to Bengaluru...');
  
  // 1. Get Bengaluru's ID
  const { data: cities, error: cityErr } = await supabase
    .from('cities')
    .select('id')
    .eq('name', 'Bengaluru')
    .single();

  if (cityErr || !cities) {
    console.error('Could not find Bengaluru in cities table:', cityErr);
    return;
  }
  const cityId = cities.id;
  console.log('Found Bengaluru ID:', cityId);

  // 2. Add the new wards
  const newWards = [
    { name: 'Yelahanka', ward_number: 1, city_id: cityId },
    { name: 'Valahalli', ward_number: 201, city_id: cityId },
    { name: 'Kalyan Nagar', ward_number: 27, city_id: cityId },
    { name: 'KR Puram', ward_number: 15, city_id: cityId },
  ];

  const { data, error } = await supabase
    .from('wards')
    .insert(newWards)
    .select();

  if (error) {
    console.error('Error inserting wards:', error.message);
  } else {
    console.log('Successfully added wards:', data.map(w => w.name).join(', '));
  }
}

addWards();
