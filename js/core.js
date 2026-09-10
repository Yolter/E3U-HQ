import { db } from "./firebase.js";
import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  limit,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";

window.E3U_CORE = {

  async addActivity(type, text, role = "System") {
    await addDoc(collection(db, "activity"), {
      type,
      text,
      role,
      time: serverTimestamp()
    });
  },

  async getActivity(count = 5) {
    const q = query(
      collection(db, "activity"),
      orderBy("time", "desc"),
      limit(count)
    );

    const snap = await getDocs(q);

    return snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  }

};