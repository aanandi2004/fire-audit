import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'

const firebaseConfig = {
  apiKey: "AIzaSyD-Y1iEywNJ9z1fZCftXUjpxrA1XXj8fsk",
  authDomain: "pdf-36bf4.firebaseapp.com",
  projectId: "pdf-36bf4",
  storageBucket: "pdf-36bf4.firebasestorage.app",
  messagingSenderId: "713247635470",
  appId: "1:713247635470:web:29fb1554d431454147645f",
  measurementId: "G-8S0FZ3TRG7"
}

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)

export function getSecondaryAuth() {
  const name = 'secondary-' + Math.random().toString(36).slice(2)
  const secondaryApp = initializeApp(firebaseConfig, name)
  return getAuth(secondaryApp)
}
