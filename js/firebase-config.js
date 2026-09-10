import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js";
import { getDatabase, ref , push, onValue, set, get, update, remove } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { 
    getAuth, 
    signInWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged, 
    createUserWithEmailAndPassword, 
    sendPasswordResetEmail,
    RecaptchaVerifier,
    signInWithPhoneNumber,
    linkWithCredential,
    EmailAuthProvider,
    updateProfile
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

const firebaseConfig = {
    apiKey: "AIzaSyAcRdkDOLrTCGNfBWzXMid1bYzQ_x-zzrg",
    authDomain: "tomschicken-52fae.firebaseapp.com",
    databaseURL: "https://tomschicken-52fae-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "tomschicken-52fae",
    storageBucket: "tomschicken-52fae.firebasestorage.app",
    messagingSenderId: "1071509846515",
    appId: "1:1071509846515:web:431fb88f4b7b213eca7a86",
    measurementId: "G-CJ4SKQD5NV"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getDatabase(app);
const auth = getAuth(app);
const storage = getStorage(app);

export { 
    app, 
    db, 
    auth, 
    ref, 
    push, 
    onValue, 
    storage, 
    storageRef, 
    uploadBytes, 
    getDownloadURL, 
    set, 
    get, 
    update, 
    remove, 
    signInWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged, 
    createUserWithEmailAndPassword, 
    sendPasswordResetEmail,
    RecaptchaVerifier,
    signInWithPhoneNumber,
    linkWithCredential,
    EmailAuthProvider,
    updateProfile
};