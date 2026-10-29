import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';


export const useUserStore = create(
  persist(
    (set) => ({
      isAuthenticated: false,
      sessionId: null,

      userId: null,       
      firstName: null,    
      nom: null,          
      prenom: null,       
      whatsapp: null,     
      avatar: null,       
      zone: null,         
      phone: null,        
      ville: null,        
      quartier: null,     

      setUserData: (data) => set((state) => ({ ...state, ...data })),

      login: () => set({ isAuthenticated: true }),

      logout: () => set({
        isAuthenticated: false,
        userId: null,
        firstName: null,
        nom: null,
        prenom: null,
        whatsapp: null,
        avatar: null,
        zone: null,
        phone: null,
        ville: null,
        quartier: null,
        sessionId: null,
      }),
    }),
    {
      name: 'chatandgo-user-storage', 
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
