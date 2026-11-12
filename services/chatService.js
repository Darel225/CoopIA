//**Ce fichier est le messager entre l’écran de chat et le serveur. */
import { BASE_URL } from '../constants/api';
import { Platform } from 'react-native';

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
    let fileAttached = false;

    // 1. Solution standard et native Expo / React Native : fetch sur data URI
    if (base64Data) {
      try {
        const cleanBase64 = String(base64Data).replace(/[\r\n\t ]/g, '');
        const dataUrl = `data:${safeType};base64,${cleanBase64}`;
        const dataResponse = await fetch(dataUrl);
        const dataBlob = await dataResponse.blob();
        if (dataBlob && dataBlob.size > 0) {
          formData.append('file', dataBlob, safeName);
          fileAttached = true;
        }
      } catch (dataErr) {
        console.warn('Data URI blob conversion failed:', dataErr);
      }
    }

    // 2. Fallback XHR binaire natif (le standard historique React Native pour lire les file:// locaux)
    if (!fileAttached) {
      try {
        const xhrBlob = await new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.onload = () => resolve(xhr.response);
          xhr.onerror = (e) => reject(new TypeError('XHR file read failed'));
          xhr.responseType = 'blob';
          xhr.open('GET', imageUri, true);
          xhr.send(null);
        });
        if (xhrBlob && xhrBlob.size > 0) {
          formData.append('file', xhrBlob, safeName);
          fileAttached = true;
        }
      } catch (xhrErr) {
        console.warn('XHR blob failed:', xhrErr);
      }
    }

    // 3. Dernier recours natif React Native { uri, name, type }
    if (!fileAttached) {
      formData.append('file', {
        uri: Platform.OS === 'ios' ? imageUri.replace('file://', '') : imageUri,
        name: safeName,
        type: safeType,
      });
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
