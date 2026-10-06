import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDRuOwEiM3cfWVOPiwG1H5bM5KCELbwyhA",
  authDomain: "ss-agarwal-smart-shop.firebaseapp.com",
  projectId: "ss-agarwal-smart-shop",
  storageBucket: "ss-agarwal-smart-shop.firebasestorage.app",
  messagingSenderId: "1083275410878",
  appId: "1:1083275410878:web:8101d9d5334978af170def",
  measurementId: "G-209P066QPY"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);