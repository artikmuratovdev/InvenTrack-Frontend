# Vercel deploy

This repository now uses Next.js for both the web app and its `/api/*` endpoints.

1. Import the repository into Vercel and keep the project root at the repository root.
2. Set the framework preset to **Next.js**. The build command is `yarn build`; the output directory should remain the Next.js default.
3. Add these environment variables for Production (and Preview if needed):
   - `JWT_SECRET`: a long, random secret used to sign login tokens.
   - `FIREBASE_PROJECT_ID`: the Firebase project ID.
   - `FIREBASE_CLIENT_EMAIL`: the service account email.
   - `FIREBASE_PRIVATE_KEY`: the service account private key. If entering it as one line, keep `\n` sequences for line breaks.
   - `GEMINI_API_KEY`: optional; required only for the AI chat feature.
4. Redeploy after saving the variables.

Firestore is required for production because Vercel function files are temporary. The service account JSON file is excluded from Git; use Vercel environment variables instead. The frontend calls the same-origin `/api/*` endpoints, so `VITE_API_URL` is not needed.
