import { ref, reactive, computed, onMounted } from 'vue';
import { getSampleRecipes } from './utils.js';

// State
export const activeTab = ref('menu');
export const favorites = ref([]);
export const menuWeeks = ref([
  Array(7).fill().map(() => ({ recipe: null })),
  Array(7).fill().map(() => ({ recipe: null }))
]);
export const shoppingItems = ref([]);

// Recipe form state (managed by RecipeModal component, but initial structure here for clarity)
export const initialRecipeForm = () => ({
  id: null,
  title: '',
  description: '',
  ingredients: [{ amount: '', name: '', category: 'Produce' }],
  steps: '',
  isDefault: false
});

// Search and filters (managed by respective components)
export const searchTerm = ref(''); // For FavoritesList
export const selectorSearchTerm = ref(''); // For RecipeSelectorModal

// Modals control (will be managed by App.js or specific components)
export const showAddRecipeModal = ref(false);
export const showAddFromUrlModal = ref(false);
export const showViewRecipeModal = ref(false);
export const showRecipeSelectorModal = ref(false);
export const showConfirmModal = ref(false);

// URL import (managed by UrlImportModal)
export const recipeUrl = ref('');
export const urlError = ref('');

// Selected items for operations
export const selectedRecipe = ref({}); // For viewing, editing, deleting
export const selectedDay = ref({ week: 0, day: 0 }); // For assigning recipe to menu

// Confirmation modal state (managed by App.js or specific components)
export const confirmAction = ref(() => {});
export const confirmTitle = ref('');
export const confirmMessage = ref('');

// Editing state
export const editingRecipe = ref(false); // Tracks if RecipeModal is in edit mode

// Computed properties
export const filteredFavorites = computed(() => {
  if (!searchTerm.value) return favorites.value;
  const term = searchTerm.value.toLowerCase();
  return favorites.value.filter(recipe => {
    return recipe.title.toLowerCase().includes(term) || 
           (recipe.description && recipe.description.toLowerCase().includes(term));
  });
});

export const filteredSelectorFavorites = computed(() => { // Used in RecipeSelectorModal
  if (!selectorSearchTerm.value) return favorites.value;
  const term = selectorSearchTerm.value.toLowerCase();
  return favorites.value.filter(recipe => {
    return recipe.title.toLowerCase().includes(term) || 
           (recipe.description && recipe.description.toLowerCase().includes(term));
  });
});

export const groupedShoppingItems = computed(() => {
  const grouped = {};
  shoppingItems.value.forEach(item => {
    if (!grouped[item.category]) {
      grouped[item.category] = [];
    }
    grouped[item.category].push(item);
  });
  return grouped;
});


// --- Core Actions ---

export function saveToLocalStorage() {
  localStorage.setItem('meal-planner-favorites', JSON.stringify(favorites.value));
  localStorage.setItem('meal-planner-menu', JSON.stringify(menuWeeks.value));
}

export function loadFromLocalStorage() {
  const savedFavorites = localStorage.getItem('meal-planner-favorites');
  const savedMenu = localStorage.getItem('meal-planner-menu');

  if (savedFavorites) {
    favorites.value = JSON.parse(savedFavorites);
  } else {
    favorites.value = getSampleRecipes();
  }

  if (savedMenu) {
    menuWeeks.value = JSON.parse(savedMenu);
  }
  // Ensure menuWeeks always has the correct structure if localStorage is empty or corrupted
  if (!menuWeeks.value || menuWeeks.value.length !== 2 || !menuWeeks.value.every(week => week.length === 7)) {
      menuWeeks.value = [
          Array(7).fill(null).map(() => ({ recipe: null })),
          Array(7).fill(null).map(() => ({ recipe: null }))
      ];
  }
}

// --- Recipe Actions ---
export function addOrUpdateRecipe(recipeData) {
  if (recipeData.id) { // Editing existing recipe
    const index = favorites.value.findIndex(r => r.id === recipeData.id);
    if (index !== -1) {
      favorites.value[index] = { ...favorites.value[index], ...recipeData };
    }
    // Update any menu items using this recipe
    menuWeeks.value.forEach(week => {
      week.forEach(day => {
        if (day.recipe && day.recipe.id === recipeData.id) {
          day.recipe = { ...day.recipe, ...recipeData };
        }
      });
    });
  } else { // Adding new recipe
    const newRecipe = { ...recipeData, id: Date.now().toString() };
    favorites.value.push(newRecipe);
  }
  saveToLocalStorage();
}

export function removeRecipe(recipeId) {
  favorites.value = favorites.value.filter(r => r.id !== recipeId);
  menuWeeks.value.forEach(week => {
    week.forEach(day => {
      if (day.recipe && day.recipe.id === recipeId) {
        day.recipe = null;
      }
    });
  });
  saveToLocalStorage();
}

export function toggleRecipeDefault(recipe) {
  const favRecipe = favorites.value.find(r => r.id === recipe.id);
  if (favRecipe) {
    favRecipe.isDefault = !favRecipe.isDefault;
    saveToLocalStorage();
  }
}

