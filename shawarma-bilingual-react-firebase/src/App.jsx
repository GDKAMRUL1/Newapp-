// Bilingual Shawarma Shop – React + Firebase Single-File App
// ---------------------------------------------------------
// What you get in this single file:
// - Responsive storefront with Arabic/English catalogs
// - Language toggle (EN/AR) with proper RTL handling
// - Product grid with images, price, category filter, search
// - "Order Now" flow -> writes orders to Firebase Firestore
// - Simple Admin Mode (passwordless demo toggle) to add products
//   with image upload to Firebase Storage (name_en, name_ar, price, category)
// - Realtime product updates via Firestore onSnapshot
// - Clean Tailwind UI
//
// How to use:
// 1) Ensure your project has React, Tailwind, and Firebase v9+.
// 2) Replace the firebaseConfig placeholders below with your Firebase app keys.
//    - Enable Firestore and Storage in Firebase console.
//    - (Optional) Add security rules before going live; see notes near bottom.
// 3) Drop this file as src/App.jsx (or any component) and run your dev server.
// 4) The Admin toggle is for demo. Implement proper auth before production.
// ---------------------------------------------------------

import React, { useEffect, useMemo, useState } from "react";
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";


// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDlOba77-S3Rjk85RIfPuOcVZVrkpz5GjQ",
  authDomain: "shawarma-shop-33123.firebaseapp.com",
  projectId: "shawarma-shop-33123",
  storageBucket: "shawarma-shop-33123.firebasestorage.app",
  messagingSenderId: "279183141201",
  appId: "1:279183141201:web:3e61a8a78181f987390b70",
  measurementId: "G-VG6ZEC5G3N"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

// ------------- i18n -------------
const STRINGS = {
  en: {
    title: "Shawarma Resto",
    subtitle: "Fresh • Fast • Tasty",
    search: "Search",
    category: "Category",
    all: "All",
    orderNow: "Order Now",
    added: "Added!",
    qty: "Qty",
    name: "Your Name",
    phone: "Phone",
    note: "Note (optional)",
    placeOrder: "Place Order",
    cancel: "Cancel",
    admin: "Admin Mode",
    addProduct: "Add Product",
    productEn: "Product name (English)",
    productAr: "اسم المنتج (عربي)",
    price: "Price (SAR)",
    image: "Image",
    create: "Create",
    menu: "Menu",
    empty: "No products yet.",
    successOrder: "Order submitted! We'll contact you soon.",
  },
  ar: {
    title: "مطعم شاورما",
    subtitle: "طازج • سريع • لذيذ",
    search: "ابحث",
    category: "القسم",
    all: "الكل",
    orderNow: "اطلب الآن",
    added: "تم الإضافة!",
    qty: "الكمية",
    name: "اسمك",
    phone: "رقم الهاتف",
    note: "ملاحظة (اختياري)",
    placeOrder: "إرسال الطلب",
    cancel: "إلغاء",
    admin: "وضع الإدارة",
    addProduct: "إضافة منتج",
    productEn: "اسم المنتج (إنجليزي)",
    productAr: "اسم المنتج (عربي)",
    price: "السعر (ريال)",
    image: "صورة",
    create: "إنشاء",
    menu: "القائمة",
    empty: "لا توجد منتجات.",
    successOrder: "تم إرسال الطلب! سنتواصل معك قريبًا.",
  },
};

const CATEGORIES = [
  { key: "shawarma", en: "Shawarma", ar: "شاورما" },
  { key: "burger", en: "Burger", ar: "برغر" },
  { key: "fries", en: "Fries", ar: "بطاطس" },
  { key: "drinks", en: "Drinks", ar: "مشروبات" },
  { key: "seafood", en: "Seafood", ar: "سمك" },
];

// Utility to format price
const sar = (n) => `﷼${Number(n).toFixed(2)}`;

