import firebase from 'firebase/app';
import 'firebase/firestore';
import 'firebase/auth';
// Initialize Firebase
let fbObj = {
    apiKey: "AIzaSyAmzELW9wLnRhnHb07pcC_lwLIG-V-TPWs",
    authDomain: "resume-builder-8b5c5.firebaseapp.com",
    projectId: "resume-builder-8b5c5",
    storageBucket: "resume-builder-8b5c5.appspot.com",
    messagingSenderId: "387539545907",
    appId: "1:387539545907:web:77c16007e1e45b15fe9846"
}
firebase.initializeApp(fbObj);
export default firebase;
