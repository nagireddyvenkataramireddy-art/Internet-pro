
import React from 'react';

const Privacy: React.FC = () => {
  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto', background: '#fff', color: '#333', lineHeight: '1.6' }}>
      <h1>Privacy Policy</h1>
      <p>Last Updated: May 15, 2026</p>
      
      <p>Thank you for choosing Interest Calculator Pro. Your privacy is important to us. This Privacy Policy explains how we handle your data within the application.</p>
      
      <h2>1. Information We Collect</h2>
      <p>Interest Calculator Pro is designed to function with minimal personal data collection. We collect the following types of information:</p>
      <ul>
        <li><strong>Calculations and Financial Records:</strong> When you save a calculation to your "Book" or "Saved" list, this data is stored locally on your device and, if you are signed in, synced securely with Google Firebase.</li>
        <li><strong>Account Information:</strong> If you sign in with Google, we access your Google ID and Email address to provide cloud sync functionality. We do not use this information for marketing purposes.</li>
      </ul>

      <h2>2. How Your Data is Stored</h2>
      <p>Your data is stored in two ways:</p>
      <ul>
        <li><strong>Local Storage:</strong> Most data is stored locally in your browser's storage for offline access.</li>
        <li><strong>Cloud Database:</strong> If you use the sync feature, data is encrypted and stored in Google Firebase (Google Cloud Platform).</li>
      </ul>

      <h2>3. Third-Party Services</h2>
      <p>We use the following third-party services:</p>
      <ul>
        <li><strong>Google Firebase:</strong> For user authentication and cloud data synchronization.</li>
      </ul>

      <h2>4. Data Sharing</h2>
      <p>We do not sell, trade, or otherwise transfer your personal information to outside parties. Your data is strictly yours and remains within your account.</p>

      <h2>5. Permissions</h2>
      <p>The app does not require sensitive device permissions such as Camera, Microphone, or Location.</p>

      <h2>6. Changes to This Policy</h2>
      <p>We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page.</p>

      <h2>7. Contact Us</h2>
      <p>If you have any questions about this Privacy Policy, you can contact the developer via the app store listing.</p>
      
      <div style={{ marginTop: '40px', padding: '20px', background: '#f5f5f5', borderRadius: '8px', textAlign: 'center' }}>
        <p>© 2026 Interest Calculator Pro</p>
      </div>
    </div>
  );
};

export default Privacy;
