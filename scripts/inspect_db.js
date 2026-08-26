const { initializeApp } = require('firebase/app');
const { 
  initializeFirestore, 
  memoryLocalCache, 
  collection, 
  getDocs 
} = require('firebase/firestore');
const path = require('path');
const config = require(path.join(__dirname, '../firebase-applet-config.json'));

const app = initializeApp(config);
const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  ignoreUndefinedProperties: true,
  localCache: memoryLocalCache()
}, config.firestoreDatabaseId);

async function inspect() {
  console.log('--- COMMON DISCIPLINES ---');
  const commonSnap = await getDocs(collection(db, 'commonDisciplines'));
  commonSnap.docs.forEach(doc => {
    console.log(`[${doc.id}] ${doc.data().name}`);
  });

  console.log('\n--- COURSES ---');
  const coursesSnap = await getDocs(collection(db, 'courses'));
  coursesSnap.docs.forEach(doc => {
    const data = doc.data();
    console.log(`\nCourse [${doc.id}]: "${data.name}" (total specific: ${data.specificDisciplines?.length || 0})`);
    if (data.specificDisciplines) {
      data.specificDisciplines.forEach((sd, idx) => {
        console.log(`   ${idx+1}. ${sd.name}`);
      });
    }
  });
}

inspect().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
