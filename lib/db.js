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
 
// Tách "where" thành phần lọc được ngay ở Firestore (equals đơn giản, không phân biệt hoa/thường)
// và phần còn lại vẫn phải lọc ở code (vd "in", "insensitive").
function splitWhere(where) {
  if (!where) return { firestoreWhere: [], remainingWhere: null };
  const firestoreWhere = [];
  const remaining = {};
  for (const [key, cond] of Object.entries(where)) {
    if (cond && typeof cond === "object" && !(cond instanceof Date)) {
      if ("equals" in cond && cond.mode !== "insensitive") {
        firestoreWhere.push([key, "==", cond.equals]);
      } else if ("in" in cond && Array.isArray(cond.in) && cond.in.length > 0 && cond.in.length <= 30) {
        // Firestore "in" hỗ trợ tối đa 30 giá trị mỗi truy vấn
        firestoreWhere.push([key, "in", cond.in]);
      } else {
        remaining[key] = cond;
      }
    } else {
      firestoreWhere.push([key, "==", cond]);
    }
  }
  return { firestoreWhere, remainingWhere: Object.keys(remaining).length ? remaining : null };
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
    const { firestoreWhere, remainingWhere } = splitWhere(where);
    let query = col;
    for (const [key, op, val] of firestoreWhere) query = query.where(key, op, val);
    const snap = await query.get();
    let items = snap.docs.map(serializeDoc);
    items = applyWhere(items, remainingWhere);
    items = applyOrderBy(items, orderBy);
    return items;
  }
 
  async function findFirst({ where, include } = {}) {
    const { firestoreWhere, remainingWhere } = splitWhere(where);
    let query = col;
    for (const [key, op, val] of firestoreWhere) query = query.where(key, op, val);
    // Nếu đã lọc hết được ở Firestore rồi thì chỉ cần lấy 1 kết quả, đỡ tải dư
    const snap = remainingWhere ? await query.get() : await query.limit(1).get();
    let items = snap.docs.map(serializeDoc);
    items = applyWhere(items, remainingWhere);
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
