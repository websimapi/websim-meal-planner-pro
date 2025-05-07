import { onMounted, watch } from 'vue';
import { saveToLocalStorage } from './storageService.js';
import { fetchRecipeFromUrl } from './recipeService.js';

export function setupMethods(state) {
  function getDayName(index) {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    return days[index];
  }
  
  function resetRecipeForm() {
    state.recipeForm.value = {
      title: '',
      description: '',
      ingredients: [{ amount: '', name: '', category: 'Produce' }],
      instructions: '',
      isDefault: false
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
      isDefault: state.recipeForm.value.isDefault
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
          if (day.recipe && day.recipe.id === recipeData.id) {
            day.recipe = recipeData;
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
      isDefault: recipe.isDefault
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
        if (day.recipe && day.recipe.id === recipeId) {
          day.recipe = null;
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
  
  function assignRecipe(weekIndex, dayIndex) {
    state.selectedDay.value = { week: weekIndex, day: dayIndex };
    state.selectorSearchTerm.value = '';
    state.showRecipeSelectorModal.value = true;
  }
  
  function selectRecipeForMenu(recipe) {
    state.menuWeeks.value[state.selectedDay.value.week][state.selectedDay.value.day].recipe = recipe;
    state.showRecipeSelectorModal.value = false;
    saveToLocalStorage(state);
  }
  
  function clearDay(weekIndex, dayIndex) {
    state.menuWeeks.value[weekIndex][dayIndex].recipe = null;
    saveToLocalStorage(state);
  }
  
  function clearMenu() {
    state.confirmTitle.value = 'Clear Menu';
    state.confirmMessage.value = 'Are you sure you want to clear the entire menu? This will remove all planned meals.';
    state.confirmAction.value = () => {
      state.menuWeeks.value = [
        Array(7).fill().map(() => ({ recipe: null })),
        Array(7).fill().map(() => ({ recipe: null }))
      ];
      saveToLocalStorage(state);
      state.showConfirmModal.value = false;
    };
    state.showConfirmModal.value = true;
  }
  
  function autoFillMenu() {
    // Filter default recipes
    const defaultRecipes = state.favorites.value.filter(r => r.isDefault);
    
    // Get non-default recipes for remaining slots
    const otherRecipes = state.favorites.value.filter(r => !r.isDefault);
    
    // Copy the current menu
    const newMenu = JSON.parse(JSON.stringify(state.menuWeeks.value));
    
    // First, place default recipes
    defaultRecipes.forEach(recipe => {
      // Find an empty slot
      let placed = false;
      
      for (let w = 0; w < newMenu.length && !placed; w++) {
        for (let d = 0; d < newMenu[w].length && !placed; d++) {
          if (!newMenu[w][d].recipe) {
            newMenu[w][d].recipe = recipe;
            placed = true;
          }
        }
      }
    });
    
    // Then, randomly fill remaining slots
    for (let w = 0; w < newMenu.length; w++) {
      for (let d = 0; d < newMenu[w].length; d++) {
        if (!newMenu[w][d].recipe && otherRecipes.length > 0) {
          // Pick a random recipe
          const randomIndex = Math.floor(Math.random() * otherRecipes.length);
          newMenu[w][d].recipe = otherRecipes[randomIndex];
          
          // Remove it from the array to avoid duplicates
          otherRecipes.splice(randomIndex, 1);
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
        if (day.recipe && day.recipe.ingredients) {
          day.recipe.ingredients.forEach(ingredient => {
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
                count: 1
              };
              
              itemMap[key] = item;
              allItems.push(item);
            }
          });
        }
      });
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
        isDefault: false
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
  
  return {
    getDayName,
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
    fetchRecipeFromUrl: processFetchRecipeFromUrl
  };
}