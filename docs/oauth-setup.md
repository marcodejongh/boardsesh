# OAuth and Email Verification Setup

This document covers setting up OAuth providers (Google, Apple, Facebook) and email verification for the Boardsesh application.

## Environment Variables

Add the following to `packages/web/.env.development.local` (for local development) or your production environment:

```bash
# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Apple Sign-In
APPLE_ID=your_apple_service_id
APPLE_SECRET=your_apple_jwt_secret

# Facebook OAuth
FACEBOOK_CLIENT_ID=your_facebook_app_id
FACEBOOK_CLIENT_SECRET=your_facebook_app_secret

# Email (Fastmail SMTP)
SMTP_HOST=smtp.fastmail.com
SMTP_PORT=465
SMTP_USER=your_fastmail_email@fastmail.com
SMTP_PASSWORD=your_fastmail_app_password
EMAIL_FROM=your_fastmail_email@fastmail.com
```

---

## Provider Setup Instructions

### 1. Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth client ID**
5. Select **Web application** as the application type
6. Add authorized JavaScript origins:
   - `http://localhost:3000` (development)
   - `https://your-domain.com` (production)
7. Add authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google`
   - `https://your-domain.com/api/auth/callback/google`
8. Copy the **Client ID** and **Client Secret** to your environment variables

### 2. Apple Sign-In

Apple Sign-In is more complex and requires a paid Apple Developer account.

1. Go to [Apple Developer Portal](https://developer.apple.com/)
2. Navigate to **Certificates, Identifiers & Profiles**

**Create a Services ID:**
1. Go to **Identifiers** → Click **+**
2. Select **Services IDs** → Continue
3. Enter a description and identifier (e.g., `com.boardsesh.signin`)
4. Enable **Sign In with Apple**
5. Configure:
   - Primary App ID: Select your app
   - Domains: `your-domain.com` (and `localhost` for dev via ngrok)
   - Return URLs: `https://your-domain.com/api/auth/callback/apple`

**Create a Key:**
1. Go to **Keys** → Click **+**
2. Enter a name for the key
3. Enable **Sign In with Apple**
4. Configure the key and associate it with your Primary App ID
5. Download the `.p8` key file and save it securely

**Generate the Apple Secret (JWT):**

Apple requires a JWT secret that must be regenerated every 6 months. Use the following Node.js script:

```javascript
const jwt = require('jsonwebtoken');
const fs = require('fs');

const privateKey = fs.readFileSync('path/to/AuthKey_XXXXXXXX.p8');

const token = jwt.sign({}, privateKey, {
  algorithm: 'ES256',
  expiresIn: '180d', // 6 months
  audience: 'https://appleid.apple.com',
  issuer: 'YOUR_TEAM_ID', // Found in Apple Developer account
  subject: 'YOUR_SERVICE_ID', // The Services ID you created
  keyid: 'YOUR_KEY_ID', // The Key ID from the key you created
});

console.log(token);
```

**Important Notes:**
- Apple Sign-In **requires HTTPS** - it won't work on `http://localhost`
- For local development, use [ngrok](https://ngrok.com/) to create an HTTPS tunnel:
  ```bash
  ngrok http 3000
  ```
- Add the ngrok URL to your Apple Services ID configuration

### 3. Facebook OAuth

1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Click **My Apps** → **Create App**
3. Select **Consumer** as the app type
4. Fill in the app details and create the app
5. In the app dashboard, click **Add Product** → Find **Facebook Login** → **Set Up**
6. Go to **Settings** → **Basic** to find your **App ID** and **App Secret**
7. Go to **Facebook Login** → **Settings**
8. Add Valid OAuth Redirect URIs:
   - `http://localhost:3000/api/auth/callback/facebook`
   - `https://your-domain.com/api/auth/callback/facebook`
9. Make sure your app is in **Live** mode for production use

---

## Email Verification (Fastmail SMTP)

### Fastmail Setup

1. Log in to [Fastmail](https://www.fastmail.com/)
2. Go to **Settings** → **Password & Security** → **Third-party apps**
3. Click **New app password**
4. Give it a name (e.g., "Boardsesh Email")
5. Copy the generated password to your `SMTP_PASSWORD` environment variable
6. Use your full Fastmail email address for `SMTP_USER` and `EMAIL_FROM`

### SMTP Settings

| Setting | Value |
|---------|-------|
| Host | `smtp.fastmail.com` |
| Port | `465` (SSL) or `587` (STARTTLS) |
| Security | SSL/TLS |
| Username | Your full email address |
| Password | App-specific password |

---

## Testing the Setup

### 1. Test Email Verification

1. Start the development server: `npm run dev`
2. Go to `http://localhost:3000/auth/login`
3. Create a new account with email/password
4. Check your inbox for the verification email
5. Click the verification link
6. You should be redirected to the login page with a success message

### 2. Test OAuth Providers

**Google:**
1. Click "Continue with Google"
2. Complete the Google sign-in flow
3. You should be redirected back and logged in

**Apple:**
1. Ensure you're using HTTPS (via ngrok for local dev)
2. Click "Continue with Apple"
3. Complete the Apple sign-in flow

**Facebook:**
1. Click "Continue with Facebook"
2. Complete the Facebook sign-in flow
3. You should be redirected back and logged in

---

## Troubleshooting

### "redirect_uri_mismatch" Error
- Ensure the redirect URI in your OAuth provider console exactly matches the callback URL
- Check for trailing slashes and protocol (http vs https)

### Apple Sign-In Not Working
- Apple requires HTTPS - use ngrok for local development
- Ensure your Apple secret JWT is not expired (6-month lifetime)
- Verify the return URL is added to your Services ID configuration

### Email Not Sending
- Check SMTP credentials are correct
- Verify the app password is active in Fastmail
- Check the server logs for SMTP errors

### "OAuthAccountNotLinked" Error
- User tried to sign in with OAuth but email already exists with password auth
- They need to sign in with their original method (email/password)

---

## Security Considerations

1. **Never commit secrets** - Use `.env.development.local` (gitignored) for sensitive values
2. **Rotate Apple secret** - The JWT expires every 6 months; set a reminder
3. **Use strong NEXTAUTH_SECRET** - Generate with `openssl rand -base64 32`
4. **Enable rate limiting** - Consider adding rate limiting to auth endpoints in production
