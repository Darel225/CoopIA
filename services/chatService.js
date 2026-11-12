//**Ce fichier est le messager entre l’écran de chat et le serveur. */
import { BASE_URL } from '../constants/api';
import { Platform } from 'react-native';

/**
 * Décode une chaîne base64 en un objet Blob binaire standard avec son type MIME.
 * Permet un téléversement 100% fiable sans dépendre du filesystem natif ou de fetch(file://).
 */
function base64ToBlob(base64Data, contentType = 'image/jpeg') {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  const str = String(base64Data).replace(/[\r\n\t ]/g, '');
  const len = str.length;
  let p = 0;
  const u8 = new Uint8Array(((len * 3) / 4) - (str.indexOf('=') > 0 ? (len - str.indexOf('=')) : 0));
  for (let i = 0; i < len; i += 4) {
    const a = chars.indexOf(str[i]);
    const b = chars.indexOf(str[i + 1]);
    const c = chars.indexOf(str[i + 2]);
    const d = chars.indexOf(str[i + 3]);
    u8[p++] = (a << 2) | (b >> 4);
    if (c !== 64 && c !== -1) u8[p++] = ((b & 15) << 4) | (c >> 2);
    if (d !== 64 && d !== -1) u8[p++] = ((c & 3) << 6) | d;
  }
  return new Blob([u8], { type: contentType });
}

export const chatService = {
  async getSessions(token) {
    const response = await fetch(`${BASE_URL}/chat/sessions`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const errorMsg = await _extractErrorMessage(response);
      throw new Error(errorMsg);
    }
    return await response.json();
  },

  async getSessionMessages(sessionId, token) {
    const response = await fetch(`${BASE_URL}/chat/sessions/${encodeURIComponent(sessionId)}/messages`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const errorMsg = await _extractErrorMessage(response);
      throw new Error(errorMsg);
    }
    return await response.json();
  },

  async sendMessage(text, sessionId, token, retryCount = 1) {
    try {
      const response = await fetch(`${BASE_URL}/chat/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          text: text,
          session_id: sessionId || null
        })
      });

      if (!response.ok) {
        if (response.status >= 500 && retryCount > 0) {
          await new Promise(r => setTimeout(r, 1200));
          return await this.sendMessage(text, sessionId, token, retryCount - 1);
        }
        const errorMsg = await _extractErrorMessage(response);
        throw new Error(errorMsg);
      }
      return await response.json();
    } catch (err) {
      if (retryCount > 0 && !(err.message && err.message.includes('401'))) {
        await new Promise(r => setTimeout(r, 1200));
        return await this.sendMessage(text, sessionId, token, retryCount - 1);
      }
      throw err;
    }
  },

  async sendDiagnosisImage(imageUri, mimeType, fileName, sessionId, token, base64Data) {
    let safeName = fileName ? String(fileName) : (String(imageUri).split('/').pop() || 'diagnostic.jpg');
    safeName = safeName.replace(/\.(heic|heif)$/i, '.jpg');
    if (!/\.(jpg|jpeg|png|webp)$/i.test(safeName)) {
      safeName += '.jpg';
    }

    let safeType = mimeType;
    if (!safeType || safeType === 'application/octet-stream' || safeType.includes('heic') || safeType.includes('heif')) {
      const lowerName = safeName.toLowerCase();
      if (lowerName.endsWith('.png')) {
        safeType = 'image/png';
      } else if (lowerName.endsWith('.webp')) {
        safeType = 'image/webp';
      } else {
        safeType = 'image/jpeg';
      }
    }

    const formData = new FormData();

    // 1. Priorité absolue : conversion directe base64 -> Blob (100% fiable, octets garantis, aucun 0-byte)
    let fileAttached = false;
    if (base64Data) {
      try {
        const blob = base64ToBlob(base64Data, safeType);
        if (blob && blob.size > 0) {
          formData.append('file', blob, safeName);
          fileAttached = true;
        }
      } catch (err) {
        console.warn('Base64 to blob conversion failed:', err);
      }
    }

    // 2. Si non attaché, fallback par fetch blob ou objet natif React Native :
    if (!fileAttached) {
      try {
        const localFileResponse = await fetch(imageUri);
        const rawBlob = await localFileResponse.blob();
        let blob = rawBlob;
        try {
          blob = new Blob([rawBlob], { type: safeType });
        } catch (blobWrapErr) {
          blob = rawBlob;
        }
        formData.append('file', blob, safeName);
      } catch (blobErr) {
        console.warn('Fetch blob fallback:', blobErr);
        formData.append('file', {
          uri: Platform.OS === 'ios' ? imageUri.replace('file://', '') : imageUri,
          name: safeName,
          type: safeType,
        });
      }
    }

    if (sessionId && sessionId !== 'null' && sessionId !== 'undefined') {
      formData.append('session_id', String(sessionId));
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    try {
      const response = await fetch(`${BASE_URL}/diagnosis/visual`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorMsg = await _extractErrorMessage(response);
        const error = new Error(errorMsg);
        error.status = response.status;
        throw error;
      }
      return await response.json();
    } catch (e) {
      clearTimeout(timeoutId);
      if (e.name === 'AbortError') {
        const error = new Error('Délai d\'attente dépassé.');
        error.status = 'TIMEOUT';
        throw error;
      }
      throw e;
    }
  },

  async transcribeAudio(audioUri, token) {
    const safeName = 'voice_record.m4a';
    const formData = new FormData();

    // Compatibilité Expo 51+ / React Native 0.76+ (WinterCG Blob avec MIME type explicite sans vider les octets) :
    try {
      const localFileResponse = await fetch(audioUri);
      const rawBlob = await localFileResponse.blob();
      let blob = rawBlob;
      try {
        blob = new Blob([rawBlob], { type: 'audio/m4a' });
      } catch (blobWrapErr) {
        blob = rawBlob;
      }
      formData.append('file', blob, safeName);
    } catch (blobErr) {
      console.warn('Audio blob fallback:', blobErr);
      formData.append('file', {
        uri: Platform.OS === 'ios' ? audioUri.replace('file://', '') : audioUri,
        name: safeName,
        type: 'audio/m4a',
      });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch(`${BASE_URL}/chat/transcribe`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorMsg = await _extractErrorMessage(response);
        const error = new Error(errorMsg);
        error.status = response.status;
        throw error;
      }
      return await response.json();
    } catch (e) {
      clearTimeout(timeoutId);
      if (e.name === 'AbortError') {
        const error = new Error("Délai d'attente dépassé pour la transcription.");
        error.status = 'TIMEOUT';
        throw error;
      }
      throw e;
    }
  },
};

async function _extractErrorMessage(response) {
  try {
    const data = await response.json();
    if (Array.isArray(data.detail)) return "Erreur de validation des données.";
    return data.detail || `Erreur serveur HTTP: ${response.status}`;
  } catch (e) {
    return `Erreur serveur HTTP: ${response.status}`;
  }
}