// --- Menu Actions ---
export function assignRecipeToMenu(weekIndex, dayIndex, recipe) {
  if (menuWeeks.value[weekIndex] && menuWeeks.value[weekIndex][dayIndex]) {
    menuWeeks.value[weekIndex][dayIndex].recipe = recipe;
    saveToLocalStorage();
  }
}

export function clearDayFromMenu(weekIndex, dayIndex) {
  if (menuWeeks.value[weekIndex] && menuWeeks.value[weekIndex][dayIndex]) {
    menuWeeks.value[weekIndex][dayIndex].recipe = null;
    saveToLocalStorage();
  }
}

export function clearFullMenu() {
  menuWeeks.value = [
    Array(7).fill().map(() => ({ recipe: null })),
    Array(7).fill().map(() => ({ recipe: null }))
  ];
  saveToLocalStorage();
}

export function autoFillFullMenu() {
  const defaultRecipes = favorites.value.filter(r => r.isDefault);
  const otherRecipesAvailable = favorites.value.filter(r => !r.isDefault);
  let otherRecipes = [...otherRecipesAvailable]; // Use a copy to allow re-use if needed

  const newMenu = JSON.parse(JSON.stringify(menuWeeks.value)); // Start with current menu

  // Place default recipes in empty slots
  defaultRecipes.forEach(recipe => {
    let placed = false;
    for (let w = 0; w < newMenu.length && !placed; w++) {
      for (let d = 0; d < newMenu[w].length && !placed; d++) {
        if (!newMenu[w][d].recipe) {
          // Check if this default recipe is already in the menu for this week to avoid too many duplicates
          let alreadyInWeek = false;
          for(let dayCheck = 0; dayCheck < newMenu[w].length; dayCheck++) {
              if(newMenu[w][dayCheck].recipe && newMenu[w][dayCheck].recipe.id === recipe.id) {
                  alreadyInWeek = true;
                  break;
              }
          }
          if (!alreadyInWeek) {
             newMenu[w][d].recipe = recipe;
             placed = true;
          }
        }
      }
    }
  });

  // Fill remaining empty slots with other recipes
  for (let w = 0; w < newMenu.length; w++) {
    for (let d = 0; d < newMenu[w].length; d++) {
      if (!newMenu[w][d].recipe) {
        if (otherRecipes.length === 0 && otherRecipesAvailable.length > 0) {
            otherRecipes = [...otherRecipesAvailable]; // Replenish if ran out and more available
        }
        if (otherRecipes.length > 0) {
          const randomIndex = Math.floor(Math.random() * otherRecipes.length);
          newMenu[w][d].recipe = otherRecipes[randomIndex];
          otherRecipes.splice(randomIndex, 1); // Remove to prefer variety
        }
      }
    }
  }
  menuWeeks.value = newMenu;
  saveToLocalStorage();
}


// --- Shopping List Actions ---
export function generateCurrentShoppingList() {
  const allItems = [];
  const itemMap = {}; // Using map to handle quantity aggregation simply

  menuWeeks.value.forEach(week => {
    week.forEach(day => {
      if (day.recipe && day.recipe.ingredients) {
        day.recipe.ingredients.forEach(ingredient => {
          const key = `${ingredient.name.trim().toLowerCase()}_${ingredient.category}`; // Normalize key
          
          if (itemMap[key]) {
            // For simplicity, we are not aggregating amounts here, just listing them.
            // A more complex app might parse and sum amounts if units are compatible.
            // For now, we'll just list each instance or decide how to handle.
            // Let's assume for now each entry is unique if amount/unit differs, or we just list once per name/category.
            // The original code created a new item if map didn't have it, didn't aggregate quantities.
            // Let's stick to listing each ingredient as it appears in recipes.
            // To avoid duplicates in shopping list display if same ingredient comes from different meals:
            // We can use the itemMap to ensure an ingredient (name + category) appears once,
            // and perhaps list multiple amounts or recipes it's for.
            // The original code's `item.count` was not really used in display.
            // Let's simplify: an item is unique by name and category. Amount is the first one encountered.
            if (!itemMap[key]) {
                 itemMap[key] = {
                    id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, // Unique ID
                    name: ingredient.name,
                    amount: ingredient.amount, // Could be "2 cups", "1 lb", etc.
                    category: ingredient.category,
                    checked: false,
                 };
            }
          } else {
            itemMap[key] = {
              id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              name: ingredient.name,
              amount: ingredient.amount,
              category: ingredient.category,
              checked: false,
            };
          }
        });
      }
    });
  });
  
  const uniqueItems = Object.values(itemMap);

  // Sort by category and name
  uniqueItems.sort((a, b) => {
    if (a.category !== b.category) {
      return a.category.localeCompare(b.category);
    }
    return a.name.localeCompare(b.name);
  });

  shoppingItems.value = uniqueItems;
}


// Initialize store data on load
onMounted(() => {
  loadFromLocalStorage();
  generateCurrentShoppingList(); // Generate initial shopping list
});