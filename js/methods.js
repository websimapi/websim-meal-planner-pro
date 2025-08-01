import { onMounted, watch } from 'vue';
import { saveToLocalStorage } from './storageService.js';
import { fetchRecipeFromUrl } from './recipeService.js';

export function setupMethods(state) {
  function getDayName(index) {
    const allDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    // Calculate the actual day index based on the week start day preference
    const adjustedIndex = (index + state.weekStartDay.value) % 7;
    return allDays[adjustedIndex];
  }

  function resetRecipeForm() {
    state.recipeForm.value = {
      title: '',
      description: '',
      ingredients: [{ amount: '', name: '', category: 'Produce' }],
      instructions: '',
      isDefault: false,
      category: 'Lunch/Dinner'
    };
    state.editingRecipe.value = false;
  }

  function addIngredient() {
    state.recipeForm.value.ingredients.push({ amount: '', name: '', category: 'Produce' });
  }

  function removeIngredient(index) {
    state.recipeForm.value.ingredients.splice(index, 1);
    if (state.recipeForm.value.ingredients.length === 0) {
      addIngredient();
    }
  }

  function saveRecipe() {
    // Validate form
    if (!state.recipeForm.value.title.trim()) {
      alert('Recipe title is required');
      return;
    }

    if (!state.recipeForm.value.ingredients.every(i => i.name.trim())) {
      alert('All ingredients must have a name');
      return;
    }

    if (!state.recipeForm.value.instructions.trim()) {
      alert('Instructions are required');
      return;
    }

    const recipeData = {
      id: state.editingRecipe.value ? state.selectedRecipe.value.id : Date.now().toString(),
      title: state.recipeForm.value.title.trim(),
      description: state.recipeForm.value.description.trim(),
      ingredients: state.recipeForm.value.ingredients.filter(i => i.name.trim()),
      instructions: state.recipeForm.value.instructions.trim(),
      isDefault: state.recipeForm.value.isDefault,
      category: state.recipeForm.value.category
    };

    if (state.editingRecipe.value) {
      // Update existing recipe
      const index = state.favorites.value.findIndex(r => r.id === recipeData.id);
      if (index !== -1) {
        state.favorites.value[index] = recipeData;
      }

      // Update any menu items using this recipe
      state.menuWeeks.value.forEach(week => {
        week.forEach(day => {
          for (const mealType of ['breakfast', 'lunch', 'dinner']) {
            if (day[mealType] && day[mealType].id === recipeData.id) {
              day[mealType] = recipeData;
            }
          }
        });
      });
    } else {
      // Add new recipe
      state.favorites.value.push(recipeData);
    }

    // Save to local storage
    saveToLocalStorage(state);

    // Close modal
    state.showAddRecipeModal.value = false;
    resetRecipeForm();
  }

  function cancelRecipeEdit() {
    state.showAddRecipeModal.value = false;
    resetRecipeForm();
  }

  function editRecipe(recipe) {
    state.selectedRecipe.value = recipe;
    state.recipeForm.value = {
      title: recipe.title,
      description: recipe.description,
      ingredients: [...recipe.ingredients],
      instructions: recipe.instructions || recipe.steps || '',
      isDefault: recipe.isDefault,
      category: recipe.category || 'Lunch/Dinner'
    };
    state.editingRecipe.value = true;
    state.showAddRecipeModal.value = true;
    state.showViewRecipeModal.value = false;
  }

  function viewRecipe(recipe) {
    state.selectedRecipe.value = recipe;
    state.showViewRecipeModal.value = true;
  }

  function confirmDeleteRecipe(recipe) {
    state.selectedRecipe.value = recipe;
    state.confirmTitle.value = 'Delete Recipe';
    state.confirmMessage.value = `Are you sure you want to delete "${recipe.title}"? This cannot be undone.`;
    state.confirmAction.value = deleteRecipe;
    state.showConfirmModal.value = true;
  }

  function deleteRecipe() {
    const recipeId = state.selectedRecipe.value.id;

    // Remove from favorites
    state.favorites.value = state.favorites.value.filter(r => r.id !== recipeId);

    // Remove from menu
    state.menuWeeks.value.forEach(week => {
      week.forEach(day => {
        if (day.breakfast && day.breakfast.id === recipeId) {
          day.breakfast = null;
        }
        if (day.lunch && day.lunch.id === recipeId) {
          day.lunch = null;
        }
        if (day.dinner && day.dinner.id === recipeId) {
          day.dinner = null;
        }
      });
    });

    // Save to local storage
    saveToLocalStorage(state);

    // Close modal
    state.showConfirmModal.value = false;
  }

  function toggleDefault(recipe) {
    recipe.isDefault = !recipe.isDefault;
    saveToLocalStorage(state);
  }

  function assignRecipe(weekIndex, dayIndex, mealType) {
    state.selectedDay.value = { week: weekIndex, day: dayIndex, mealType: mealType };
    state.selectorSearchTerm.value = '';
    state.showRecipeSelectorModal.value = true;
  }

  function selectRecipeForMenu(recipe) {
    state.menuWeeks.value[state.selectedDay.value.week][state.selectedDay.value.day][state.selectedDay.value.mealType] = recipe;
    state.showRecipeSelectorModal.value = false;
    saveToLocalStorage(state);
  }

  function clearDay(weekIndex, dayIndex, mealType) {
    state.menuWeeks.value[weekIndex][dayIndex][mealType] = null;
    saveToLocalStorage(state);
  }

  function clearMenu() {
    state.confirmTitle.value = 'Clear Menu';
    state.confirmMessage.value = 'Are you sure you want to clear the entire menu? This will remove all planned meals.';
    state.confirmAction.value = () => {
      state.menuWeeks.value = [
        Array(7).fill().map(() => ({ breakfast: null, lunch: null, dinner: null })),
        Array(7).fill().map(() => ({ breakfast: null, lunch: null, dinner: null }))
      ];
      saveToLocalStorage(state);
      state.showConfirmModal.value = false;
    };
    state.showConfirmModal.value = true;
  }

  function autoFillMenu() {
    // Filter default recipes first
    const defaultRecipes = state.favorites.value.filter(r => r.isDefault);

    // Group other recipes by category
    const breakfastRecipes = state.favorites.value.filter(r => r.category === 'Breakfast' && !r.isDefault);
    const lunchDinnerRecipes = state.favorites.value.filter(r =>
      (r.category === 'Lunch/Dinner' || r.category === 'Holiday') && !r.isDefault);
    const dessertRecipes = state.favorites.value.filter(r => r.category === 'Dessert' && !r.isDefault);

    // Copy the current menu
    const newMenu = JSON.parse(JSON.stringify(state.menuWeeks.value));

    // First, place default recipes across all meal types
    defaultRecipes.forEach(recipe => {
      let placed = false;

      // Try to place according to recipe category
      for (let w = 0; w < newMenu.length && !placed; w++) {
        for (let d = 0; d < newMenu[w].length && !placed; d++) {
          // Pick appropriate meal type based on recipe category
          let mealType;
          if (recipe.category === 'Breakfast') {
            mealType = 'breakfast';
          } else if (recipe.category === 'Dessert') {
            // Desserts can go with dinner
            mealType = 'dinner';
          } else {
            // Lunch/Dinner and Holiday can go in lunch or dinner
            mealType = !newMenu[w][d].lunch ? 'lunch' : 'dinner';
          }

          if (!newMenu[w][d][mealType]) {
            newMenu[w][d][mealType] = recipe;
            placed = true;
          }
        }
      }

      // If still not placed, put in any available slot
      if (!placed) {
        for (let w = 0; w < newMenu.length && !placed; w++) {
          for (let d = 0; d < newMenu[w].length && !placed; d++) {
            for (const mealType of ['breakfast', 'lunch', 'dinner']) {
              if (!newMenu[w][d][mealType]) {
                newMenu[w][d][mealType] = recipe;
                placed = true;
                break;
              }
            }
          }
        }
      }
    });

    // Then fill remaining slots with appropriate category recipes
    for (let w = 0; w < newMenu.length; w++) {
      for (let d = 0; d < newMenu[w].length; d++) {
        // Fill breakfast
        if (!newMenu[w][d].breakfast && breakfastRecipes.length > 0) {
          const randomIndex = Math.floor(Math.random() * breakfastRecipes.length);
          newMenu[w][d].breakfast = breakfastRecipes[randomIndex];
          breakfastRecipes.splice(randomIndex, 1);
        }

        // Fill lunch
        if (!newMenu[w][d].lunch && lunchDinnerRecipes.length > 0) {
          const randomIndex = Math.floor(Math.random() * lunchDinnerRecipes.length);
          newMenu[w][d].lunch = lunchDinnerRecipes[randomIndex];
          lunchDinnerRecipes.splice(randomIndex, 1);
        }

        // Fill dinner - try to add a dessert occasionally
        if (!newMenu[w][d].dinner) {
          if (Math.random() > 0.7 && dessertRecipes.length > 0) {
            // 30% chance of dessert
            const randomIndex = Math.floor(Math.random() * dessertRecipes.length);
            newMenu[w][d].dinner = dessertRecipes[randomIndex];
            dessertRecipes.splice(randomIndex, 1);
          } else if (lunchDinnerRecipes.length > 0) {
            const randomIndex = Math.floor(Math.random() * lunchDinnerRecipes.length);
            newMenu[w][d].dinner = lunchDinnerRecipes[randomIndex];
            lunchDinnerRecipes.splice(randomIndex, 1);
          }
        }
      }
    }

    state.menuWeeks.value = newMenu;
    saveToLocalStorage(state);
  }

  function generateShoppingList() {
    const allItems = [];
    const itemMap = {};

    // Get all recipes from the menu
    state.menuWeeks.value.forEach(week => {
      week.forEach(day => {
        // Process breakfast, lunch, and dinner recipes
        for (const mealType of ['breakfast', 'lunch', 'dinner']) {
          if (day[mealType] && day[mealType].ingredients) {
            day[mealType].ingredients.forEach(ingredient => {
              const key = `${ingredient.name.toLowerCase()}_${ingredient.category}`;

              if (itemMap[key]) {
                // Already have this item, merge
                itemMap[key].count++;
              } else {
                // New item
                const item = {
                  id: Date.now() + Math.random().toString().slice(2),
                  name: ingredient.name,
                  amount: ingredient.amount,
                  category: ingredient.category,
                  checked: false,
                  count: 1,
                  inKitchen: false,
                  matchedKeyword: ''
                };

                itemMap[key] = item;
                allItems.push(item);
              }
            });
          }
        }
      });
    });

    // Compare with kitchen inventory using keyword matching
    state.kitchenInventory.value.forEach(kitchenItem => {
      if (kitchenItem.checked) {
        const kitchenKeywords = extractKeywords(kitchenItem.name);

        allItems.forEach(shoppingItem => {
          // Check if any keywords from kitchen item match in shopping item
          if (hasMatchingKeywords(shoppingItem.name, kitchenKeywords)) {
            shoppingItem.inKitchen = true;
            shoppingItem.matchedKeyword = kitchenItem.name; // Store the matched kitchen item
          }
        });
      }
    });

    // Sort by category and name
    allItems.sort((a, b) => {
      if (a.category !== b.category) {
        return a.category.localeCompare(b.category);
      }
      return a.name.localeCompare(b.name);
    });

    state.shoppingItems.value = allItems;
  }

  // Helper function to extract keywords from an ingredient name
  function extractKeywords(ingredientName) {
    // Convert to lowercase and remove common units and quantities
    const normalized = ingredientName.toLowerCase()
      .replace(/\d+(\.\d+)?/g, '') // Remove numbers
      .replace(/cup|cups|tbsp|tsp|tablespoon|teaspoon|ounce|oz|pound|lb|gram|g/g, '') // Remove units
      .replace(/\(.*?\)/g, '') // Remove anything in parentheses
      .trim();

    // Split into words, filtering out very short words and common stop words
    const stopWords = ['and', 'or', 'the', 'with', 'of', 'a', 'an'];
    const words = normalized.split(/\s+/)
      .filter(word => word.length > 2) // Filter out very short words
      .filter(word => !stopWords.includes(word)); // Filter out stop words

    return words;
  }

  // Helper function to check if any keywords match
  function hasMatchingKeywords(itemName, keywords) {
    const normalizedName = itemName.toLowerCase();

    // Check if any keyword is contained in the item name
    return keywords.some(keyword => normalizedName.includes(keyword));
  }

  function printShoppingList() {
    const printWindow = window.open('', '_blank');

    if (!printWindow) {
      alert('Please allow pop-ups to print your shopping list');
      return;
    }

    let content = `
      <html>
      <head>
        <title>Shopping List - Meal Planner Pro</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { color: #3a8c6e; text-align: center; }
          h2 { color: #2a6650; border-bottom: 2px solid #e2f3ed; padding-bottom: 5px; margin-top: 20px; }
          .date { text-align: center; margin-bottom: 30px; color: #767676; }
          ul { list-style-type: none; padding: 0; }
          li { padding: 8px 0; border-bottom: 1px solid #e5e5e5; }
          .amount { font-weight: bold; }
          @media print {
            body { margin: 0; padding: 10px; }
          }
        </style>
      </head>
      <body>
        <h1>Shopping List</h1>
        <div class="date">${new Date().toLocaleDateString()}</div>
    `;

    // Add categories and items
    for (const [category, items] of Object.entries(state.groupedShoppingItems.value)) {
      content += `<h2>${category}</h2><ul>`;

      items.forEach(item => {
        content += `<li><span class="amount">${item.amount}</span> ${item.name}</li>`;
      });

      content += `</ul>`;
    }

    content += `</body></html>`;

    printWindow.document.open();
    printWindow.document.write(content);
    printWindow.document.close();
    printWindow.print();
  }

  function emailShoppingList() {
    let body = "Shopping List\n\n";

    for (const [category, items] of Object.entries(state.groupedShoppingItems.value)) {
      body += `${category}:\n`;

      items.forEach(item => {
        body += `- ${item.amount} ${item.name}\n`;
      });

      body += `\n`;
    }

    const subject = "Shopping List - " + new Date().toLocaleDateString();
    const mailtoLink = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    window.open(mailtoLink);
  }

  async function processFetchRecipeFromUrl() {
    if (!state.recipeUrl.value) {
      state.urlError.value = "Please enter a valid URL";
      return;
    }

    state.urlError.value = "";
    state.isLoading.value = true;

    try {
      const recipe = await fetchRecipeFromUrl(state.recipeUrl.value);

      // Copy recipe to the form for editing
      state.recipeForm.value = {
        title: recipe.title,
        description: recipe.description || '',
        ingredients: recipe.ingredients.length > 0 ? recipe.ingredients : [{ amount: '', name: '', category: 'Produce' }],
        instructions: recipe.instructions || '',
        isDefault: false,
        category: 'Lunch/Dinner'
      };

      // Show the edit form
      state.showAddFromUrlModal.value = false;
      state.showAddRecipeModal.value = true;
      state.editingRecipe.value = false;

      // Clear the URL
      state.recipeUrl.value = '';

    } catch (error) {
      state.urlError.value = `Error: ${error.message || 'Could not process this URL. Please check it and try again.'}`;
    } finally {
      state.isLoading.value = false;
    }
  }

  // New Methods for Checklists
  function addItemModal(listType) {
    state.selectedList.value = listType;
    state.newItemName.value = '';
    state.newItemCategory.value = state.selectedList.value === 'kitchen' ? 'Pantry' : '';
    state.showAddItemModal.value = true;
  }

  function addItemToList() {
    if (!state.newItemName.value.trim()) {
      return;
    }

    const newItem = {
      id: Date.now().toString(),
      name: state.newItemName.value.trim(),
      checked: false
    };

    if (state.selectedList.value === 'household') {
      state.householdEssentials.value.push(newItem);
    } else if (state.selectedList.value === 'kitchen') {
      newItem.category = state.newItemCategory.value || 'Other';
      state.kitchenInventory.value.push(newItem);
    }

    saveToLocalStorage(state);
    state.showAddItemModal.value = false;
  }

  function toggleItemCheck(item, listType) {
    // Don't toggle manually - v-model already handles this
    // We just need to save the state and update shopping list if needed

    // If this is kitchen inventory, refresh the shopping list to update highlighting
    if (listType === 'kitchen') {
      generateShoppingList();
    }

    saveToLocalStorage(state);
  }

  function confirmDeleteItem(item, listType) {
    state.selectedItem = { item, listType };
    state.confirmTitle.value = 'Delete Item';
    state.confirmMessage.value = `Are you sure you want to delete "${item.name}"?`;
    state.confirmAction.value = () => {
      if (listType === 'household') {
        state.householdEssentials.value = state.householdEssentials.value.filter(i => i.id !== item.id);
      } else if (listType === 'kitchen') {
        state.kitchenInventory.value = state.kitchenInventory.value.filter(i => i.id !== item.id);
      }
      saveToLocalStorage(state);
      state.showConfirmModal.value = false;
    };
    state.showConfirmModal.value = true;
  }

  function toggleDarkMode() {
    state.darkMode.value = !state.darkMode.value;
    localStorage.setItem('meal-planner-dark-mode', state.darkMode.value);
    document.body.classList.toggle('dark-mode', state.darkMode.value);
  }

  function toggleSettingsMenu() {
    state.showSettingsMenu.value = !state.showSettingsMenu.value;
  }

  function changeWeekStartDay(newStartDay) {
    state.weekStartDay.value = newStartDay;
    saveToLocalStorage(state);
  }

  function changeNumberOfWeeks(newNumberOfWeeks) {
    const num = parseInt(newNumberOfWeeks);
    if (num < 1 || num > 4) return;

    state.numberOfWeeks.value = num;

    // Adjust the menu weeks array
    const currentWeeks = state.menuWeeks.value.length;

    if (currentWeeks < num) {
      // Add more weeks
      for (let i = currentWeeks; i < num; i++) {
        state.menuWeeks.value.push(
          Array(7).fill().map(() => ({ breakfast: null, lunch: null, dinner: null }))
        );
      }
    } else if (currentWeeks > num) {
      // Remove excess weeks (only if they're empty)
      const weeksToRemove = currentWeeks - num;

      // Check if weeks to be removed have any meals planned
      let hasPlannedMeals = false;
      for (let i = currentWeeks - weeksToRemove; i < currentWeeks; i++) {
        for (const day of state.menuWeeks.value[i]) {
          if (day.breakfast || day.lunch || day.dinner) {
            hasPlannedMeals = true;
            break;
          }
        }
        if (hasPlannedMeals) break;
      }

      if (hasPlannedMeals) {
        // Ask for confirmation if there are planned meals
        state.confirmTitle.value = 'Remove Weeks';
        state.confirmMessage.value = `Reducing to ${num} weeks will remove some planned meals. Continue?`;
        state.confirmAction.value = () => {
          state.menuWeeks.value = state.menuWeeks.value.slice(0, num);
          saveToLocalStorage(state);
          state.showConfirmModal.value = false;
        };
        state.showConfirmModal.value = true;
      } else {
        // No planned meals, safe to remove
        state.menuWeeks.value = state.menuWeeks.value.slice(0, num);
        saveToLocalStorage(state);
      }
    }

    saveToLocalStorage(state);
  }

  function getStartDayOptions() {
    return [
      { value: 0, label: 'Monday' },
      { value: 1, label: 'Tuesday' },
      { value: 2, label: 'Wednesday' },
      { value: 3, label: 'Thursday' },
      { value: 4, label: 'Friday' },
      { value: 5, label: 'Saturday' },
      { value: 6, label: 'Sunday' }
    ];
  }

  function exportData() {
    // Collect all app data
    const appData = {
      favorites: state.favorites.value,
      menuWeeks: state.menuWeeks.value,
      householdEssentials: state.householdEssentials.value,
      kitchenInventory: state.kitchenInventory.value,
      darkMode: state.darkMode.value,
      // Add version info for future compatibility
      version: '1.0'
    };

    // Convert to JSON and create a Blob
    const jsonData = JSON.stringify(appData, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });

    // Create a download link and trigger it
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `meal-planner-data-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();

    // Clean up
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function handleFileSelection(event) {
    const file = event.target.files[0];
    if (file) {
      state.fileSelected.value = true;
      state.importError.value = '';
    } else {
      state.fileSelected.value = false;
    }
  }

  function importData() {
    const fileInput = document.getElementById('import-file');
    const file = fileInput.files[0];

    if (!file) {
      state.importError.value = 'Please select a file to import';
      return;
    }

    const reader = new FileReader();

    reader.onload = function(e) {
      try {
        // Parse the JSON data
        const importedData = JSON.parse(e.target.result);

        // Basic validation
        if (!importedData.favorites || !Array.isArray(importedData.favorites)) {
          throw new Error('Invalid data format: Missing favorites array');
        }

        if (state.importOption.value === 'override') {
          // Override - Replace all existing data
          state.favorites.value = importedData.favorites || [];
          state.menuWeeks.value = importedData.menuWeeks || [
            Array(7).fill().map(() => ({ breakfast: null, lunch: null, dinner: null })),
            Array(7).fill().map(() => ({ breakfast: null, lunch: null, dinner: null }))
          ];
          state.householdEssentials.value = importedData.householdEssentials || [];
          state.kitchenInventory.value = importedData.kitchenInventory || [];
          state.darkMode.value = importedData.darkMode || false;

          // Apply dark mode
          document.body.classList.toggle('dark-mode', state.darkMode.value);

        } else {
          // Merge - Add new items while avoiding duplicates

          // Merge favorites (avoid duplicates by title)
          if (importedData.favorites && Array.isArray(importedData.favorites)) {
            const existingTitles = new Set(state.favorites.value.map(r => r.title.toLowerCase));

            importedData.favorites.forEach(importedRecipe => {
              if (!existingTitles.has(importedRecipe.title.toLowerCase())) {
                state.favorites.value.push({
                  ...importedRecipe,
                  id: Date.now() + Math.random().toString().slice(2) // Generate new ID to avoid conflicts
                });
                existingTitles.add(importedRecipe.title.toLowerCase());
              }
            });
          }

          // Merge menu - we keep existing menu but add any missing meal types
          if (importedData.menuWeeks && Array.isArray(importedData.menuWeeks)) {
            importedData.menuWeeks.forEach((week, weekIndex) => {
              if (weekIndex < state.menuWeeks.value.length) {
                week.forEach((day, dayIndex) => {
                  // Only add meals if the slot is empty
                  if (dayIndex < state.menuWeeks.value[weekIndex].length) {
                    if (!state.menuWeeks.value[weekIndex][dayIndex].breakfast && day.breakfast) {
                      state.menuWeeks.value[weekIndex][dayIndex].breakfast = day.breakfast;
                    }
                    if (!state.menuWeeks.value[weekIndex][dayIndex].lunch && day.lunch) {
                      state.menuWeeks.value[weekIndex][dayIndex].lunch = day.lunch;
                    }
                    if (!state.menuWeeks.value[weekIndex][dayIndex].dinner && day.dinner) {
                      state.menuWeeks.value[weekIndex][dayIndex].dinner = day.dinner;
                    }
                  }
                });
              }
            });
          }

          // Merge household essentials (avoid duplicates by name)
          if (importedData.householdEssentials && Array.isArray(importedData.householdEssentials)) {
            const existingNames = new Set(state.householdEssentials.value.map(item => item.name.toLowerCase()));

            importedData.householdEssentials.forEach(importedItem => {
              if (!existingNames.has(importedItem.name.toLowerCase())) {
                state.householdEssentials.value.push({
                  ...importedItem,
                  id: Date.now() + Math.random().toString().slice(2) // Generate new ID
                });
                existingNames.add(importedItem.name.toLowerCase());
              }
            });
          }

          // Merge kitchen inventory (avoid duplicates by name)
          if (importedData.kitchenInventory && Array.isArray(importedData.kitchenInventory)) {
            const existingNames = new Set(state.kitchenInventory.value.map(item => item.name.toLowerCase()));

            importedData.kitchenInventory.forEach(importedItem => {
              if (!existingNames.has(importedItem.name.toLowerCase())) {
                state.kitchenInventory.value.push({
                  ...importedItem,
                  id: Date.now() + Math.random().toString().slice(2) // Generate new ID
                });
                existingNames.add(importedItem.name.toLowerCase());
              }
            });
          }
        }

        // Save to local storage
        saveToLocalStorage(state);

        // Regenerate shopping list
        generateShoppingList();

        // Close the modal
        state.showImportModal.value = false;

        // Reset file input
        fileInput.value = '';
        state.fileSelected.value = false;

      } catch (error) {
        console.error('Import error:', error);
        state.importError.value = `Error importing data: ${error.message}`;
      }
    };
    reader.onerror = function() {
      state.importError.value = 'Error reading file';
    };
    reader.readAsText(file);
  }

  function downloadDesktopBridge() {
    // Create the desktop bridge package content
    const bridgeFiles = {
      'package.json': JSON.stringify({
        "name": "meal-planner-cors-bridge",
        "version": "1.0.0",
        "description": "Local CORS proxy bridge for Meal Planner Pro",
        "main": "server.js",
        "scripts": {
          "start": "node server.js",
          "dev": "nodemon server.js"
        },
        "dependencies": {
          "cors": "^2.8.5",
          "express": "^4.18.2",
          "node-fetch": "^2.6.7"
        },
        "keywords": ["cors", "proxy", "meal-planner"],
        "author": "Meal Planner Pro",
        "license": "MIT"
      }, null, 2),
      
      'server.js': `const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3001;

// Enable CORS for all routes
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Parse JSON bodies
app.use(express.json({ limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Meal Planner CORS Bridge is running',
    timestamp: new Date().toISOString()
  });
});

