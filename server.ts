import express from 'express';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import { google } from 'googleapis';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

// Use session for storing tokens
app.use(cookieParser());
app.use(session({
  secret: 'interest-calc-secret',
  resave: false,
  saveUninitialized: true,
  cookie: { 
    secure: true, 
    sameSite: 'none',
    httpOnly: true 
  }
}));

app.use(express.json());

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `${process.env.APP_URL}/auth/google/callback`
);

// Auth URL
app.get('/api/auth/google/url', (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/drive.file'],
    prompt: 'consent'
  });
  res.json({ url });
});

// Callback
app.get('/auth/google/callback', async (req, res) => {
  const { code } = req.query;
  try {
    const { tokens } = await oauth2Client.getToken(code as string);
    (req.session as any).tokens = tokens;
    
    res.send(`
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS' }, '*');
              window.close();
            } else {
              window.location.href = '/';
            }
          </script>
          <p>Authentication successful. This window should close automatically.</p>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('Error getting tokens:', error);
    res.status(500).send('Authentication failed');
  }
});

// Check auth status
app.get('/api/auth/status', (req, res) => {
  res.json({ isAuthenticated: !!(req.session as any).tokens });
});

// Logout
app.post('/api/auth/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

// Sync to Drive
app.post('/api/sync/upload', async (req, res) => {
  const tokens = (req.session as any).tokens;
  if (!tokens) return res.status(401).json({ error: 'Not authenticated' });

  oauth2Client.setCredentials(tokens);
  const drive = google.drive({ version: 'v3', auth: oauth2Client });

  try {
    const { data, deletedIds, isIncremental } = req.body;
    const fileName = 'interest_calculator_backup.json';

    // Search for existing file
    const listResponse = await drive.files.list({
      q: `name = '${fileName}' and trashed = false`,
      fields: 'files(id)',
    });

    const fileId = listResponse.data.files?.[0]?.id;
    let finalData = data;

    if (fileId && isIncremental) {
      // Incremental update: fetch, merge, and update
      const fileResponse = await drive.files.get({
        fileId,
        alt: 'media',
      });
      
      let existingData = [];
      if (Array.isArray(fileResponse.data)) {
        existingData = fileResponse.data;
      } else if (fileResponse.data && (fileResponse.data as any).data) {
        existingData = (fileResponse.data as any).data;
      }

      // Merge: update existing or add new
      const mergedMap = new Map();
      existingData.forEach((r: any) => mergedMap.set(r.id, r));
      data.forEach((r: any) => mergedMap.set(r.id, r));
      
      // Remove deleted
      if (Array.isArray(deletedIds)) {
        deletedIds.forEach((id: any) => mergedMap.delete(id));
      }
      
      finalData = Array.from(mergedMap.values());
    }

    if (fileId) {
      // Update existing
      await drive.files.update({
        fileId,
        media: {
          mimeType: 'application/json',
          body: JSON.stringify(finalData),
        },
      });
    } else {
      // Create new
      await drive.files.create({
        requestBody: {
          name: fileName,
          mimeType: 'application/json',
        },
        media: {
          mimeType: 'application/json',
          body: JSON.stringify(finalData),
        },
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Sync error:', error);
    res.status(500).json({ error: 'Sync failed' });
  }
});

// Sync from Drive
app.get('/api/sync/download', async (req, res) => {
  const tokens = (req.session as any).tokens;
  if (!tokens) return res.status(401).json({ error: 'Not authenticated' });

  oauth2Client.setCredentials(tokens);
  const drive = google.drive({ version: 'v3', auth: oauth2Client });

  try {
    const fileName = 'interest_calculator_backup.json';
    const listResponse = await drive.files.list({
      q: `name = '${fileName}' and trashed = false`,
      fields: 'files(id)',
    });

    const fileId = listResponse.data.files?.[0]?.id;
    if (!fileId) return res.status(404).json({ error: 'Backup not found' });

    const fileResponse = await drive.files.get({
      fileId,
      alt: 'media',
    });

    res.json({ data: fileResponse.data });
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ error: 'Download failed' });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
