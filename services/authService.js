//Ce fichier regroupe des fonctions liées à l’authentification et au profil
import { BASE_URL } from '../constants/api';

export const authService = {

  /**
   * Demande l'envoi d'un code OTP à l'adresse e-mail fournie.
   * @param {string} email - L'adresse e-mail de l'utilisateur
   * @returns {Promise<{ success: boolean }>}
   */
  requestOtp: async (email) => {
    try {
      const response = await fetch(`${BASE_URL}/auth/auth-request-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        throw new Error(`Erreur serveur lors de la demande OTP : ${response.status}`);
      }

      const text = await response.text();
      const data = text ? JSON.parse(text) : {};
      return data;
    } catch (error) {
      if (__DEV__) { console.error('[authService.requestOtp]', error); }
      throw new Error("Impossible d'envoyer le code. Vérifiez votre connexion et réessayez.");
    }
  },

  /**
   * Vérifie le code OTP saisi par l'utilisateur.
   * @param {string} email - L'adresse e-mail de l'utilisateur
   * @param {string} code - Le code OTP à 4 chiffres
   * @returns {Promise<{ isValid: boolean, isNewUser: boolean, user: object|null }>}
   */
  verifyOtp: async (email, code) => {
    try {
      const response = await fetch(`${BASE_URL}/auth/auth-verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });

      if (!response.ok) {
        throw new Error(`Erreur serveur lors de la vérification OTP : ${response.status}`);
      }

      const text = await response.text();
      const data = text ? JSON.parse(text) : {};
      return data;
    } catch (error) {
      if (__DEV__) { console.error('[authService.verifyOtp]', error); }
      throw new Error('La vérification a échoué. Veuillez réessayer.');
    }
  },

  /**
   * Met à jour le profil d'un nouvel utilisateur après la vérification OTP.
   * @param {object} profileData - Les données du profil à envoyer
   */
  updateProfile: async ({ email, nom, prenom, quartier, photo_url }) => {
    try {
      const response = await fetch(`${BASE_URL}/profile/update-profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, nom, prenom, quartier, photo_url }),
      });

      if (!response.ok) {
        throw new Error(`Erreur serveur lors de la mise à jour du profil : ${response.status}`);
      }

      const text = await response.text();
      const data = text ? JSON.parse(text) : {};
      return data;
    } catch (error) {
      if (__DEV__) { console.error('[authService.updateProfile]', error); }
      throw new Error('La mise à jour du profil a échoué. Veuillez réessayer.');
    }
  },
};
