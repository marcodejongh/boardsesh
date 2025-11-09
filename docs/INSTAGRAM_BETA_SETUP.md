# Instagram Beta Video Integration Setup

This document explains how to set up automatic beta video discovery from Instagram using the @boardsesh account.

## Overview

The system works in two ways:

1. **User Submissions**: Users can manually submit Instagram URLs through the app
2. **Automatic Discovery**: The system polls Instagram for mentions of @boardsesh and automatically adds videos for moderation

## Features Implemented

✅ Beta video database schema (already existed)
✅ POST API endpoint for submitting beta videos
✅ "Submit Beta" button on climb pages
✅ Share to Instagram modal with pre-filled captions
✅ Instagram polling service to discover new mentions
✅ Admin moderation interface at `/admin/beta`
✅ Automatic moderation queue (all videos start as `isListed: false`)

## Instagram Business Account Setup

### Step 1: Create Instagram Business Account

1. Create an Instagram account: **@boardsesh**
2. Convert it to a Business Account:
   - Go to Settings → Account → Switch to Professional Account
   - Choose "Business"
   - Complete the setup

### Step 2: Create Facebook Page

Instagram Business accounts must be linked to a Facebook Page:

1. Go to [Facebook Pages](https://www.facebook.com/pages/create)
2. Create a new Page named "BoardSesh"
3. Link your Instagram Business account to this Page:
   - Page Settings → Instagram → Connect Account

### Step 3: Create Facebook App

1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Create a new App:
   - Use case: "Other"
   - Type: "Business"
   - Name: "BoardSesh Beta Integration"

3. Add Instagram Basic Display or Instagram Graph API:
   - In App Dashboard → Add Product → Instagram Basic Display
   - Or use Instagram Graph API (more features)

### Step 4: Get Access Tokens

#### Option A: Instagram Graph API (Recommended)

1. In App Dashboard → Instagram Graph API → Tools
2. Generate User Access Token:
   - Select permissions:
     - `instagram_basic`
     - `instagram_manage_comments`
     - `pages_read_engagement`
   - Click "Generate Token"

3. Exchange for Long-Lived Token:
   ```bash
   curl -X GET "https://graph.facebook.com/v22.0/oauth/access_token?grant_type=fb_exchange_token&client_id={app-id}&client_secret={app-secret}&fb_exchange_token={short-lived-token}"
   ```

4. The long-lived token is valid for 60 days. Set up token refresh:
   ```bash
   curl -X GET "https://graph.facebook.com/v22.0/{user-id}/accounts?access_token={long-lived-token}"
   ```

#### Option B: Instagram Basic Display API

1. In App Dashboard → Instagram Basic Display → Basic Display
2. Add Instagram Test User
3. Authenticate and get Access Token
4. Exchange for Long-Lived Token (same as above)

### Step 5: Get Instagram Business Account ID

```bash
curl -X GET "https://graph.facebook.com/v22.0/me/accounts?access_token={access-token}"
```

This returns your Page ID. Then get the Instagram Business Account ID:

```bash
curl -X GET "https://graph.facebook.com/v22.0/{page-id}?fields=instagram_business_account&access_token={access-token}"
```

## Environment Variables

Add these to your `.env.development.local` or production environment:

```bash
# Instagram API Credentials
INSTAGRAM_BUSINESS_ACCOUNT_ID=your_instagram_business_account_id
INSTAGRAM_ACCESS_TOKEN=your_long_lived_access_token

# Cron Job Security (optional but recommended)
CRON_SECRET=your_random_secret_string
```

## Setting Up Automatic Polling

### Option 1: Vercel Cron (Recommended)

Add to `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/instagram-poll",
      "schedule": "*/15 * * * *"
    }
  ]
}
```

This polls every 15 minutes. Adjust the schedule as needed:
- `*/15 * * * *` - Every 15 minutes
- `0 * * * *` - Every hour
- `0 */6 * * *` - Every 6 hours

### Option 2: External Cron Service

Use services like:
- [cron-job.org](https://cron-job.org)
- [EasyCron](https://www.easycron.com)
- [GitHub Actions](https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#schedule)

Configure them to call:
```
POST https://boardsesh.com/api/cron/instagram-poll
Headers: Authorization: Bearer YOUR_CRON_SECRET
```

## User Flow

### Manual Submission Flow

1. User climbs a problem and records it
2. User visits the climb page on BoardSesh
3. User clicks "Submit Beta"
4. Two options appear:
   - **Share to Instagram**: Copies pre-filled caption with @boardsesh mention
   - **Submit URL**: Paste Instagram link directly
5. Submission goes to moderation queue
6. Admin approves/rejects via `/admin/beta`
7. Approved videos appear on climb page

### Automatic Discovery Flow

1. User posts video to Instagram with @boardsesh mention
2. Caption includes climb URL from BoardSesh (e.g., "boardsesh.com/kilter/.../climb/uuid")
3. Cron job polls Instagram API every 15 minutes
4. System extracts climb information from caption
5. Creates beta link entry with `isListed: false`
6. Admin reviews at `/admin/beta`
7. Approved videos appear on climb page

## Caption Parsing

The system parses captions to extract climb information:

```
Just sent "Crimp City" (V6) at 40° on the Kilter Board! 🧗
boardsesh.com/kilter/.../climb/abc-123-def
@boardsesh
```

Extracted data:
- Board name: "Kilter" (from caption or URL)
- Climb UUID: "abc-123-def" (from URL)
- Angle: 40° (from caption)
- Grade: "V6" (from caption)
- Username: Instagram username

## Moderation Interface

Access the admin panel at: `/admin/beta`

Features:
- **Pending Tab**: Review new submissions
  - Preview video inline
  - Approve (sets `isListed: true`)
  - Reject (deletes entry)
- **Approved Tab**: Manage approved videos
  - Remove if needed
- Quick actions for each video

## API Endpoints

### GET /api/v1/[board_name]/beta/[climb_uuid]

Get beta videos for a climb:
```bash
curl https://boardsesh.com/api/v1/kilter/beta/abc-123-def
```

Query params:
- `include_pending=true` - Include unmoderated videos (for admin use)

### POST /api/v1/[board_name]/beta/[climb_uuid]

Submit a new beta video:
```bash
curl -X POST https://boardsesh.com/api/v1/kilter/beta/abc-123-def \
  -H "Content-Type: application/json" \
  -d '{
    "link": "https://www.instagram.com/p/ABC123/",
    "foreign_username": "climber_username",
    "angle": 40
  }'
```

### GET /api/admin/beta

List all beta videos (admin):
```bash
curl https://boardsesh.com/api/admin/beta?status=pending
```

### PATCH /api/admin/beta

Moderate a beta video:
```bash
curl -X PATCH https://boardsesh.com/api/admin/beta \
  -H "Content-Type: application/json" \
  -d '{
    "board_name": "kilter",
    "climb_uuid": "abc-123-def",
    "link": "https://www.instagram.com/p/ABC123/",
    "action": "approve"
  }'
```

### GET /api/cron/instagram-poll

Trigger Instagram polling (cron job):
```bash
curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
  https://boardsesh.com/api/cron/instagram-poll
```

## Instagram API Limitations

### Mentions API

- ✅ Can see posts where @boardsesh is mentioned
- ✅ Works with personal accounts mentioning business accounts
- ❌ Only get media where business account is mentioned
- ❌ No webhook for mentions (must poll)
- ❌ Limited to 50 most recent mentions per request

### Hashtag API

- ❌ Only returns posts from Business/Creator accounts
- ❌ Not useful for discovering personal account posts
- ❌ 30 unique hashtags per 7 days limit

### Rate Limits

- 200 calls per hour per user (default)
- 4800 calls per hour with app review

## Best Practices

1. **Token Management**
   - Refresh long-lived tokens before expiration (60 days)
   - Store tokens securely in environment variables
   - Monitor token expiration

2. **Polling Frequency**
   - Start with 15-minute intervals
   - Adjust based on volume and API limits
   - Don't poll more than necessary

3. **Moderation**
   - Review pending videos regularly
   - Set up notifications for new submissions
   - Maintain quality standards

4. **User Communication**
   - Encourage users to include @boardsesh in posts
   - Provide clear instructions in submit modal
   - Show moderation status to users

## Troubleshooting

### "Instagram credentials not configured"

- Check environment variables are set correctly
- Verify token hasn't expired
- Confirm Business Account ID is correct

### "No videos found in polling"

- Verify @boardsesh account is set up as Business account
- Check users are actually mentioning @boardsesh
- Confirm access token has correct permissions

### "Failed to moderate video"

- Check database connection
- Verify climb_uuid exists in database
- Check link format is valid Instagram URL

## Future Enhancements

- [ ] Add NextAuth authentication for admin routes
- [ ] Implement webhook for real-time mentions (if Instagram adds support)
- [ ] Add email notifications for new submissions
- [ ] Implement ML/AI for automatic climb matching
- [ ] Add video thumbnail extraction
- [ ] Support for TikTok, YouTube shorts
- [ ] User dashboard to see their submitted videos
- [ ] Analytics on beta video engagement

## Security Notes

⚠️ **Important**: The current admin interface has NO authentication. Before deploying to production:

1. Add authentication to `/admin/beta` route
2. Implement role-based access control
3. Add CRON_SECRET verification for polling endpoint
4. Rate limit the submission endpoint
5. Add CAPTCHA or similar anti-spam measures

## Support

For issues or questions:
- GitHub Issues: https://github.com/your-org/boardsesh/issues
- Documentation: /docs folder
