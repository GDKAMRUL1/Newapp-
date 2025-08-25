# Bilingual Shawarma Shop (React + Firebase)

- Arabic/English UI with RTL support
- Product catalog with images, filters, search
- "Order Now" -> Orders saved to Firestore
- Demo admin panel to add products (uploads image to Storage)
- Built with Vite + Tailwind

## Quick Start
```bash
npm i
npm run dev
```
> Before running, open `src/App.jsx` and replace the `firebaseConfig` with your Firebase keys. Enable Firestore & Storage.

## Deploy
Push to GitHub, deploy with Vercel/Netlify. Lock down Firestore/Storage rules before production (see comments in `App.jsx`).

