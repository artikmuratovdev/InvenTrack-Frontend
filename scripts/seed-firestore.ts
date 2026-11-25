import 'dotenv/config';
import { firestoreService } from '../server/firestore.ts';
import { store } from '../server/store.ts';

async function main() {
  console.log('========================================================');
  console.log('   InvenTrack -> Firebase Firestore Seeder & Test Tool  ');
  console.log('========================================================\n');

  const status = firestoreService.getStatus();
  console.log('Ulanish holati:');
  console.log(`- Ulandimi: ${status.connected ? 'HA ✅' : 'YO‘Q ❌'}`);
  console.log(`- Rejim: ${status.mode}`);
  console.log(`- Project ID: ${status.projectId || 'Aniqlanmadi'}`);
  console.log(`- Manba: ${status.source || 'Sozlanmagan'}`);
  console.log(`- Xabar: ${status.message}\n`);

  if (!firestoreService.isConnected) {
    console.error('❌ Xatolik: Firestore-ga ulanib bo‘lmadi.');
    console.error('Iltimos, .env faylingizda quyidagi parametrlardan birini to‘g‘ri sozlang:\n');
    console.error('1-usul (Tavsiya etiladi - Alohida kalitlar):');
    console.error('  FIREBASE_PROJECT_ID="your-project-id"');
    console.error('  FIREBASE_CLIENT_EMAIL="firebase-adminsdk-xxx@your-project-id.iam.gserviceaccount.com"');
    console.error('  FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n"\n');
    console.error('2-usul (Service Account JSON fayli):');
    console.error('  FIREBASE_SERVICE_ACCOUNT_PATH="./serviceAccountKey.json"\n');
    process.exit(1);
  }

  console.log('⏳ Mahalliy ombordagi ma’lumotlar Firestore-ga yuklanmoqda...');
  try {
    const result = await firestoreService.seedData(store.data);
    console.log('\n🎉 MUVAFFAQIShIYATLI YUKLANDI!');
    console.log(`- Foydalanuvchilar: ${result.counts.users} ta`);
    console.log(`- Jihoz turlari:    ${result.counts.types} ta`);
    console.log(`- Xonalar:          ${result.counts.rooms} ta`);
    console.log(`- Jihozlar:         ${result.counts.equipment} ta`);
    console.log(`- Tarix yozuvlari:  ${result.counts.history} ta`);
    console.log(`- Ta’mirlar:        ${result.counts.repairs} ta`);
    console.log('\nEndi ilovani ishga tushirishingiz mumkin: npm run dev\n');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Firestore-ga yozishda xatolik yuz berdi:', err);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Kutilmagan xatolik:', err);
  process.exit(1);
});
