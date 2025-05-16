const { createClient } = require('@supabase/supabase-js');

// Use your env‑vars exactly as set in Netlify
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  // 1) Extract token
  const authHeader = event.headers.authorization || '';
  const token = authHeader.replace('Bearer ', '');
  if (!token) {
    return { statusCode: 401, body: 'Missing auth token' };
  }

  // 2) Verify and get user
  const { data: { user }, error: userError } = await supabase.auth.getUser(token);
  if (userError || !user) {
    return { statusCode: 401, body: 'Invalid auth token' };
  }

  // 3) Parse incoming grade data
  let gradesData;
  try {
    gradesData = JSON.parse(event.body);
  } catch (err) {
    return { statusCode: 400, body: 'Invalid JSON' };
  }

  // 4) Check for existing row
  const { data: existing, error: selectError } = await supabase
    .from('grades')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (selectError && selectError.code !== 'PGRST116') {
    return { statusCode: 500, body: selectError.message };
  }

  // 5) Insert or update
  let result;
  if (existing?.id) {
    result = await supabase
      .from('grades')
      .update({ data: gradesData })
      .eq('user_id', user.id);
  } else {
    result = await supabase
      .from('grades')
      .insert([{ user_id: user.id, data: gradesData }]);
  }

  if (result.error) {
    return { statusCode: 500, body: result.error.message };
  }

  return { statusCode: 200, body: JSON.stringify({ success: true }) };
};
