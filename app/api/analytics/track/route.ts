/**
 * 📊 ENDPOINT: TRACK ANALYTICS
 * 
 * POST /api/analytics/track
 * 
 * Recibe eventos de analytics del cliente y los guarda en Firestore
 * con permisos de admin (sin depender de la autenticación del cliente)
 */

import { NextRequest, NextResponse } from "next/server";
import admin from "firebase-admin";
import { db, initializationError } from "../../../lib/firebase-admin";

const ANALYTICS_COLLECTION = "analytics";

function getTodayDate(): string {
  const today = new Date();
  return today.toISOString().split("T")[0];
}

export async function POST(req: NextRequest) {
  console.log("[Analytics API] ===== NEW REQUEST =====");
  
  // Check if Firebase Admin was initialized properly
  if (initializationError) {
    console.error("[Analytics API] ❌ Firebase Admin initialization failed:", initializationError);
    return NextResponse.json(
      { error: "Firebase Admin initialization failed", details: initializationError.message },
      { status: 500 }
    );
  }
  
  try {
    console.log("[Analytics API] 1. Parsing request body...");
    const body = await req.json();
    console.log("[Analytics API] 2. Body received:", body);
    
    const { eventType, deviceId, clickType: bodyClickType } = body;
    console.log("[Analytics API] 3. Extracted values:", { eventType, deviceId, bodyClickType });

    if (!eventType || !deviceId) {
      console.error("[Analytics API] ❌ Missing required fields:", { eventType, deviceId });
      return NextResponse.json(
        { error: "Missing eventType or deviceId" },
        { status: 400 }
      );
    }

    const today = getTodayDate();
    console.log("[Analytics API] 4. Today date:", today);
    
    // Test Firestore connection before proceeding
    console.log("[Analytics API] 5. Testing Firestore connection...");
    try {
      const testRef = db.collection("_connection_test").doc("test");
      await testRef.get();
      console.log("[Analytics API] 6. ✅ Firestore connection verified");
    } catch (connectionError) {
      console.error("[Analytics API] ❌ Firestore connection failed:", connectionError);
      return NextResponse.json(
        { error: "Firestore connection failed", details: String(connectionError) },
        { status: 500 }
      );
    }
    
    console.log("[Analytics API] 7. Creating Firestore doc reference...");
    const docRef = db.collection(ANALYTICS_COLLECTION).doc(today);
    console.log("[Analytics API] 8. Doc ref created:", { collection: ANALYTICS_COLLECTION, doc: today });

    console.log(`[Analytics API] 9. Processing ${eventType} for device ${deviceId}`);

    if (eventType === "pageView") {
      console.log("[Analytics API] 10a. Branch: pageView");
      // Track page view
      const docSnap = await docRef.get();
      console.log("[Analytics API] 10b. Document exists:", docSnap.exists);

      if (docSnap.exists) {
        const data = docSnap.data() as any;
        console.log("[Analytics API] 10c. Existing doc data:", data);
        
        if (!data.visitorIds || !data.visitorIds.includes(deviceId)) {
          console.log("[Analytics API] 10d. New visitor, incrementing count...");
          const updatedVisitors = [...(data.visitorIds || []), deviceId];
          await docRef.update({
            visitorIds: updatedVisitors,
            uniqueVisitors: admin.firestore.FieldValue.increment(1),
            lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
          });
          console.log(`[Analytics API] ✅ Updated page view - new visitor`);
        } else {
          console.log(`[Analytics API] Page view - returning visitor, no update`);
        }
      } else {
        console.log("[Analytics API] 10e. Creating new analytics doc...");
        await docRef.set({
          date: today,
          uniqueVisitors: 1,
          visitorIds: [deviceId],
          totalClicks: 0,
          clicksByType: {
            productClick: 0,
            categoryClick: 0,
            buttonClick: 0,
            linkClick: 0,
            blogClick: 0,
          },
          lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log(`[Analytics API] ✅ Created new analytics doc for today`);
      }
    } else if (eventType === "click") {
      console.log("[Analytics API] 10a. Branch: click");
      // Track click
      const clickType = bodyClickType || "buttonClick";
      console.log(`[Analytics API] 10b. Click type: ${clickType}`);

      const docSnap = await docRef.get();
      console.log("[Analytics API] 10c. Document exists:", docSnap.exists);

      if (docSnap.exists) {
        console.log("[Analytics API] 10d. Updating existing doc with click...");
        const updateData: any = {
          totalClicks: admin.firestore.FieldValue.increment(1),
          lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
        };
        updateData[`clicksByType.${clickType}`] = admin.firestore.FieldValue.increment(1);
        console.log("[Analytics API] 10e. Update data:", updateData);

        await docRef.update(updateData);
        console.log(`[Analytics API] ✅ Updated existing doc with click`);
      } else {
        console.log("[Analytics API] 10d. Creating new doc for click...");
        const newClicksByType = {
          productClick: 0,
          categoryClick: 0,
          buttonClick: 0,
          linkClick: 0,
          blogClick: 0,
        };
        (newClicksByType as any)[clickType] = 1;

        await docRef.set({
          date: today,
          uniqueVisitors: 0,
          visitorIds: [],
          totalClicks: 1,
          clicksByType: newClicksByType,
          lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log(`[Analytics API] ✅ Created new doc for click (no visitors yet)`);
      }
    } else {
      console.warn(`[Analytics API] Unknown eventType: ${eventType}`);
      return NextResponse.json(
        { error: "Unknown eventType" },
        { status: 400 }
      );
    }

    console.log(`[Analytics API] ✅✅✅ SUCCESS: tracked ${eventType}`);
    console.log("[Analytics API] ===== REQUEST COMPLETE =====");
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.log("[Analytics API] ===== ERROR CAUGHT =====");
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : '';
    console.error("[Analytics API] ❌ Error message:", errorMessage);
    console.error("[Analytics API] ❌ Error stack:", errorStack);
    console.error("[Analytics API] ❌ Full error:", error);
    
    return NextResponse.json(
      { error: "Failed to track event", details: errorMessage },
      { status: 500 }
    );
  }
}
