import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface DeliveryLocation {
  label: string;
  city: string;
  pincode: string | null;
  lat: number | null;
  lng: number | null;
}

interface LocationStore {
  current: DeliveryLocation | null;
  setLocation: (loc: DeliveryLocation) => void;
  clearLocation: () => void;
}

export const useLocationStore = create<LocationStore>()(
  persist(
    (set) => ({
      current: null,
      setLocation: (loc) => set({ current: loc }),
      clearLocation: () => set({ current: null }),
    }),
    { name: "pb-delivery-location" }
  )
);
