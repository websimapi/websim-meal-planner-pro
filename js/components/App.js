import { ref, computed, watch } from 'vue';
import * as store from '../store.js';
import AppHeader from './AppHeader.js';
import MenuPlanner from './MenuPlanner.js';
import FavoritesList from './FavoritesList.js';
import ShoppingList from './ShoppingList.js';
import RecipeModal from './modals/RecipeModal.js';
import UrlImportModal from './modals/UrlImportModal.js';
import RecipeViewModal from './modals/RecipeViewModal.js';
import RecipeSelectorModal from './modals/RecipeSelectorModal.js';
import ConfirmModal from './modals/ConfirmModal.js';

export default {
  components: {
    AppHeader,
    MenuPlanner,
    FavoritesList,
    ShoppingList,
    RecipeModal,
    UrlImportModal,
    RecipeViewModal,
    RecipeSelectorModal,
    ConfirmModal,
  },
  setup() {
    // Expose store state and actions to template
    const currentRecipeForModal = ref(store.initialRecipeForm());
    const currentRecipeForView = ref({});

    const openAddRecipeModal = () => {
      currentRecipeForModal.value = store.initialRecipeForm();
      store.editingRecipe.value = false;
      store.showAddRecipeModal.value = true;
    };

    const openEditRecipeModal = (recipe) => {
      currentRecipeForModal.value = JSON.parse(JSON.stringify(recipe)); // Deep copy
      store.editingRecipe.value = true;
      store.showAddRecipeModal.value = true;
      store.showViewRecipeModal.value = false; // Close view modal if editing from there
    };
    
    const openViewRecipeModal = (recipe) => {
        currentRecipeForView.value = recipe;
        store.showViewRecipeModal.value = true;
    };

    const openRecipeSelectorModal = (weekIndex, dayIndex) => {
        store.selectedDay.value = { week: weekIndex, day: dayIndex };
        store.selectorSearchTerm.value = '';
        store.showRecipeSelectorModal.value = true;
    };
    
    const openConfirmModal = (title, message, action) => {
        store.confirmTitle.value = title;
        store.confirmMessage.value = message;
        store.confirmAction.value = () => {
            action();
            store.showConfirmModal.value = false;
        };
        store.showConfirmModal.value = true;
    };


    // Watch for changes in shopping list items to auto-update if needed
    watch(store.menuWeeks, () => {
        store.generateCurrentShoppingList();
    }, { deep: true });
     watch(store.favorites, () => { // if a recipe is deleted, it might affect shopping list
        store.generateCurrentShoppingList();
    }, { deep: true });


    return {
      store, // expose all of store
      currentRecipeForModal,
      currentRecipeForView,
      openAddRecipeModal,
      openEditRecipeModal,
      openViewRecipeModal,
      openRecipeSelectorModal,
      openConfirmModal,
    };
  },
  template: `
    <app-header 
        :active-tab="store.activeTab.value"
        @update:active-tab="tab => store.activeTab.value = tab"
    ></app-header>

    <main>
        <menu-planner 
            v-if="store.activeTab.value === 'menu'"
            @assign-recipe="({weekIndex, dayIndex}) => openRecipeSelectorModal(weekIndex, dayIndex)"
            @view-recipe="openViewRecipeModal"
            @clear-day="({weekIndex, dayIndex}) => store.clearDayFromMenu(weekIndex, dayIndex)"
            @clear-menu="() => openConfirmModal('Clear Menu', 'Are you sure you want to clear the entire menu?', store.clearFullMenu)"
            @auto-fill-menu="store.autoFillFullMenu"
        ></menu-planner>

        <favorites-list 
            v-if="store.activeTab.value === 'favorites'"
            @add-recipe="openAddRecipeModal"
            @add-from-url="() => store.showAddFromUrlModal.value = true"
            @view-recipe="openViewRecipeModal"
            @edit-recipe="openEditRecipeModal"
            @delete-recipe="(recipe) => openConfirmModal('Delete Recipe', 'Are you sure you want to delete \\' + recipe.title + '\\\'?', () => store.removeRecipe(recipe.id))"
        ></favorites-list>

        <shopping-list 
            v-if="store.activeTab.value === 'shopping'"
        ></shopping-list>
    </main>

    <recipe-modal
        v-if="store.showAddRecipeModal.value"
        :initial-recipe="currentRecipeForModal"
        :is-editing="store.editingRecipe.value"
        @close="store.showAddRecipeModal.value = false"
        @save="(recipe) => { store.addOrUpdateRecipe(recipe); store.showAddRecipeModal.value = false; }"
    ></recipe-modal>

    <url-import-modal
        v-if="store.showAddFromUrlModal.value"
        @close="store.showAddFromUrlModal.value = false"
        @imported="(recipeData) => { 
            currentRecipeForModal.value = recipeData; 
            store.editingRecipe.value = false;
            store.showAddRecipeModal.value = true;
            store.showAddFromUrlModal.value = false;
        }"
    ></url-import-modal>

    <recipe-view-modal
        v-if="store.showViewRecipeModal.value"
        :recipe="currentRecipeForView"
        @close="store.showViewRecipeModal.value = false"
        @edit-recipe="openEditRecipeModal"
    ></recipe-view-modal>

    <recipe-selector-modal
        v-if="store.showRecipeSelectorModal.value"
        @close="store.showRecipeSelectorModal.value = false"
        @select-recipe="(recipe) => { 
            store.assignRecipeToDay(recipe, store.selectedDay.value.week, store.selectedDay.value.day);
            store.showRecipeSelectorModal.value = false;
        }"
    ></recipe-selector-modal>

    <confirm-modal
        v-if="store.showConfirmModal.value"
        :title="store.confirmTitle.value"
        :message="store.confirmMessage.value"
        @close="store.showConfirmModal.value = false"
        @confirm="store.confirmAction.value"
    ></confirm-modal>
  `
}