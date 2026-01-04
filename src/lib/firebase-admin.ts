import * as admin from 'firebase-admin'

const firebaseAdminConfig = {
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
}

// Initialize Firebase Admin only if credentials are present
let adminDb: admin.firestore.Firestore | null = null

if (!admin.apps.length) {
    if (firebaseAdminConfig.projectId && firebaseAdminConfig.clientEmail && firebaseAdminConfig.privateKey) {
        try {
            const app = admin.initializeApp({
                credential: admin.credential.cert({
                    projectId: firebaseAdminConfig.projectId,
                    clientEmail: firebaseAdminConfig.clientEmail,
                    privateKey: firebaseAdminConfig.privateKey,
                }),
            })
            adminDb = app.firestore()
        } catch (error) {
            console.error('Failed to initialize Firebase Admin:', error)
        }
    } else {
        console.warn('Firebase Admin credentials missing. Server-side database updates will fail.')
    }
} else {
    adminDb = admin.firestore()
}

export { adminDb }

// Helper for users
export const adminUserDoc = (userId: string) => {
    if (!adminDb) {
        throw new Error('Firebase Admin DB not initialized. Check your environment variables.')
    }
    return adminDb.collection('users').doc(userId)
}
