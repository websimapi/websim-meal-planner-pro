import { createApp, ref, computed, watch, onMounted } from 'vue';

createApp({
  setup() {
    // State
    const activeTab = ref('menu');
    const favorites = ref([]);
    const menuWeeks = ref([
      Array(7).fill().map(() => ({ recipe: null })),
      Array(7).fill().map(() => ({ recipe: null }))
    ]);
    const shoppingItems = ref([]);
    
    // Recipe form
    const recipeForm = ref({
      title: '',
      description: '',
      ingredients: [{ amount: '', name: '', category: 'Produce' }],
      steps: '',
      isDefault: false
    });
    
    // Search and filters
    const searchTerm = ref('');
    const selectorSearchTerm = ref('');
    
    // Modals control
    const showAddRecipeModal = ref(false);
    const showAddFromUrlModal = ref(false);
    const showViewRecipeModal = ref(false);
    const showRecipeSelectorModal = ref(false);
    const showConfirmModal = ref(false);
    
    // URL import
    const recipeUrl = ref('');
    const urlError = ref('');
    
    // Selected items for operations
    const selectedRecipe = ref({});
    const selectedDay = ref({ week: 0, day: 0 });
    
    // Confirmation modal
    const confirmAction = ref(() => {});
    const confirmTitle = ref('');
    const confirmMessage = ref('');
    
    // Editing state
    const editingRecipe = ref(false);
    
    // Computed properties
    const filteredFavorites = computed(() => {
      if (!searchTerm.value) return favorites.value;
      
      const term = searchTerm.value.toLowerCase();
      return favorites.value.filter(recipe => {
        return recipe.title.toLowerCase().includes(term) || 
               recipe.description.toLowerCase().includes(term);
      });
    });
    
    const filteredSelectorFavorites = computed(() => {
      if (!selectorSearchTerm.value) return favorites.value;
      
      const term = selectorSearchTerm.value.toLowerCase();
      return favorites.value.filter(recipe => {
        return recipe.title.toLowerCase().includes(term) || 
               recipe.description.toLowerCase().includes(term);
      });
    });
    
    const groupedShoppingItems = computed(() => {
      const grouped = {};
      
      shoppingItems.value.forEach(item => {
        if (!grouped[item.category]) {
          grouped[item.category] = [];
        }
        grouped[item.category].push(item);
      });
      
      return grouped;
    });
    
    // Methods
    function getDayName(index) {
      const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      return days[index];
    }
    
    function resetRecipeForm() {
      recipeForm.value = {
        title: '',
        description: '',
        ingredients: [{ amount: '', name: '', category: 'Produce' }],
        steps: '',
        isDefault: false
      };
      editingRecipe.value = false;
    }
    
    function addIngredient() {
      recipeForm.value.ingredients.push({ amount: '', name: '', category: 'Produce' });
    }
    
    function removeIngredient(index) {
      recipeForm.value.ingredients.splice(index, 1);
      if (recipeForm.value.ingredients.length === 0) {
        addIngredient();
      }
    }
    
    function saveRecipe() {
      // Validate form
      if (!recipeForm.value.title.trim()) {
        alert('Recipe title is required');
        return;
      }
      
      if (!recipeForm.value.ingredients.every(i => i.name.trim())) {
        alert('All ingredients must have a name');
        return;
      }
      
      if (!recipeForm.value.steps.trim()) {
        alert('Preparation steps are required');
        return;
      }
      
      const recipeData = {
        id: editingRecipe.value ? selectedRecipe.value.id : Date.now().toString(),
        title: recipeForm.value.title.trim(),
        description: recipeForm.value.description.trim(),
        ingredients: recipeForm.value.ingredients.filter(i => i.name.trim()),
        steps: recipeForm.value.steps.trim(),
        isDefault: recipeForm.value.isDefault
      };
      
      if (editingRecipe.value) {
        // Update existing recipe
        const index = favorites.value.findIndex(r => r.id === recipeData.id);
        if (index !== -1) {
          favorites.value[index] = recipeData;
        }
        
        // Update any menu items using this recipe
        menuWeeks.value.forEach(week => {
          week.forEach(day => {
            if (day.recipe && day.recipe.id === recipeData.id) {
              day.recipe = recipeData;
            }
          });
        });
      } else {
        // Add new recipe
        favorites.value.push(recipeData);
      }
      
      // Save to local storage
      saveToLocalStorage();
      
      // Close modal
      showAddRecipeModal.value = false;
      resetRecipeForm();
    }
    
    function cancelRecipeEdit() {
      showAddRecipeModal.value = false;
      resetRecipeForm();
    }
    
    function editRecipe(recipe) {
      selectedRecipe.value = recipe;
      recipeForm.value = {
        title: recipe.title,
        description: recipe.description,
        ingredients: [...recipe.ingredients],
        steps: recipe.steps,
        isDefault: recipe.isDefault
      };
      editingRecipe.value = true;
      showAddRecipeModal.value = true;
      showViewRecipeModal.value = false;
    }
    
    function viewRecipe(recipe) {
      selectedRecipe.value = recipe;
      showViewRecipeModal.value = true;
    }
    
    function confirmDeleteRecipe(recipe) {
      selectedRecipe.value = recipe;
      confirmTitle.value = 'Delete Recipe';
      confirmMessage.value = `Are you sure you want to delete "${recipe.title}"? This cannot be undone.`;
      confirmAction.value = deleteRecipe;
      showConfirmModal.value = true;
    }
    
    function deleteRecipe() {
      const recipeId = selectedRecipe.value.id;
      
      // Remove from favorites
      favorites.value = favorites.value.filter(r => r.id !== recipeId);
      
      // Remove from menu
      menuWeeks.value.forEach(week => {
        week.forEach(day => {
          if (day.recipe && day.recipe.id === recipeId) {
            day.recipe = null;
          }
        });
      });
      
      // Save to local storage
      saveToLocalStorage();
      
      // Close modal
      showConfirmModal.value = false;
    }
    
    function toggleDefault(recipe) {
      recipe.isDefault = !recipe.isDefault;
      saveToLocalStorage();
    }
    
    function assignRecipe(weekIndex, dayIndex) {
      selectedDay.value = { week: weekIndex, day: dayIndex };
      selectorSearchTerm.value = '';
      showRecipeSelectorModal.value = true;
    }
    
    function selectRecipeForMenu(recipe) {
      menuWeeks.value[selectedDay.value.week][selectedDay.value.day].recipe = recipe;
      showRecipeSelectorModal.value = false;
      saveToLocalStorage();
    }
    
    function clearDay(weekIndex, dayIndex) {
      menuWeeks.value[weekIndex][dayIndex].recipe = null;
      saveToLocalStorage();
    }
    
    function clearMenu() {
      confirmTitle.value = 'Clear Menu';
      confirmMessage.value = 'Are you sure you want to clear the entire menu? This will remove all planned meals.';
      confirmAction.value = () => {
        menuWeeks.value = [
          Array(7).fill().map(() => ({ recipe: null })),
          Array(7).fill().map(() => ({ recipe: null }))
        ];
        saveToLocalStorage();
        showConfirmModal.value = false;
      };
      showConfirmModal.value = true;
    }
    
    function autoFillMenu() {
      // Filter default recipes
      const defaultRecipes = favorites.value.filter(r => r.isDefault);
      
      // Get non-default recipes for remaining slots
      const otherRecipes = favorites.value.filter(r => !r.isDefault);
      
      // Copy the current menu
      const newMenu = JSON.parse(JSON.stringify(menuWeeks.value));
      
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
      
      menuWeeks.value = newMenu;
      saveToLocalStorage();
    }
    
    function generateShoppingList() {
      const allItems = [];
      const itemMap = {};
      
      // Get all recipes from the menu
      menuWeeks.value.forEach(week => {
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
      
      shoppingItems.value = allItems;
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
      for (const [category, items] of Object.entries(groupedShoppingItems.value)) {
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
      
      for (const [category, items] of Object.entries(groupedShoppingItems.value)) {
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
    
    function fetchRecipeFromUrl() {
      if (!recipeUrl.value) {
        urlError.value = "Please enter a valid URL";
        return;
      }
      
      urlError.value = "";
      
      // In a real app, we would make a server call to parse the recipe
      // For this demo, we'll simulate the process with a timeout
      
      setTimeout(() => {
        try {
          // Create a sample recipe based on the URL
          const urlObj = new URL(recipeUrl.value);
          const domain = urlObj.hostname.replace('www.', '');
          
          const newRecipe = {
            title: `Recipe from ${domain}`,
            description: `Imported from ${recipeUrl.value}`,
            ingredients: [
              { amount: '2 cups', name: 'Sample Ingredient 1', category: 'Produce' },
              { amount: '1 tbsp', name: 'Sample Ingredient 2', category: 'Pantry' },
              { amount: '3', name: 'Sample Ingredient 3', category: 'Dairy' }
            ],
            steps: 'These are placeholder instructions for the imported recipe.\n\nIn a real application, we would extract the actual recipe content from the provided URL.'
          };
          
          // Copy to the form for editing
          recipeForm.value = {
            title: newRecipe.title,
            description: newRecipe.description,
            ingredients: [...newRecipe.ingredients],
            steps: newRecipe.steps,
            isDefault: false
          };
          
          // Show the edit form
          showAddFromUrlModal.value = false;
          showAddRecipeModal.value = true;
          editingRecipe.value = false;
          
          // Clear the URL
          recipeUrl.value = '';
          
        } catch (error) {
          urlError.value = "Could not process this URL. Please check it and try again.";
        }
      }, 1000);
    }
    
    // Local storage functions
    function saveToLocalStorage() {
      localStorage.setItem('meal-planner-favorites', JSON.stringify(favorites.value));
      localStorage.setItem('meal-planner-menu', JSON.stringify(menuWeeks.value));
    }
    
    function loadFromLocalStorage() {
      const savedFavorites = localStorage.getItem('meal-planner-favorites');
      const savedMenu = localStorage.getItem('meal-planner-menu');
      
      if (savedFavorites) {
        favorites.value = JSON.parse(savedFavorites);
      } else {
        // Add some default recipes for first-time users
        favorites.value = getSampleRecipes();
      }
      
      if (savedMenu) {
        menuWeeks.value = JSON.parse(savedMenu);
      }
    }
    
    function getSampleRecipes() {
      return [
        {
          id: '1',
          title: 'Spaghetti Bolognese',
          description: 'Classic Italian pasta with rich meat sauce',
          ingredients: [
            { amount: '1 lb', name: 'Ground beef', category: 'Meat & Seafood' },
            { amount: '1', name: 'Onion, diced', category: 'Produce' },
            { amount: '2 cloves', name: 'Garlic, minced', category: 'Produce' },
            { amount: '1 can (14 oz)', name: 'Crushed tomatoes', category: 'Pantry' },
            { amount: '2 tbsp', name: 'Tomato paste', category: 'Pantry' },
            { amount: '1 tsp', name: 'Dried oregano', category: 'Pantry' },
            { amount: '1 tsp', name: 'Dried basil', category: 'Pantry' },
            { amount: '1 lb', name: 'Spaghetti', category: 'Pantry' },
            { amount: '1/4 cup', name: 'Parmesan cheese, grated', category: 'Dairy' }
          ],
          steps: '1. Brown the ground beef in a large pan over medium heat.\n2. Add onions and garlic, cook until softened.\n3. Stir in crushed tomatoes, tomato paste, and herbs.\n4. Simmer for 20 minutes, stirring occasionally.\n5. Meanwhile, cook spaghetti according to package directions.\n6. Drain pasta and serve topped with sauce and grated Parmesan.',
          isDefault: true
        },
        {
          id: '2',
          title: 'Chicken Stir Fry',
          description: 'Quick and healthy weeknight dinner with vegetables',
          ingredients: [
            { amount: '1 lb', name: 'Chicken breast, sliced', category: 'Meat & Seafood' },
            { amount: '2 cups', name: 'Mixed vegetables', category: 'Frozen' },
            { amount: '3 tbsp', name: 'Soy sauce', category: 'Pantry' },
            { amount: '1 tbsp', name: 'Honey', category: 'Pantry' },
            { amount: '2 cloves', name: 'Garlic, minced', category: 'Produce' },
            { amount: '1 tbsp', name: 'Ginger, grated', category: 'Produce' },
            { amount: '2 cups', name: 'Rice, cooked', category: 'Pantry' }
          ],
          steps: '1. Cook rice according to package directions.\n2. Heat oil in a wok or large skillet over high heat.\n3. Add chicken and stir fry until cooked through, about 5-6 minutes.\n4. Add vegetables, garlic, and ginger, stir fry for 3-4 minutes.\n5. Mix soy sauce and honey, then add to the pan.\n6. Stir to coat everything evenly and cook for another minute.\n7. Serve over cooked rice.',
          isDefault: false
        },
        {
          id: '3',
          title: 'Greek Salad',
          description: 'Fresh Mediterranean salad with feta cheese',
          ingredients: [
            { amount: '1', name: 'Cucumber, diced', category: 'Produce' },
            { amount: '2', name: 'Tomatoes, diced', category: 'Produce' },
            { amount: '1', name: 'Red onion, thinly sliced', category: 'Produce' },
            { amount: '1 cup', name: 'Feta cheese, crumbled', category: 'Dairy' },
            { amount: '1/2 cup', name: 'Kalamata olives', category: 'Pantry' },
            { amount: '3 tbsp', name: 'Olive oil', category: 'Pantry' },
            { amount: '2 tbsp', name: 'Red wine vinegar', category: 'Pantry' },
            { amount: '1 tsp', name: 'Dried oregano', category: 'Pantry' }
          ],
          steps: '1. Combine cucumber, tomatoes, and red onion in a large bowl.\n2. Add olives and crumbled feta cheese.\n3. In a small bowl, whisk together olive oil, red wine vinegar, and oregano.\n4. Pour dressing over salad and toss gently to combine.\n5. Serve immediately or refrigerate for up to 1 hour before serving.',
          isDefault: false
        }
      ];
    }
    
    // Load data on start
    onMounted(() => {
      loadFromLocalStorage();
      
      // Generate initial shopping list
      generateShoppingList();
    });
    
    return {
      // State
      activeTab,
      favorites,
      menuWeeks,
      shoppingItems,
      recipeForm,
      searchTerm,
      selectorSearchTerm,
      
      // Modals
      showAddRecipeModal,
      showAddFromUrlModal,
      showViewRecipeModal,
      showRecipeSelectorModal,
      showConfirmModal,
      
      // URL import
      recipeUrl,
      urlError,
      
      // Selected items
      selectedRecipe,
      selectedDay,
      
      // Confirmation
      confirmAction,
      confirmTitle,
      confirmMessage,
      
      // Editing state
      editingRecipe,
      
      // Computed
      filteredFavorites,
      filteredSelectorFavorites,
      groupedShoppingItems,
      
      // Methods
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
      fetchRecipeFromUrl
    };
  }
}).mount('#app');

