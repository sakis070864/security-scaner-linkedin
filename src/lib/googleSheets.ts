import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';

const SPREADSHEET_ID = '19NVFuzAgrO8XlLWkaYzyOtU_eSpESEOPQxR9T-iN7Pk';

export async function saveLeadToSheet(data: {
  email: string;
  url: string;
  grade: string;
  score: number;
}) {
  try {
    const credentialsJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    if (!credentialsJson) {
      console.error('GOOGLE_SERVICE_ACCOUNT_JSON not set');
      return;
    }

    let credentials;
    try {
      credentials = JSON.parse(credentialsJson);
    } catch {
      console.error('Failed to parse GOOGLE_SERVICE_ACCOUNT_JSON');
      return;
    }

    const auth = new JWT({
      email: credentials.client_email,
      key: credentials.private_key,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const doc = new GoogleSpreadsheet(SPREADSHEET_ID, auth);
    await doc.loadInfo();

    const sheet = doc.sheetsByIndex[0];

    try {
      await sheet.loadHeaderRow();
    } catch {
      // No headers yet — create them with the Source column
      await sheet.setHeaderRow(['Date', 'Email', 'Website', 'Grade', 'Score', 'Source']);
    }

    await sheet.addRow({
      Date: new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }),
      Email: data.email,
      Website: data.url,
      Grade: data.grade,
      Score: `${data.score}%`,
      Source: 'DeepSearch',
    });

    console.log(`Lead saved to Google Sheet: ${data.email} — DeepSearch`);
  } catch (error) {
    console.error('Google Sheets Error:', error);
    // Silent failure — don't block the user
  }
}
