//**Ce fichier est le messager entre l’écran de chat et le serveur. */
import { BASE_URL } from '../constants/api';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';

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

  async sendDiagnosisImage(imageUri, mimeType, fileName, sessionId, token, base64Data, retryCount = 1) {
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

    // SUR MOBILE (iOS & Android) : Utilisation directe de FileSystem.uploadAsync
    // C'est le standard natif officiel Expo qui lit directement le fichier physique depuis le disque
    if (Platform.OS !== 'web' && FileSystem && typeof FileSystem.uploadAsync === 'function') {
      try {
        const uploadResult = await FileSystem.uploadAsync(
          `${BASE_URL}/diagnosis/visual`,
          imageUri,
          {
            fieldName: 'file',
            httpMethod: 'POST',
            uploadType: (FileSystem && FileSystem.FileSystemUploadType && FileSystem.FileSystemUploadType.MULTIPART) ? FileSystem.FileSystemUploadType.MULTIPART : 1,
            headers: {
              Authorization: `Bearer ${token}`,
            },
            parameters: (sessionId && sessionId !== 'null' && sessionId !== 'undefined')
              ? { session_id: String(sessionId) }
              : {},
            mimeType: safeType,
          }
        );

        if (uploadResult.status >= 200 && uploadResult.status < 300) {
          return JSON.parse(uploadResult.body);
        } else {
          if (uploadResult.status >= 500 && retryCount > 0) {
            await new Promise(r => setTimeout(r, 1500));
            return await this.sendDiagnosisImage(imageUri, mimeType, fileName, sessionId, token, base64Data, retryCount - 1);
          }
          let errDetail = 'Erreur lors du diagnostic.';
          try {
            const parsed = JSON.parse(uploadResult.body);
            errDetail = parsed.detail || errDetail;
          } catch (e) {}
          const error = new Error(errDetail);
          error.status = uploadResult.status;
          throw error;
        }
      } catch (fsErr) {
        if (fsErr.status) throw fsErr;
        console.warn('FileSystem.uploadAsync failed, attempting fallback:', fsErr);
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
        if (dataBlob) {
          formData.append('file', dataBlob, safeName);
          fileAttached = true;
        }
      } catch (dataErr) {
        console.warn('Data URI blob conversion failed:', dataErr);
      }
    }

    // 2. Fallback XHR binaire natif
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
        if (xhrBlob) {
          formData.append('file', xhrBlob, safeName);
          fileAttached = true;
        }
      } catch (xhrErr) {
        console.warn('XHR blob failed:', xhrErr);
      }
    }

    // 3. Dernier recours natif React Native { uri, name, type } avec l'URI complète file://
    if (!fileAttached) {
      formData.append('file', {
        uri: imageUri,
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
        if (response.status >= 500 && retryCount > 0) {
          await new Promise(r => setTimeout(r, 1500));
          return await this.sendDiagnosisImage(imageUri, mimeType, fileName, sessionId, token, base64Data, retryCount - 1);
        }
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
        if (response.status >= 500 && retryCount > 0) {
          await new Promise(r => setTimeout(r, 1500));
          return await this.sendDiagnosisImage(imageUri, mimeType, fileName, sessionId, token, base64Data, retryCount - 1);
        }
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
