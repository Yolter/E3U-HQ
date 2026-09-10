import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCO9cnSeAVGdtK-T1k800iz-ZXq9RZCk1Y",
  authDomain: "e3u-hq.firebaseapp.com",
  projectId: "e3u-hq",
  storageBucket: "e3u-hq.firebasestorage.app",
  messagingSenderId: "1015527314689",
  appId: "1:1015527314689:web:5930632c5aa5b1d29c3700"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

window.E3U_DB = {
  db,
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc
};