import admin from "firebase-admin";

let initializedApp = null;

const getPrivateKey = () => {
  const value = process.env.FIREBASE_PRIVATE_KEY || "";
  return value.replace(/\\n/g, "\n");
};

export const getFirebaseAdmin = () => {
  if (initializedApp) {
    return initializedApp;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = getPrivateKey();

  if (!projectId || !clientEmail || !privateKey) {
    return null;
  }

  initializedApp = admin.apps[0]
    ? admin.app()
    : admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey
        })
      });

  return initializedApp;
};

export const verifyFirebaseIdToken = async (idToken) => {
  const app = getFirebaseAdmin();

  if (!app) {
    throw new Error("Firebase admin is not configured on the server");
  }

  return app.auth().verifyIdToken(idToken);
};
