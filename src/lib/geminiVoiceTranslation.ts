import { geminiFlashModel } from '@/lib/firebase';
import { fetchVoiceTranslation } from '@/lib/api';

export interface VoiceTranslationResult {
  transcript: string;
  sourceLanguage: string;
  translatedText: string;
  audioUrl?: string;
}

// Memory cache: messageId:targetLang -> VoiceTranslationResult
const translationCache = new Map<string, VoiceTranslationResult>();

/** Converts a Blob or File to a Base64 string */
export async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/** Language map for friendly prompt names */
const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  pt: 'Portuguese',
  sw: 'Swahili',
  ha: 'Hausa',
  yo: 'Yoruba',
  ig: 'Igbo',
  ar: 'Arabic',
  hi: 'Hindi',
  id: 'Indonesian',
  tw: 'Twi',
  'tw-asante': 'Asante Twi',
  ee: 'Ewe',
};

/**
 * Transcribes audio and translates it to target language using Firebase AI Logic (Gemini 1.5 Flash).
 */
export async function translateAudioWithGemini(
  audioBlob: Blob,
  targetLangCode: string,
  cacheKey?: string
): Promise<VoiceTranslationResult> {
  const targetLangName = LANGUAGE_NAMES[targetLangCode] || targetLangCode;

  if (cacheKey && translationCache.has(`${cacheKey}:${targetLangCode}`)) {
    return translationCache.get(`${cacheKey}:${targetLangCode}`)!;
  }

  const base64Data = await blobToBase64(audioBlob);
  const mimeType = audioBlob.type || 'audio/webm';

  const prompt = `You are the real-time voice translation engine for Chatimall.
Listen carefully to this audio voice note:
1. Identify the language spoken.
2. Transcribe the exact words spoken into "transcript".
3. Translate the message accurately and naturally into ${targetLangName} into "translatedText".

Return ONLY valid JSON in this exact structure without markdown backticks:
{"sourceLanguage": "code", "transcript": "original words", "translatedText": "translated words"}`;

  try {
    const response = await geminiFlashModel.generateContent([
      prompt,
      {
        type: 'inlineData',
        inlineData: {
          data: base64Data,
          mimeType,
        },
      },
    ]);


    const raw = response.response.text().trim();
    // Clean any accidental markdown code fences
    const cleanJson = raw.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/```$/g, '').trim();
    const parsed = JSON.parse(cleanJson);

    const result: VoiceTranslationResult = {
      sourceLanguage: parsed.sourceLanguage || 'unknown',
      transcript: parsed.transcript || '',
      translatedText: parsed.translatedText || '',
    };

    if (cacheKey) {
      translationCache.set(`${cacheKey}:${targetLangCode}`, result);
    }
    return result;
  } catch (err) {
    console.warn('Firebase AI voice translation fallback error:', err);
    throw err;
  }
}

/**
 * Plays the translated text out loud using the device's native speech synthesizer (works offline & in Android APK).
 */
export function speakTranslatedSpeech(text: string, langCode: string): Promise<void> {
  return new Promise((resolve) => {
    if (!('speechSynthesis' in window) || !text) {
      resolve();
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = langCode;
    utterance.rate = 0.95; // Natural conversational tempo

    // Attempt to match installed device voice
    const voices = window.speechSynthesis.getVoices();
    const matchingVoice = voices.find((v) => v.lang.startsWith(langCode));
    if (matchingVoice) utterance.voice = matchingVoice;

    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();

    window.speechSynthesis.speak(utterance);
  });
}

/**
 * Stop currently active voice playback
 */
export function stopSpeaking() {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}