// CORS proxy endpoint
app.get('/proxy', async (req, res) => {
  const { url } = req.query;
  
  if (!url) {
    return res.status(400).json({ error: 'URL parameter is required' });
  }
  
  try {
    // Validate the URL
    new URL(url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      },
      timeout: 10000
    });
    
    if (!response.ok) {
      throw new Error(\`HTTP error! status: \${response.status}\`);
    }
    
    const contentType = response.headers.get('content-type') || 'text/html';
    const data = await response.text();
    
    res.set('Content-Type', contentType);
    res.send(data);
    
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch URL', 
      message: error.message,
      url: url
    });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(\`\\n🚀 Meal Planner CORS Bridge running on port \${PORT}\`);
  console.log(\`📋 Health check: http://localhost:\${PORT}/health\`);
  console.log(\`🔗 Proxy endpoint: http://localhost:\${PORT}/proxy?url=<target-url>\`);
  console.log(\`\\n💡 Usage: Set your recipe import service to use this local bridge\`);
  console.log(\`   Example: http://localhost:\${PORT}/proxy?url=https://example.com/recipe\`);
  console.log('\\n✨ Ready to serve CORS requests!\\n');
});`,

      'README.md': `# Meal Planner CORS Bridge

A local CORS proxy server for Meal Planner Pro to bypass CORS restrictions when importing recipes from external websites.

## Features

- Local CORS proxy server
- No external dependencies for CORS bypassing
- Fast and reliable recipe importing
- Privacy-focused (requests stay on your network)

## Installation

1. Make sure you have Node.js installed (version 14 or higher)
2. Extract this zip file to a folder
3. Open a terminal/command prompt in the extracted folder
4. Run: \`npm install\`

## Usage

1. Start the bridge server:
   \`\`\`
   npm start
   \`\`\`

2. The server will start on port 3001 by default
3. You should see a message confirming the server is running
4. The bridge will now handle CORS requests for recipe imports

## Configuration

- **Port**: Set the PORT environment variable to change the default port
- **Network Access**: The server accepts connections from any origin by default

## Health Check

Visit \`http://localhost:3001/health\` to verify the server is running properly.

## Endpoints

- **GET /health** - Server health check
- **GET /proxy?url=<target-url>** - CORS proxy endpoint

## Troubleshooting

1. **Port in use**: If port 3001 is busy, set a different port:
   \`\`\`
   PORT=3002 npm start
   \`\`\`

2. **Permission issues**: On some systems, you may need to run as administrator

3. **Firewall**: Make sure your firewall allows the application to accept connections

## Security Note

This bridge is designed for local use only. Do not expose it to the internet without proper security measures.`,

      'start.bat': `@echo off
echo Starting Meal Planner CORS Bridge...
echo.
npm start
pause`,

      'start.sh': `#!/bin/bash
echo "Starting Meal Planner CORS Bridge..."
echo
npm start`,

      '.gitignore': `node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.env
.DS_Store`
    };

    // Create zip content (simple text-based approach for demonstration)
    let zipContent = 'PK\x03\x04'; // ZIP file signature
    
    // For a real implementation, you'd use a proper zip library
    // For now, we'll create a simple archive structure
    
    // Create a blob with installation instructions and download link
    const installationGuide = `# Meal Planner Desktop Bridge

## Quick Installation

1. Download and install Node.js from https://nodejs.org (if not already installed)
2. Create a new folder called "meal-planner-bridge"
3. Save the following files in that folder:

### package.json
\`\`\`json
${bridgeFiles['package.json']}
\`\`\`

### server.js
\`\`\`javascript
${bridgeFiles['server.js']}
\`\`\`

### README.md
\`\`\`markdown
${bridgeFiles['README.md']}
\`\`\`

## Installation Steps

1. Open a terminal/command prompt in the "meal-planner-bridge" folder
2. Run: \`npm install\`
3. Run: \`npm start\`
4. The bridge will start on http://localhost:3001

## Using with Meal Planner Pro

Once the bridge is running, Meal Planner Pro will automatically detect and use it for recipe imports, providing faster and more reliable CORS handling.

The bridge will show a message when it's ready to handle requests.`;

    // Create and download the installation guide
    const blob = new Blob([installationGuide], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'meal-planner-bridge-installation-guide.md';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    // Close settings menu
    state.showSettingsMenu.value = false;
    
    // Show a helpful message
    setTimeout(() => {
      alert('Desktop Bridge installation guide downloaded!\n\nThis guide contains all the files needed to set up your local CORS proxy. Follow the instructions in the downloaded file to install and run the bridge on your computer.');
    }, 100);
  }

  // Initialize dark mode on startup
  onMounted(() => {
    document.addEventListener('click', (event) => {
      const settingsDropdown = document.querySelector('.settings-dropdown');
      const isClickInside = settingsDropdown?.contains(event.target);

      if (!isClickInside && state.showSettingsMenu.value) {
        state.showSettingsMenu.value = false;
      }
    });

    document.body.classList.toggle('dark-mode', state.darkMode.value);
  });

  return {
    getDayName,
    resetRecipeForm,
    addIngredient,
    removeIngredient,
    saveRecipe,
    cancelRecipeEdit,
    editRecipe,
    viewRecipe,
    confirmDeleteRecipe,
    deleteRecipe,
    toggleDefault,
    assignRecipe,
    selectRecipeForMenu,
    clearDay,
    clearMenu,
    autoFillMenu,
    generateShoppingList,
    printShoppingList,
    emailShoppingList,
    fetchRecipeFromUrl: processFetchRecipeFromUrl,
    addItemModal,
    addItemToList,
    toggleItemCheck,
    confirmDeleteItem,
    toggleDarkMode,
    toggleSettingsMenu,
    changeWeekStartDay,
    changeNumberOfWeeks,
    getStartDayOptions,
    exportData,
    handleFileSelection,
    importData,
    downloadDesktopBridge
  };
}