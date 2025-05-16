const { createClient } = require('@supabase/supabase-js');

// Use your env‑vars exactly as set in Netlify
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

exports.handler = async (event) => {
  // 1) Extract Supabase token from header
  const authHeader = event.headers.authorization || '';
  const token = authHeader.replace('Bearer ', '');
  if (!token) {
    return { statusCode: 401, body: 'Missing auth token' };
  }

  // 2) Verify token and get user
  const { data: { user }, error: userError } = await supabase.auth.getUser(token);
  if (userError || !user) {
    return { statusCode: 401, body: 'Invalid auth token' };
  }

  // 3) Fetch that user's grades row
  const { data, error } = await supabase
    .from('grades')
    .select('data')
    .eq('user_id', user.id)
    .single();

  if (error && error.code !== 'PGRST116') {
    return { statusCode: 500, body: error.message };
  }

  // 4) Return the JSON (or empty default)
  return {
    statusCode: 200,
    body: JSON.stringify(data?.data || { years: [] })
  };
};
