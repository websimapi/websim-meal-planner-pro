import { createApp, onMounted } from 'vue';
import { AppState } from './js/state.js';
import { setupMethods } from './js/methods.js';
import { loadFromLocalStorage, getSampleRecipes } from './js/storageService.js';
import { MenuSection } from './components/MenuSection.js';
import { FavoritesSection } from './components/FavoritesSection.js';
import { ShoppingSection } from './components/ShoppingSection.js';
import { HouseholdSection } from './components/HouseholdSection.js';
import { KitchenSection } from './components/KitchenSection.js';
import { Modals } from './components/Modals.js';

createApp({
  components: {
    MenuSection,
    FavoritesSection,
    ShoppingSection,
    HouseholdSection,
    KitchenSection,
    Modals
  },
  setup() {
    // Initialize state
    const state = AppState();
    
    // Setup methods with state
    const methods = setupMethods(state);
    
    // Load data on start
    onMounted(() => {
      loadFromLocalStorage(state);
      
      // Generate initial shopping list
      methods.generateShoppingList();
    });
    
    return {
      // Expose all state and methods
      ...state,
      ...methods
    };
  }
}).mount('#app');