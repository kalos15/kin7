// setAdminClaim.js
const admin = require("firebase-admin");

// Load service account key
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// Replace with your admin UID
const ADMIN_UID = "rfDcQEItSBPMxv7xK7mVDjO6WV72";

async function setAdminClaim() {
  try {
    await admin.auth().setCustomUserClaims(ADMIN_UID, { admin: true });
    console.log("✅ Admin claim set successfully!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error setting admin claim:", err);
    process.exit(1);
  }
}

setAdminClaim();
