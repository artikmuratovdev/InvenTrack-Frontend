import { GoogleGenAI } from '@google/genai';
import {
  ROLE_LABELS,
  STATUS_LABELS,
  USAGE_LABELS,
  type User,
} from '../src/types/inventory.ts';
import { store } from './store.ts';

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error(
      'GEMINI_API_KEY sozlanmagan. Iltimos, Settings > Secrets bo‘limida API kalitni kiriting.'
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export interface ChatTurnInput {
  role: 'user' | 'assistant';
  content: string;
}

export async function generateInventoryChatReply(
  user: User,
  message: string,
  history: ChatTurnInput[] = []
): Promise<string> {
  const ai = getGeminiClient();
  const visibleEquipment = store.visibleEquipmentForUser(user);
  const openRepairs = store.data.repairs.filter((r) =>
    user.role === 'RESPONSIBLE'
      ? r.status === 'OPEN' &&
        visibleEquipment.some((eq) => eq.id === r.equipmentId)
      : r.status === 'OPEN'
  );

  const compactInventory = visibleEquipment.slice(0, 40).map((e) => ({
    inventar: e.inventoryNumber,
    nomi: e.name,
    turi: e.typeName,
    xona: e.roomLabel,
    holat: STATUS_LABELS[e.status],
    foydalanish: USAGE_LABELS[e.usageStatus],
    masul: e.responsibleName,
    kafolat: e.warrantyUntil,
  }));

  const compactRepairs = openRepairs.map((r) => ({
    inventar: r.inventoryNumber,
    jihoz: r.equipmentName,
    ijrochi: r.vendorOrTechnician,
    muammo: r.issueDescription,
    yuborilgan: r.sentAt.slice(0, 10),
  }));

  const systemInstruction = `Sen InvenTrack korporativ jihozlar va ta'mir boshqaruv tizimining AI yordamchisisan.
Faqat O'zbek tilida, aniq, lo'nda va amaliy javob ber.
Foydalanuvchi: ${user.fullName} (Rol: ${ROLE_LABELS[user.role]}, Bo'lim: ${user.department}).
Quyidagi real vaqt ma'lumotlariga tayanib javob ber:
- Ko'rinadigan jihozlar soni: ${visibleEquipment.length}
- Faol jihozlar: ${visibleEquipment.filter((e) => e.status === 'ACTIVE').length}
- Ta'mirdagi jihozlar: ${visibleEquipment.filter((e) => e.status === 'IN_REPAIR').length}
- Zaxiradagi jihozlar: ${visibleEquipment.filter((e) => e.status === 'RESERVE').length}
- Hisobdan chiqarilgan: ${visibleEquipment.filter((e) => e.status === 'WRITTEN_OFF').length}

Jihozlar ro'yxati (JSON):
${JSON.stringify(compactInventory)}

Ochiq ta'mir yozuvlari (JSON):
${JSON.stringify(compactRepairs)}

Agar foydalanuvchi tizimda yo'q jihoz haqida so'rasa, mavjud emasligini ochiq ayt. Javobingni qisqa bandlar bilan tushunarli formatda yoz.`;

  const recentHistory = history
    .slice(-8)
    .map((h) => `${h.role === 'user' ? 'Foydalanuvchi' : 'Yordamchi'}: ${h.content}`)
    .join('\n');

  const promptContent = recentHistory
    ? `Oldingi suhbat:\n${recentHistory}\n\nYangi savol: ${message}`
    : message;

  const modelName = process.env.GEMINI_MODEL || 'gemini-4-hydrogen';
  const maxAttempts = 3;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: promptContent,
        config: {
          systemInstruction,
        },
      });

      const text = response.text?.trim();
      if (!text) {
        throw new Error('AI modeli bo‘sh javob qaytardi.');
      }
      return text;
    } catch (err) {
      lastError = err;
      const errStr = err instanceof Error ? err.message : String(err);
      const isTransient = errStr.includes('503') || errStr.includes('UNAVAILABLE');
      if (isTransient && attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
        continue;
      }
      if (isTransient) {
        throw new Error(
          'AI modeli hozir vaqtinchalik yuklama ostida (503). Iltimos, bir necha soniyadan keyin qayta urinib ko‘ring.'
        );
      }
      throw err;
    }
  }

  throw lastError instanceof Error ? lastError : new Error('AI xizmatida xatolik yuz berdi.');
}
