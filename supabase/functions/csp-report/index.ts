import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const report = body['csp-report'] || body;

    // Log to audit_log table using service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    await supabase.rpc('log_csp_violation', {
      p_details: {
        blocked_uri: report['blocked-uri'] || report.blockedURL || 'unknown',
        violated_directive: report['violated-directive'] || report.effectiveDirective || 'unknown',
        document_uri: report['document-uri'] || report.documentURL || 'unknown',
        source_file: report['source-file'] || report.sourceFile || null,
        line_number: report['line-number'] || report.lineNumber || null,
      },
    });

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('CSP report processing error:', e);
    return new Response(JSON.stringify({ error: 'Failed to process report' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
