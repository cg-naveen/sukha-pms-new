/**
 * One-time script to get a Google OAuth refresh token for Drive.
 * Run from project root: node scripts/get-google-drive-refresh-token.js
 *
 * Prerequisites:
 * 1. Create OAuth 2.0 credentials in Google Cloud Console (Web application)
 * 2. Set redirect URI: http://localhost:3000/auth/google/callback
 * 3. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env.local
 */

const path = require('path');
const fs = require('fs');

// Load .env.local from project root (relative to this script) so credentials are set
const projectRoot = path.join(__dirname, '..');
const envLocal = path.join(projectRoot, '.env.local');
if (fs.existsSync(envLocal)) {
  require('dotenv').config({ path: envLocal });
} else {
  require('dotenv').config({ path: path.join(projectRoot, '.env') });
}

const readline = require('readline');
const https = require('https');

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'YOUR_CLIENT_ID';
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || 'YOUR_CLIENT_SECRET';

if (CLIENT_ID === 'YOUR_CLIENT_ID' || CLIENT_SECRET === 'YOUR_CLIENT_SECRET') {
  console.error('Error: GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET not found.');
  console.error('Checked:', envLocal);
  console.error('Add them to .env.local in the project root, then run: node scripts/get-google-drive-refresh-token.js');
  process.exit(1);
}
const REDIRECT_URI = 'http://localhost:3000/auth/google/callback';
const SCOPE = 'https://www.googleapis.com/auth/drive.file';

const authUrl =
  'https://accounts.google.com/o/oauth2/v2/auth?' +
  `client_id=${encodeURIComponent(CLIENT_ID)}` +
  `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
  '&response_type=code' +
  '&scope=' + encodeURIComponent(SCOPE) +
  '&access_type=offline' +
  '&prompt=consent';

console.log('Google Drive OAuth – get refresh token\n');
console.log('1. Open this URL in your browser (logged into the Google account you want to use for Drive):\n');
console.log(authUrl);
console.log('\n2. After authorizing, you will be redirected to a URL that looks like:');
console.log('   http://localhost:3000/auth/google/callback?code=XXXXX&scope=...');
console.log('\n3. Copy the "code" value (everything after code= until &scope) and paste it below.\n');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

rl.question('Paste the authorization code here: ', (code) => {
  rl.close();
  const trimmed = (code || '').trim();
  if (!trimmed) {
    console.error('No code provided.');
    process.exit(1);
  }

  const postData = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    code: trimmed,
    grant_type: 'authorization_code',
    redirect_uri: REDIRECT_URI,
  }).toString();

  const req = https.request(
    {
      hostname: 'oauth2.googleapis.com',
      path: '/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData),
      },
    },
    (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const tokens = JSON.parse(data);
          if (tokens.refresh_token) {
            console.log('\n✅ Success! Add this to your .env.local:\n');
            console.log('GOOGLE_REFRESH_TOKEN="' + tokens.refresh_token + '"');
            console.log('\nRestart your Next.js dev server so it picks up the new token.');
          } else if (tokens.error === 'invalid_client') {
            console.log('\nResponse:', data);
            console.log('\n❌ invalid_client = Google rejected your CLIENT SECRET.');
            console.log('\nDo this:');
            console.log('  1. Go to https://console.cloud.google.com/apis/credentials');
            console.log('  2. Open your OAuth 2.0 Client ID (type must be "Web application")');
            console.log('  3. Under "Client secret": if you don\'t have the value (Google only shows it once), click "ADD SECRET" or create a new one and COPY IT IMMEDIATELY');
            console.log('  4. Put it in .env.local as: GOOGLE_CLIENT_SECRET="the_new_secret"');
            console.log('  5. Run this script again and paste a FRESH code (get a new code by opening the auth URL again)');
            process.exit(1);
          } else {
            console.log('\nResponse:', data);
            console.log('\nNo refresh_token in response. Make sure you used prompt=consent and access_type=offline.');
          }
        } catch (e) {
          console.error('Failed to parse response:', data);
          process.exit(1);
        }
      });
    }
  );
  req.on('error', (e) => {
    console.error('Request error:', e.message);
    process.exit(1);
  });
  req.write(postData);
  req.end();
});
