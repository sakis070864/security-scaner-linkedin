import { NextResponse } from 'next/server';
import { waitUntil } from '@vercel/functions';
import { performDeepScan } from '@/lib/scanner';
import { generateComplianceReport } from '@/lib/pdfGenerator';
import { sendReportEmail } from '@/lib/mailer';

// Define the shape of the expected payload from LinkedIn Lead Gen Forms
// Note: Actual LinkedIn webhook payloads can vary based on form configuration.
interface LinkedInWebhookPayload {
  form_data?: Array<{ name: string; value: string }>;
  email?: string;
  website?: string;
  [key: string]: any;
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    console.log('=== RAW BODY RECEIVED ===');
    console.log(rawBody);
    console.log('=== END RAW BODY ===');

    let payload: LinkedInWebhookPayload;
    try {
      payload = JSON.parse(rawBody);
    } catch (parseErr) {
      console.error('Failed to parse JSON body:', parseErr);
      return NextResponse.json({ error: 'Invalid JSON body', received: rawBody.substring(0, 200) }, { status: 400 });
    }

    console.log('Parsed LinkedIn Webhook:', JSON.stringify(payload, null, 2));

    // 1. Extract Email and Website URL - search through ALL fields
    let email = '';
    let website = '';

    // Direct field access
    if (payload.email) email = payload.email;
    if (payload.website) website = payload.website;

    // Search through all top-level fields for email/URL patterns
    for (const [key, value] of Object.entries(payload)) {
      if (typeof value !== 'string') continue;
      const k = key.toLowerCase();
      // Find email field
      if (!email && (k.includes('email') || k.includes('mail') || value.includes('@'))) {
        email = value;
      }
      // Find website/URL field
      if (!website && (k.includes('website') || k.includes('url') || k.includes('domain') || k.includes('site') || value.startsWith('http'))) {
        website = value;
      }
    }

    // If LinkedIn sends the data in a nested "form_data" array:
    if (payload.form_data && Array.isArray(payload.form_data)) {
      payload.form_data.forEach(field => {
        const fieldName = field.name.toLowerCase();
        if (fieldName.includes('email')) email = field.value;
        if (fieldName.includes('website') || fieldName.includes('url')) website = field.value;
      });
    }

    console.log(`Extracted => email: "${email}", website: "${website}"`);

    if (!email || !website) {
      console.warn('Missing fields. Full payload keys:', Object.keys(payload));
      return NextResponse.json({ 
        error: 'Missing email or website in payload',
        extracted: { email, website },
        receivedKeys: Object.keys(payload) 
      }, { status: 400 });
    }

    // Ensure URL format
    if (!website.startsWith('http://') && !website.startsWith('https://')) {
      website = `https://${website}`;
    }

    console.log(`Processing scan for Website: ${website} | Email: ${email}`);

    // 2. We must respond to LinkedIn quickly (2xx status) so they don't timeout/retry.
    // We handle the heavy lifting (scanning + pdf + email) in the background.
    
    // NOTE: If deploying to Vercel (serverless), background execution after NextResponse 
    // might be terminated. You may need to use `import { waitUntil } from '@vercel/functions'` 
    // or deploy this app to a VPS / long-running Node container for reliable async execution.
    
    const runBackgroundJob = async () => {
      try {
        console.log(`[Step 1/4] Starting scan for ${website}...`);
        const scanData = await performDeepScan(website);
        console.log(`[Step 2/4] Scan COMPLETE. Grade: ${scanData.grade}, Score: ${scanData.score}. Generating PDF...`);
        
        const pdfBuffer = await generateComplianceReport(scanData);
        console.log(`[Step 3/4] PDF GENERATED. Size: ${pdfBuffer.length} bytes. Sending email to ${email}...`);
        
        await sendReportEmail(email, pdfBuffer, website);
        console.log(`[Step 4/4] EMAIL SENT to ${email}. Pipeline complete!`);
      } catch (err: any) {
        console.error(`[PIPELINE FAILED] Step failed for ${email}:`, err.message);
        console.error(`[PIPELINE FAILED] Stack:`, err.stack);
          console.error(`[PIPELINE FAILED] Could not recover for ${email}`);
          // sendFailureEmail removed — handle manually
      }
    };

    // Use waitUntil to keep the serverless function alive during the background job
    waitUntil(runBackgroundJob());

    // 3. Acknowledge receipt to LinkedIn immediately
    return NextResponse.json({ success: true, message: 'Webhook received. Processing in background.' }, { status: 200 });

  } catch (error: any) {
    console.error('LinkedIn Webhook Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
