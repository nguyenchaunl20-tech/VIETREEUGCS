// Lớp dữ liệu chạy trên Firebase Firestore, thay cho Prisma + Postgres trước đây.
// Mình cố tình giữ lại các hàm findMany / findUnique / findFirst / create / update / delete
// với hình dạng giống Prisma để KHÔNG phải sửa bất kỳ file route.js nào ở app/api.
const { cert, initializeApp, getApps } = require("firebase-admin/app");
const { getFirestore, FieldValue, Timestamp } = require("firebase-admin/firestore");

function getServiceAccount() {
  // Cách 1 (khuyên dùng trên Vercel): dán nguyên file JSON service account vào 1 biến env duy nhất
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  }
  // Cách 2: tách thành 3 biến env riêng
  if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    return {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    };
  }
  throw new Error(
    "Thiếu cấu hình Firebase. Xem hướng dẫn lấy FIREBASE_SERVICE_ACCOUNT (hoặc 3 biến FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY) trong file .env.example"
  );
}

if (!getApps().length) {
  initializeApp({ credential: cert(getServiceAccount()) });
}

const db = getFirestore();

function serializeDoc(docSnap) {
  if (!docSnap || !docSnap.exists) return null;
  const data = docSnap.data();
  const out = { id: docSnap.id, ...data };
  Object.keys(out).forEach((k) => {
    if (out[k] instanceof Timestamp) out[k] = out[k].toDate();
  });
  return out;
}

function matchOne(value, cond) {
  if (cond && typeof cond === "object" && !(cond instanceof Date)) {
    if ("in" in cond) return cond.in.includes(value);
    if ("equals" in cond) {
      if (cond.mode === "insensitive") {
        return String(value || "").toLowerCase() === String(cond.equals || "").toLowerCase();
      }
      return value === cond.equals;
    }
    return true;
  }
  return value === cond;
}

function applyWhere(items, where) {
  if (!where || Object.keys(where).length === 0) return items;
  return items.filter((item) => Object.entries(where).every(([k, cond]) => matchOne(item[k], cond)));
}

function applyOrderBy(items, orderBy) {
  if (!orderBy) return items;
  const [key, dir] = Object.entries(orderBy)[0];
  return [...items].sort((a, b) => {
    const av = a[key] instanceof Date ? a[key].getTime() : a[key] ?? 0;
    const bv = b[key] instanceof Date ? b[key].getTime() : b[key] ?? 0;
    if (av < bv) return dir === "asc" ? -1 : 1;
    if (av > bv) return dir === "asc" ? 1 : -1;
    return 0;
  });
}

// relations: ví dụ { campaign: { collection: "campaigns", localField: "campaignId" } }
// dùng cho registration.findFirst({ include: { campaign: true } })
function makeModel(collectionName, { relations } = {}) {
  const col = db.collection(collectionName);

  async function findUnique({ where } = {}) {
    if (where && where.id !== undefined) {
      const docSnap = await col.doc(String(where.id)).get();
      return serializeDoc(docSnap);
    }
    const [key, rawVal] = Object.entries(where || {})[0] || [];
    if (!key) return null;
    const val = rawVal && typeof rawVal === "object" && "equals" in rawVal ? rawVal.equals : rawVal;
    const snap = await col.where(key, "==", val).limit(1).get();
    if (snap.empty) return null;
    return serializeDoc(snap.docs[0]);
  }

  async function resolveId(where) {
    if (where && where.id !== undefined) return String(where.id);
    const found = await findUnique({ where });
    return found ? found.id : null;
  }

  async function findMany({ where, orderBy } = {}) {
    const snap = await col.get();
    let items = snap.docs.map(serializeDoc);
    items = applyWhere(items, where);
    items = applyOrderBy(items, orderBy);
    return items;
  }

  async function findFirst({ where, include } = {}) {
    const snap = await col.get();
    let items = snap.docs.map(serializeDoc);
    items = applyWhere(items, where);
    const item = items[0] || null;
    if (item && include) {
      for (const relKey of Object.keys(include)) {
        const rel = relations && relations[relKey];
        if (rel) {
          const relSnap = await db.collection(rel.collection).doc(String(item[rel.localField])).get();
          item[relKey] = serializeDoc(relSnap);
        }
      }
    }
    return item;
  }

  async function create({ data }) {
    const id = data.id !== undefined ? String(data.id) : col.doc().id;
    const payload = { ...data };
    delete payload.id;
    if (payload.createdAt === undefined) payload.createdAt = FieldValue.serverTimestamp();
    await col.doc(id).set(payload);
    const docSnap = await col.doc(id).get();
    return serializeDoc(docSnap);
  }

  async function update({ where, data }) {
    const id = await resolveId(where);
    if (!id) throw new Error(`Không tìm thấy bản ghi trong ${collectionName} để cập nhật`);
    await col.doc(id).update(data);
    const docSnap = await col.doc(id).get();
    return serializeDoc(docSnap);
  }

  async function del({ where }) {
    const id = await resolveId(where);
    if (id) await col.doc(id).delete();
    return { id };
  }

  return { findMany, findUnique, findFirst, create, update, delete: del };
}

const prisma = {
  settings: makeModel("settings"),
  brand: makeModel("brands"),
  campaign: makeModel("campaigns"),
  staff: makeModel("staff"),
  refLink: makeModel("refLinks"),
  registration: makeModel("registrations", {
    relations: { campaign: { collection: "campaigns", localField: "campaignId" } },
  }),
};

module.exports = { prisma, db };
