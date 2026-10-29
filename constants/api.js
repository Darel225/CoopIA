// constants/api.js
// URL from Expo env variables, with local network fallback
export const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.97:8000/api/v1';
