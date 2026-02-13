import type { FoodItem } from '../types/types';

export const MENU_DATA: FoodItem[] = [
  // MEALS
  { 
    id: 1, 
    name: 'Premium Veg Thali', 
    price: 180, 
    type: 'meal', 
    category: 'Veg' 
  },
  { 
    id: 2, 
    name: 'Chicken Biryani Special', 
    price: 240, 
    type: 'meal', 
    category: 'Non-Veg' 
  },
  { 
    id: 3, 
    name: 'Paneer Butter Masala with Roti', 
    price: 160, 
    type: 'meal', 
    category: 'Veg' 
  },

  // SNACKS
  { 
    id: 4, 
    name: 'Masala Sandwich', 
    price: 60, 
    type: 'snack', 
    category: 'Veg' 
  },
  { 
    id: 5, 
    name: 'Chicken Burger', 
    price: 120, 
    type: 'snack', 
    category: 'Non-Veg' 
  },
  { 
    id: 6, 
    name: 'Veg Cutlet (2 pcs)', 
    price: 50, 
    type: 'snack', 
    category: 'Veg' 
  },

  // DRINKS
  { 
    id: 7, 
    name: 'Hot Masala Tea', 
    price: 20, 
    type: 'drink', 
    category: 'Veg' 
  },
  { 
    id: 8, 
    name: 'Cold Coffee', 
    price: 80, 
    type: 'drink', 
    category: 'Veg' 
  },

  // WATER
  { 
    id: 9, 
    name: 'Rail Neer Mineral Water', 
    price: 15, 
    type: 'water', 
    category: 'Veg' 
  },
  { 
    id: 10, 
    name: 'Sparkling Water', 
    price: 40, 
    type: 'water', 
    category: 'Veg' 
  }
];