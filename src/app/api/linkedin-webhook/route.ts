import { NextResponse } from 'next/server';
import { performScan } from '@/lib/scanner';
import { generateComplianceReport } from '@/lib/pdfGenerator';
import { sendReportEmail, sendFailureEmail } from '@/lib/mailer';

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
    const payload: LinkedInWebhookPayload = await request.json();
    console.log('Received LinkedIn Webhook:', JSON.stringify(payload, null, 2));

    // 1. Extract Email and Website URL from the payload
    let email = payload.email || '';
    let website = payload.website || '';

    // If LinkedIn sends the data in a nested "form_data" array:
    if (payload.form_data && Array.isArray(payload.form_data)) {
      payload.form_data.forEach(field => {
        const fieldName = field.name.toLowerCase();
        if (fieldName.includes('email')) email = field.value;
        if (fieldName.includes('website') || fieldName.includes('url')) website = field.value;
      });
    }

    if (!email || !website) {
      console.warn('Webhook payload missing required email or website fields.');
      return NextResponse.json({ error: 'Missing email or website in payload' }, { status: 400 });
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
        console.log(`[Job Started] Scanning ${website}...`);
        const scanData = await performScan(website);
        
        console.log(`[Job Progress] Scan complete. Generating PDF...`);
        const pdfBuffer = await generateComplianceReport(scanData);
        
        console.log(`[Job Progress] PDF generated. Sending email to ${email}...`);
        await sendReportEmail(email, pdfBuffer, website);
        
        console.log(`[Job Finished] Successfully processed lead for ${email}`);
      } catch (err: any) {
        console.error(`[Job Error] Failed to process lead for ${email}:`, err.message);
        // Notify the client that the scan failed
        try {
          await sendFailureEmail(email, website, err.message);
          console.log(`[Job Recovery] Failure notification sent to ${email}`);
        } catch (mailErr: any) {
          console.error(`[Job Critical] Could not send failure email to ${email}:`, mailErr.message);
        }
      }
    };

    // Start background job without awaiting it
    runBackgroundJob();

    // 3. Acknowledge receipt to LinkedIn immediately
    return NextResponse.json({ success: true, message: 'Webhook received. Processing in background.' }, { status: 200 });

  } catch (error: any) {
    console.error('LinkedIn Webhook Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
