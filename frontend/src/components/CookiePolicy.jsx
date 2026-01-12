import React from 'react';

export const CookiePolicy = () => (
    <div className="legal-content">
        <h2>Cookie Policy</h2>
        <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6', color: '#334155' }}>
{`Cookie Policy
Last Updated: December 31, 2025

1. What Are Cookies and Local Storage?
In modern web applications like Kin7, we use "Cookies" and "Local Storage" technologies.

Cookies are small text files stored on your browser.

Local Storage is a secure space in your browser where we save data to keep the application running smoothly without reloading.

2. How We Use These Technologies
We use these technologies to make our Single Page Application (SPA) work. Specifically:

Essential / Strictly Necessary (Firebase Auth): We use Google Firebase for authentication. Instead of a traditional cookie, Firebase saves a secure Identity Token in your browser's Local Storage. This is required to keep you logged in as you navigate between the Dashboard, Settings, and Video Interface. Without this, the site cannot identify you.

Functionality & Preferences: We store small pieces of data to remember your local settings, such as your Interface Theme (Dark/Light mode) or Volume Settings for the video player, so you do not have to reset them every time you visit.

Analytics & Performance: We use third-party tools (such as Google Analytics) to collect anonymous data on platform usage. This helps us understand how many users are active, detect system errors in real-time, and ensure our servers can handle the traffic.

3. Third-Party Integration
We partner with trusted third-party providers who may manage their own data on your device to provide specific services:

Payment Processing: Our merchant of record (Dodo Payments) may use storage methods to detect fraud and secure your transaction during checkout.

Voice & Video: Our streaming providers (LiveKit) may use local data to manage microphone and camera permissions efficiently.

4. Managing Your Preferences
Most modern browsers allow you to block Cookies and Site Data (Local Storage) through their settings.

Important Warning: Because Kin7 relies on Local Storage to maintain your secure session, if you disable these technologies, you will not be able to log in, and the voice/video features will not function. We recommend keeping them enabled for the intended platform experience.`}
        </div>
    </div>
);