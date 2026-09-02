// Importar módulos de Firebase SDK 10 (versión moderna)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

// Reemplaza esto con los datos que te dio la consola en el Paso 1
const firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "book-8cd5c.firebaseapp.com",
  projectId: "book-8cd5c",
  storageBucket: "book-8cd5c.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app, "(default)");
const storage = getStorage(app);
const googleProvider = new GoogleAuthProvider();

/* ==========================================
   Manejadores de la Ventana (Modal)
=========================================== */
window.openAuthModal = () => document.getElementById('authModal').classList.remove('hidden');
window.closeAuthModal = () => document.getElementById('authModal').classList.add('hidden');

window.switchAuthTab = (tab) => {
  const isLogin = tab === 'login';
  document.getElementById('formLogin').classList.toggle('hidden', !isLogin);
  document.getElementById('formRegister').classList.toggle('hidden', isLogin);
  document.getElementById('tabLoginBtn').className = isLogin ? 'flex-1 py-2 font-bold border-b-2 border-black' : 'flex-1 py-2 text-neutral-400';
  document.getElementById('tabRegisterBtn').className = !isLogin ? 'flex-1 py-2 font-bold border-b-2 border-black' : 'flex-1 py-2 text-neutral-400';
};

/* ==========================================
   1. Inicio de Sesión con Google
=========================================== */
window.loginWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;

    // Verificar si el usuario ya existe en la base de datos
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      // Si es nuevo, guardamos sus datos básicos de Google
      await setDoc(userRef, {
        nombre: user.displayName ? user.displayName.split(' ')[0] : 'Usuario',
        apellido: user.displayName ? user.displayName.split(' ').slice(1).join(' ') : '',
        email: user.email,
        fotoPerfil: user.photoURL || '',
        gustos: 'movie',
        creadoEn: new Date()
      });
    }

    alert('¡Bienvenido ' + user.displayName + '!');
    closeAuthModal();
  } catch (error) {
    alert("Error al entrar con Google: " + error.message);
  }
};

/* ==========================================
   2. Registro con Correo + Datos Adicionales + Foto
=========================================== */
window.registerUser = async () => {
  const name = document.getElementById('regName').value;
  const lastName = document.getElementById('regLastName').value;
  const age = document.getElementById('regAge').value;
  const email = document.getElementById('regEmail').value;
  const password = document.getElementById('regPassword').value;
  const taste = document.getElementById('regTaste').value;
  const avatarFile = document.getElementById('regAvatar').files[0];

  if (!email || !password || !name) {
    alert("Por favor completa los campos principales.");
    return;
  }

  try {
    // 1. Crear usuario en Auth
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    let photoURL = "";

    // 2. Subir Foto de Perfil a Storage (si adjuntó alguna)
    if (avatarFile) {
      const storageRef = ref(storage, `avatars/${user.uid}_${avatarFile.name}`);
      await uploadBytes(storageRef, avatarFile);
      photoURL = await getDownloadURL(storageRef);
    }

    // 3. Crear el espacio del usuario en Firestore DB
    await setDoc(doc(db, "users", user.uid), {
      nombre: name,
      apellido: lastName,
      edad: Number(age),
      email: email,
      gustos: taste,
      fotoPerfil: photoURL,
      creadoEn: new Date()
    });

    alert("¡Cuenta creada exitosamente!");
    closeAuthModal();
  } catch (error) {
    alert("Error en el registro: " + error.message);
  }
};

/* ==========================================
   3. Inicio de Sesión con Correo y Contraseña
=========================================== */
window.loginWithEmail = async () => {
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;

  try {
    await signInWithEmailAndPassword(auth, email, password);
    alert("Sesión iniciada correctamente");
    closeAuthModal();
  } catch (error) {
    alert("Error al iniciar sesión: " + error.message);
  }
};

/* ==========================================
   4. Detectar Estado de Sesión y Abrir Espacio Personal
=========================================== */
onAuthStateChanged(auth, async (user) => {
  const signInBtn = document.querySelector('button:has(span:contains("SIGN IN"))') || document.querySelector('.signin-trigger');

  if (user) {
    // Cargar datos del usuario desde Firestore
    const userDoc = await getDoc(doc(db, "users", user.uid));
    const userData = userDoc.data();

    // Actualizar la interfaz para mostrar su perfil / espacio personal
    console.log("Usuario activo:", userData);
    
    // Cambiar el botón "SIGN IN" por su Foto o Nombre
    if (signInBtn) {
      signInBtn.innerHTML = `
        <div class="flex items-center gap-2">
          <img src="${userData?.fotoPerfil || user.photoURL || 'https://via.placeholder.com/30'}" class="w-6 h-6 rounded-full border border-black object-cover">
          <span class="font-mono text-xs uppercase">${userData?.nombre || 'MI ESPACIO'}</span>
        </div>
      `;
      signInBtn.onclick = () => window.location.href = "perfil.html"; // Redirigir a su espacio
    }
  } else {
    // Si no está autenticado, el botón abre el modal
    if (signInBtn) {
      signInBtn.onclick = () => openAuthModal();
    }
  }
});