export default function App() {
  const [lang, setLang] = useState("ar"); // default Arabic
  const t = STRINGS[lang];
  const isRTL = lang === "ar";

  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [admin, setAdmin] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [activeProduct, setActiveProduct] = useState(null);

  // Load products realtime
  useEffect(() => {
    const q = query(collection(db, "products"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setProducts(rows);
    });
    return () => unsub();
  }, []);

  // Derived list
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return products.filter((p) => {
      const inCat = category === "all" || p.category === category;
      const nameMatch = `${p.name_en} ${p.name_ar}`.toLowerCase().includes(term);
      return inCat && nameMatch;
    });
  }, [products, search, category]);

  // ---------- Handlers ----------
  const openOrder = (p) => {
    setActiveProduct(p);
    setModalOpen(true);
  };

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name_en = fd.get("name_en");
    const name_ar = fd.get("name_ar");
    const price = parseFloat(fd.get("price"));
    const category = fd.get("category");
    const file = fd.get("image");

    let imageUrl = "";
    if (file && file.size > 0) {
      const path = `products/${Date.now()}_${file.name}`;
      const ref = storageRef(storage, path);
      await uploadBytes(ref, file);
      imageUrl = await getDownloadURL(ref);
    }

    await addDoc(collection(db, "products"), {
      name_en,
      name_ar,
      price,
      category,
      imageUrl,
      createdAt: serverTimestamp(),
    });

    e.currentTarget.reset();
    alert(t.added);
  };

  const handleOrder = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const order = {
      productId: activeProduct?.id || null,
      product_name_en: activeProduct?.name_en,
      product_name_ar: activeProduct?.name_ar,
      price: activeProduct?.price,
      qty: Number(fd.get("qty")) || 1,
      customer_name: fd.get("name"),
      phone: fd.get("phone"),
      note: fd.get("note"),
      status: "new",
      createdAt: serverTimestamp(),
    };

    await addDoc(collection(db, "orders"), order);
    setModalOpen(false);
    setActiveProduct(null);
    alert(t.successOrder);
  };

  const Card = ({ children }) => (
    <div className="rounded-2xl shadow-md border bg-white overflow-hidden">
      {children}
    </div>
  );

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur border-b">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          <span className="text-2xl">🌯</span>
          <div className="flex-1">
            <h1 className="text-xl sm:text-2xl font-bold">{t.title}</h1>
            <p className="text-sm text-gray-500">{t.subtitle}</p>
          </div>

          {/* Language toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLang("ar")}
              className={`px-3 py-1 rounded-full border ${lang === "ar" ? "bg-gray-900 text-white" : "bg-white"}`}
            >
              العربية
            </button>
            <button
              onClick={() => setLang("en")}
              className={`px-3 py-1 rounded-full border ${lang === "en" ? "bg-gray-900 text-white" : "bg-white"}`}
            >
              EN
            </button>

            {/* Demo Admin toggle */}
            <label className="ml-2 flex items-center gap-2 text-sm">
              <input type="checkbox" checked={admin} onChange={(e)=>setAdmin(e.target.checked)} />
              <span>{t.admin}</span>
            </label>
          </div>
        </div>
      </header>

      {/* Controls */}
      <section className="max-w-6xl mx-auto px-4 py-4 flex flex-col sm:flex-row gap-3 sm:items-center">
        <div className="flex-1">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t.search}
            className="w-full rounded-xl border px-4 py-2 bg-white"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setCategory("all")}
            className={`px-3 py-2 rounded-xl border ${category === "all" ? "bg-gray-900 text-white" : "bg-white"}`}
          >
            {t.all}
          </button>
          {CATEGORIES.map((c) => (
            <button
              key={c.key}
              onClick={() => setCategory(c.key)}
              className={`px-3 py-2 rounded-xl border ${category === c.key ? "bg-gray-900 text-white" : "bg-white"}`}
            >
              {lang === "ar" ? c.ar : c.en}
            </button>
          ))}
        </div>
      </section>

      {/* Admin: Add product */}
      {admin && (
        <section className="max-w-6xl mx-auto px-4 pb-2">
          <Card>
            <form onSubmit={handleCreateProduct} className="grid gap-3 p-4 sm:grid-cols-6">
              <h2 className="sm:col-span-6 text-lg font-semibold">{t.addProduct}</h2>

              <input name="name_en" required placeholder={t.productEn} className="sm:col-span-3 rounded-xl border px-3 py-2" />
              <input name="name_ar" required placeholder={t.productAr} className="sm:col-span-3 rounded-xl border px-3 py-2" />

              <select name="category" className="sm:col-span-2 rounded-xl border px-3 py-2">
                {CATEGORIES.map((c) => (
                  <option key={c.key} value={c.key}>
                    {lang === "ar" ? c.ar : c.en}
                  </option>
                ))}
              </select>
              <input name="price" type="number" step="0.01" required placeholder={t.price} className="sm:col-span-2 rounded-xl border px-3 py-2" />
              <input name="image" type="file" accept="image/*" className="sm:col-span-2 rounded-xl border px-3 py-2" />

              <div className="sm:col-span-6">
                <button className="px-4 py-2 rounded-xl bg-gray-900 text-white">
                  {t.create}
                </button>
              </div>
            </form>
          </Card>
        </section>
      )}

      {/* Product Grid */}
      <main className="max-w-6xl mx-auto px-4 pb-24">
        <h2 className="text-xl font-bold mb-3">{t.menu}</h2>
        {filtered.length === 0 ? (
          <p className="text-gray-500">{t.empty}</p>
        ) : (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((p) => (
              <Card key={p.id}>
                {p.imageUrl ? (
                  <img src={p.imageUrl} alt={lang === "ar" ? p.name_ar : p.name_en} className="h-44 w-full object-cover" />
                ) : (
                  <div className="h-44 w-full bg-gray-100 flex items-center justify-center text-5xl">🍟</div>
                )}
                <div className="p-4 flex flex-col gap-2">
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="font-semibold text-lg">
                      {lang === "ar" ? p.name_ar : p.name_en}
                    </h3>
                    <span className="font-bold">{sar(p.price)}</span>
                  </div>
                  <div className="text-xs text-gray-500">
                    {lang === "ar"
                      ? CATEGORIES.find((c) => c.key === p.category)?.ar
                      : CATEGORIES.find((c) => c.key === p.category)?.en}
                  </div>
                  <button
                    onClick={() => openOrder(p)}
                    className="mt-2 px-4 py-2 rounded-xl bg-gray-900 text-white hover:opacity-90"
                  >
                    {STRINGS[lang].orderNow}
                  </button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Order Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="p-4 border-b flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-500">
                  {lang === "ar" ? activeProduct?.name_ar : activeProduct?.name_en}
                </div>
                <div className="font-bold">{sar(activeProduct?.price)}</div>
              </div>
              <button onClick={() => setModalOpen(false)} className="text-xl">✖</button>
            </div>
            <form onSubmit={handleOrder} className="p-4 grid gap-3">
              <label className="grid gap-1">
                <span className="text-sm">{STRINGS[lang].qty}</span>
                <input name="qty" type="number" min={1} defaultValue={1} className="rounded-xl border px-3 py-2" />
              </label>
              <label className="grid gap-1">
                <span className="text-sm">{STRINGS[lang].name}</span>
                <input name="name" required className="rounded-xl border px-3 py-2" />
              </label>
              <label className="grid gap-1">
                <span className="text-sm">{STRINGS[lang].phone}</span>
                <input name="phone" required className="rounded-xl border px-3 py-2" />
              </label>
              <label className="grid gap-1">
                <span className="text-sm">{STRINGS[lang].note}</span>
                <textarea name="note" className="rounded-xl border px-3 py-2" />
              </label>
              <div className="flex gap-2">
                <button type="submit" className="flex-1 px-4 py-2 rounded-xl bg-gray-900 text-white">
                  {STRINGS[lang].placeOrder}
                </button>
                <button type="button" onClick={()=>setModalOpen(false)} className="flex-1 px-4 py-2 rounded-xl border">
                  {STRINGS[lang].cancel}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="text-center text-xs text-gray-400 py-6">
        <p>
          © {new Date().getFullYear()} Shawarma Resto • Built with React & Firebase
        </p>
        <p className="mt-1">
          Tip: connect GitHub repo → deploy with Vercel/Netlify. Secure rules before going live.
        </p>
      </footer>

      {/* --- Notes for Production Security ---
        Firestore rules (simplified; tighten before production):
        rules_version = '2';
        service cloud.firestore {
          match /databases/{database}/documents {
            match /products/{doc} { allow read: if true; allow write: if request.auth != null; }
            match /orders/{doc}   { allow create: if true; allow read, update: if request.auth != null; }
          }
        }
        Storage rules:
        rules_version = '2';
        service firebase.storage {
          match /b/{bucket}/o {
            match /products/{allPaths=**} {
              allow read: if true;
              allow write: if request.auth != null;
            }
          }
        }
      */}
    </div>
  );
}
