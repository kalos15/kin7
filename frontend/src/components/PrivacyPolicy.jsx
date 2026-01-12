import React from 'react';

export const PrivacyPolicy = () => (
    <div className="legal-content">
        <h2>Privacy Policy</h2>
        <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6', color: '#334155' }}>
{`Last Updated: December 31, 2025

1. Introduction
Welcome to Kin7 ("we," "our," or "us"). We provide an AI-powered conversational platform designed to offer emotional support and cognitive-behavioral inspired guidance. We value your trust and are committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your information when you use our web application and services.

Important Note: Kin7 is not a healthcare provider. We are not a covered entity under the Health Insurance Portability and Accountability Act (HIPAA). Information you provide to us is not protected by HIPAA privacy rules, though we employ industry-standard security measures to protect your data.

2. Information We Collect
We collect information to provide, improve, and personalize our AI services.

A. Information You Provide

Account Information: When you sign up, we collect your name, email address, and authentication credentials (via Google or email/password).

Conversation Content:

Audio: Your voice input is processed in real-time to generate AI responses.

Text Transcripts: Text-based logs of conversations are stored to enable the "Memory" feature, allowing the AI to recall past context and provide a personalized experience.

User Settings: Preferences regarding interface theme, notification settings, and persona choices.

Feedback: Any ratings or text feedback you submit regarding the quality of the AI's responses.

B. Information Collected Automatically

Usage Data: We collect metadata about your interactions, such as session duration, token usage, timestamp of calls, and feature engagement.

Technical Data: We log your IP address, general location (city/country), device type, operating system, and browser version to ensure service stability and security.

Transaction Data: We track subscription status, plan type (Free/Pro), and payment history. Note: We do not store full credit card numbers. All financial transactions are processed by our third-party Merchant of Record.

3. How We Use Your Information
We use your data for the following purposes:

Service Delivery: To facilitate real-time voice and video conversations with AI personas.

AI Personalization: To allow the AI to "remember" context from previous sessions (if your plan includes Memory features) and adapt its tone to your preferences.

Billing: To manage subscriptions, process minute top-ups, and prevent fraud.

Platform Improvement: To analyze aggregate usage trends (e.g., traffic sources, retention rates) to improve system performance and user experience.

Communication: To send transactional emails (e.g., password resets, receipts) or service updates.

4. How We Share Your Information
We do not sell your personal data. We share data only with trusted third-party service providers necessary to operate the platform:

AI & Voice Processors: We transmit audio and text inputs to third-party AI providers (LLM, Text-to-Speech, and Speech-to-Text vendors) to generate responses. These providers are contractually obligated not to train their models on your specific personal data.

Cloud Infrastructure: Your data is hosted on secure cloud computing services (e.g., Firebase/Google Cloud) that provide database and serverless computing capabilities.

Payment Processors: Financial transactions are handled by a dedicated third-party payment gateway.

Analytics Providers: We use analytics tools to understand website traffic and performance.

5. Data Retention & Deletion
Retention: We retain account and conversation data as long as your account is active to provide the service.

User Control: You may request the export of your data or the deletion of your account and associated history at any time through the "Settings" menu in the application.

Deletion: Upon account deletion, your personal data is removed from our active databases, subject to reasonable backups and legal retention obligations.

6. Security
We use enterprise-grade encryption (SSL/TLS) for data in transit and encryption at rest for database storage. However, no internet transmission is 100% secure, and we cannot guarantee absolute security.

7. Children's Privacy
Kin7 is intended for users aged 18 and older. We do not knowingly collect data from individuals under 18.

8. Updates to Policy
We may update this policy periodically. Significant changes will be communicated via email or a dashboard notification.`}
        </div>
    </div>
);