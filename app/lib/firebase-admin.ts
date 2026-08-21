
import admin from "firebase-admin";

console.log("[Firebase Admin] 1. Module imported");
console.log("[Firebase Admin] 2. Checking env vars...");
console.log("[Firebase Admin] FIREBASE_PROJECT_ID exists:", !!process.env.FIREBASE_PROJECT_ID);
console.log("[Firebase Admin] FIREBASE_CLIENT_EMAIL exists:", !!process.env.FIREBASE_CLIENT_EMAIL);
console.log("[Firebase Admin] FIREBASE_PRIVATE_KEY exists:", !!process.env.FIREBASE_PRIVATE_KEY);

let db: admin.firestore.Firestore;
let adminAuth: admin.auth.Auth;
let initializationError: Error | null = null;

if (!admin.apps.length) {
  try {
    console.log("[Firebase Admin] 3. Apps not initialized, starting init...");
    
    if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
      console.log("[Firebase Admin] 4. Using env vars to init...");
      
      // Clean up private key - remove any leading/trailing whitespace, ensure proper line breaks
      let privateKey = process.env.FIREBASE_PRIVATE_KEY;
      
      // Fix common issues: remove literal \n characters and replace with real ones, trim whitespace
      privateKey = privateKey.trim().replace(/\\n/g, "\n").replace(/\r/g, "");
      
      console.log("[Firebase Admin] 5. Private key length after cleanup:", privateKey.length);
      console.log("[Firebase Admin] 5. Private key starts with: " + privateKey.substring(0, 40));
      
      // Clean up key (remove any whitespace or trailing newlines, make sure it's properly formatted
      privateKey = privateKey.trim();
      if (!privateKey.startsWith("-----BEGIN PRIVATE KEY-----")) {
        // If it doesn't have the header, check if it's in the raw key and add it
        privateKey = "-----BEGIN PRIVATE KEY-----\n" + privateKey.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----/g, "").trim() + "\n-----END PRIVATE KEY-----";
      }
      
      // If it still doesn't end with the footer, add it
      if (!privateKey.endsWith("-----END PRIVATE KEY-----")) {
        privateKey = privateKey + "\n-----END PRIVATE KEY-----";
      }
      
      try {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: privateKey,
          }),
        });
        console.log("[Firebase Admin] 6. ✅ Initialized with env vars");
      } catch (certError) {
        console.error("[Firebase Admin] ❌ Certificate initialization failed:", certError);
        throw certError;
      }
    } else {
      console.log("[Firebase Admin] 4. Using default credentials...");
      try {
        admin.initializeApp();
        console.log("[Firebase Admin] 6. ✅ Initialized with default credentials");
      } catch (defaultError) {
        console.error("[Firebase Admin] ❌ Default initialization failed:", defaultError);
        throw defaultError;
      }
    }
    
    console.log("[Firebase Admin] 7. Getting Firestore instance...");
    db = admin.firestore();
    db.settings({ ignoreUndefinedProperties: true });
    
    // NOTE: Removed connection test to prevent initialization failures
    // The connection will be tested when actually needed
    
    adminAuth = admin.auth();
    console.log("[Firebase Admin] 8. ✅ All instances ready!");
  } catch (err) {
    console.error("[Firebase Admin] ❌ Initialization error:", err);
    initializationError = err as Error;
    // Don't throw - allow app to continue even if Firebase Admin fails
    console.warn("[Firebase Admin] ⚠️ App will continue but Firebase Admin features may not work");
  }
} else {
  console.log("[Firebase Admin] 3. Already initialized, skipping...");
  console.log("[Firebase Admin] 7. Getting existing Firestore instance...");
  db = admin.firestore();
  adminAuth = admin.auth();
}

export { db, adminAuth, initializationError };
export default admin;
