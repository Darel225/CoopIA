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

  async sendMessage(text, sessionId, token) {
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
      const errorMsg = await _extractErrorMessage(response);
      throw new Error(errorMsg);
    }
    return await response.json();
  },

  async sendDiagnosisImage(imageUri, mimeType, fileName, sessionId, token) {
    const safeName = fileName ? String(fileName) : (String(imageUri).split('/').pop() || 'photo.jpg');
    
    let safeType = mimeType;
    if (!safeType) {
      const lowerName = safeName.toLowerCase();
      if (lowerName.endsWith('.png')) {
        safeType = 'image/png';
      } else if (lowerName.endsWith('.webp')) {
        safeType = 'image/webp';
      } else {
        safeType = 'image/jpeg';
      }
    }

    // Fetch the file URI to convert it into a Blob (required by Expo 51+ modern fetch)
    const localFileResponse = await fetch(imageUri);
    const originalBlob = await localFileResponse.blob();
    const blob = new Blob([originalBlob], { type: safeType });

    const formData = new FormData();
    formData.append('file', blob, safeName);

    if (sessionId) {
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

    // Expo fetch WinterCG standard : fetch du fichier local vers un Blob standard
    const localFileResponse = await fetch(audioUri);
    const blob = await localFileResponse.blob();
    formData.append('file', blob, safeName);

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
