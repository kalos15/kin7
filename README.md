# Kin7 - AI Persona Platform (Source Code)

## 📋 1. Executive Overview

### What the System Actually Does
Kin7 is a real-time AI video avatar platform that allows users to speak face-to-face with an AI persona.
* **Users talk** with their voice.
* **The AI hears them** (via Deepgram), **thinks** (via OpenAI), **speaks back** (via ElevenLabs), and **appears as a live video avatar** (via Beyond Presence).
* **Admins can:** Track users, track revenue, control pricing, broadcast messages, and moderate sessions.

### What You Are Buying
* ✔ **Full Source Code:** Frontend (React), Backend (Python Functions), AI Agent (Python/LiveKit).
* ✔ **Infrastructure Ownership:** You own the pre-built Firebase & Google Cloud Project.
* ✔ **Admin Dashboard:** Full control panel for business management.
* ✔ **Deployment Scripts:** Pre-configured commands for updates.
* ❌ *Note: No API credits, cloud balances, or 3rd-party accounts are included.*

---

## 🤝 2. Ownership Transfer Procedure (Start Here)
*Since the seller has transferred the Google Project to you, follow these steps immediately to secure it.*

1.  **Accept Ownership:** Check your email. The Seller has invited you as an **Owner** of the Firebase/Google Cloud project. Accept the invitation.
2.  **Remove Seller:** Go to [Google Cloud IAM](https://console.cloud.google.com/iam-admin/iam). Find the Seller's email address and **Remove** it. You now have sole control.
3.  **Key Rotation:** You must generate **new API keys** for your own accounts (OpenAI, Deepgram, ElevenLabs, Beyond Presence, LiveKit) to use in Phase 6.

---

## 🛠️ 3. Prerequisites
*You do not need the previous "heavy" files (node_modules). These steps will install everything fresh.*

Ensure you have the following installed:
1.  **Git:** [Download Git](https://git-scm.com/downloads)
2.  **Node.js** (v18+): [Download Node.js](https://nodejs.org/)
3.  **Python** (v3.10+): [Download Python](https://www.python.org/downloads/)
4.  **Firebase CLI:** Open your terminal and run: `npm install -g firebase-tools`
5.  **Google Cloud CLI:** [Install Link](https://cloud.google.com/sdk/docs/install)

---

## 📥 4. Phase 1: Download & Connect
*This step downloads the code to your computer and links it to the Cloud Project you now own.*

### A. Download the Code (Clone)
1.  Open your command prompt/terminal.
2.  Navigate to your Desktop (or where you want the project):
    ```bash
    cd Desktop
    ```
3.  **Download the files:** Run this command (replace the link with your repo):
    ```bash
    git clone [YOUR_GITHUB_REPO_LINK_HERE]
    ```
4.  **Enter the folder:**
    ```bash
    cd [REPO_NAME]
    ```
    *(Note: You are now inside the project folder. All commands below must be run here.)*

### B. Login & Link Project
1.  **Login:**
    ```bash
    firebase login
    gcloud auth login
    ```
2.  **Link Firebase:** Connect this folder to your cloud project:
    ```bash
    firebase use --add
    ```
    * *Select the project named `kin7-platform` (or similar) from the list.*
    * *Type `default` when asked for an alias.*
3.  **Link Google Cloud:** Set the correct project ID for the AI Agent deploy:
    ```bash
    gcloud config set project [YOUR_PROJECT_ID]
    ```
    *(You can find your Project ID in the Firebase Console URL or Settings).*

---

## 🔐 5. Phase 2: Security Rotation
*You must replace the seller's security keys with your own.*

### A. Generate NEW Admin Service Key
1.  Go to **Firebase Console > Project Settings > Service accounts**.
2.  Click **"Generate new private key"**.
3.  **Rename** the downloaded file to `serviceAccountKey.json`.
4.  **Move** this file to the **ROOT** directory of this project (Same folder as `setAdminClaim.js`).

### B. Verify Frontend Config
1.  Go to **Project Settings > General > Your Apps > Web (</>)**.
2.  Copy the `firebaseConfig` object code.
3.  Open the file `frontend/src/firebaseConfig.js` and paste/ensure the keys match your project.

---

## 🏗️ 6. Phase 3: Verify Infrastructure
*The database and network are already set up. Just verify they exist.*

### A. Verify Firestore Rules
1.  Go to **Firebase Console > Firestore Database > Rules**.
2.  Ensure rules are present. If empty, paste these standard security rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helpers
    function isOwner(userId) { return request.auth != null && request.auth.uid == userId; }
    function isAdmin() {
      return request.auth != null && (
        (request.auth.token.keys().hasAny(['admin']) && request.auth.token.admin == true) || 
        (exists(/databases/$(database)/documents/users/$(request.auth.uid)) && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true)
      );
    }
    // Users
    match /users/{userId} {
      allow read: if isOwner(userId) || isAdmin();
      allow write: if isAdmin();
      match /chat_history/{msgId} { allow read: if isOwner(userId) || isAdmin(); allow create: if isOwner(userId); allow write: if false; }
    }
    // Core Collections
    match /transactions/{transId} { allow read: if request.auth != null && (resource.data.uid == request.auth.uid || isAdmin()); allow write: if isAdmin(); }
    match /sessions/{sessionId} { allow read: if request.auth != null && (resource.data.uid == request.auth.uid || isAdmin()); allow write: if isAdmin(); }
    // Admin Collections
    match /user_feedback/{feedbackId} { allow create: if request.auth != null; allow read, update, delete: if isAdmin(); }
    match /admin_audit_logs/{logId} { allow read, write: if isAdmin(); }
    match /system_notifications/{notifId} { allow read: if request.auth != null; allow write: if isAdmin(); }
    match /system_alerts/{alertId} { allow read, write: if isAdmin(); }
    match /system_settings/{docId} { allow read: if true; allow write: if isAdmin(); }
    match /system_instances/{instanceId} { allow read: if isAdmin(); allow write: if false; }
    match /mail/{mailId} { allow read, write: if false; }
    match /{document=**} { allow read, write: if false; }
  }
}
B. Verify Indexes
Go to Firestore > Indexes. Ensure these exist (Required for Dashboard):

transactions: uid (Asc) timestamp (Desc)

sessions: uid (Asc) startTime (Desc)

transactions: status (Asc) timestamp (Desc)

C. Verify VPC Network
Run: gcloud compute networks list

If you see virtualbot-vpc, continue.

Only if missing, run:

Bash

gcloud compute networks create virtualbot-vpc --subnet-mode=custom
gcloud compute networks subnets create virtualbot-subnet-v2 --network=virtualbot-vpc --region=us-central1 --range=10.0.0.0/28
💻 7. Phase 4: Installation (Restore Dependencies)
The source code is lightweight. You must now run these commands to download the libraries from the internet.

A. Root Directory (CRITICAL)
Installs tools for the Admin Script.

Bash

# Run this in the main project folder
npm install
B. Frontend (React)
Bash

cd frontend
npm install
npm run dev
# App will run at http://localhost:5173
C. Cloud Functions (Backend API)
Bash

cd functions
python -m venv venv
# Windows: venv\Scripts\activate
# Mac/Linux: source venv/bin/activate
pip install -r requirements.txt
D. AI Agent (Virtual Backend)
Bash

cd virtual-backend
python -m venv venv
# Windows: venv\Scripts\activate
# Mac/Linux: source venv/bin/activate
pip install -r requirements.txt
👑 8. Phase 5: Claim Admin Account
Now that dependencies are installed, grant yourself "Super Admin" status.

Visit http://localhost:5173 (from Phase 4B) and Sign Up.

Go to Firebase Console > Authentication and copy your User UID.

Open setAdminClaim.js in the root folder.

Replace the placeholder:

JavaScript

const ADMIN_UID = "PASTE_YOUR_UID_HERE";
Run the script:

Bash

node setAdminClaim.js
Result: ✅ Admin claim set successfully!

🚀 9. Phase 6: Production Redeployment (CRITICAL)
You must redeploy the AI Agent to replace the Seller's API keys with your own.

Backend & Frontend:

Bash

firebase deploy
AI Agent (Update Keys): Run this from the ROOT directory. Replace [PLACEHOLDERS] with YOUR new keys.


gcloud run deploy virtualbot-agent ^
  --source . ^
  --region us-central1 ^
  --allow-unauthenticated ^
  --port 8081 ^
  --min-instances 0 ^
  --max-instances 10 ^
  --concurrency 20 ^
  --cpu 2 ^
  --memory 2Gi ^
  --no-cpu-throttling ^
  --timeout 3600 ^
  --network virtualbot-vpc ^
  --subnet virtualbot-subnet-v2 ^
  --vpc-egress all-traffic ^
  --set-env-vars "LIVEKIT_URL=wss://xxxxxxxxxxxxxx.cloud" ^
  --set-env-vars "LIVEKIT_API_KEY=xxxxxxxxxxxxx" ^
  --set-env-vars "LIVEKIT_API_SECRET=xxxxxxxxxxxxxxxxxxxx" ^
  --set-env-vars "DEEPGRAM_API_KEY=xxxxxxxxxxxxxxxx" ^
  --set-env-vars "ELEVEN_API_KEY=sk_xxxxxxxxxxxx" ^
  --set-env-vars "BEY_AVATAR_ID=xxxxxxxxxxxxxxx" ^
  --set-env-vars "BEY_AVATAR_ID_MALE=1c7a7291-ee28-4800-8f34-acfbfc2d07c0" ^
  --set-env-vars "BEYOND_API_KEY=sk-CI1b5cVJO9bt4lDVxEJLQM6MAAzCb3thsaBiMxIgxzo" ^
  --set-env-vars "chgpt=sk-proj-xbkFJBjj1Sxxxxxxx"
  
  
  10. API Cost & Enterprise Scaling
Usage-Based Cost Reality
The platform uses usage-based APIs. Costs scale with:

Minutes spoken (ElevenLabs)

Minutes transcribed (Deepgram)

Tokens generated (OpenAI)

Avatar streaming (Beyond Presence)

Rough estimates (per 1 user, 30 minutes): $0.30–$0.80 depending on the provider plans you select. The Admin Dashboard tracks revenue vs usage so you can tune your pricing per minute.

Understanding the Deployment Command Flags
In the deployment command (Phase 6), we used specific settings to control costs and performance:

--min-instances 0 (The "Zero Cost" Mode):

What it does: This tells Google to shut down all servers if no users are active.

Benefit: You pay $0 when the platform is empty.

Trade-off: The very first user after a period of inactivity may experience a 10–20 second delay (Cold Start) while the machine wakes up.

Option: Change this to 1 if you want instant responses 24/7, but you will pay for that machine even if no one is using it.

--concurrency 20:

What it does: This allows up to 20 users to share a single server instance simultaneously.

Benefit: This dramatically lowers your infrastructure bill by packing multiple users onto one machine rather than paying for a new machine for every single user.

Enterprise Scaling Strategy (2 Million+ Users)
The system is Serverless and auto-scales, but for enterprise loads:

Google Cloud: Request a "Quota Increase" for Cloud Run CPUs.

API Providers: Contact ElevenLabs and Beyond Presence for an Enterprise Tier to increase concurrency limits.

Command Config: Change --max-instances in the deploy command to 1000+ once your quotas are approved.

🛡️ 11. System Safety & Analytics
What Happens if an API Breaks?
The system is built with fail-safes. If a provider fails:

Deepgram: User cannot speak (Audio error logged).

ElevenLabs: AI replies in text-only mode (Cost saved).

Beyond Presence: Avatar freezes but chat continues.

Result: No data loss occurs. Sessions auto-terminate safely.

Google Analytics Setup (Mandatory for Dashboard)
Go to Google Cloud Console > IAM. Copy the service account email (e.g., [project-id]@appspot.gserviceaccount.com).

Go to Google Analytics > Admin > Property Access.

Add User: Paste the email and give it "Viewer" access.

Get Property ID: Copy the Property ID (numeric) from GA4 Admin and ensure it is linked in your backend config if required.

🎨 Persona Customization
To change the personality of the AI, open virtual-backend/agent.py.

Find Line 92: BASE_PROMPT = """...

Edit the text inside the quotes to change how the persona behaves (e.g., "Act like a hyper-realistic doctor...").