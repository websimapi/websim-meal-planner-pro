import { ref, computed } from 'vue';

export function AppState() {
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
  const isLoading = ref(false);
  
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
  
  return {
    activeTab,
    favorites,
    menuWeeks,
    shoppingItems,
    recipeForm,
    searchTerm,
    selectorSearchTerm,
    showAddRecipeModal,
    showAddFromUrlModal,
    showViewRecipeModal,
    showRecipeSelectorModal,
    showConfirmModal,
    recipeUrl,
    urlError,
    isLoading,
    selectedRecipe,
    selectedDay,
    confirmAction,
    confirmTitle,
    confirmMessage,
    editingRecipe,
    filteredFavorites,
    filteredSelectorFavorites,
    groupedShoppingItems
  };
}