export const Modals = {
  template: `
    <div>
      <!-- Add Recipe Modal -->
      <div v-if="showAddRecipeModal" class="modal-overlay">
        <div class="modal recipe-modal">
          <div class="modal-header">
            <h2>{{ editingRecipe ? 'Edit Recipe' : 'Add New Recipe' }}</h2>
            <button @click="cancelRecipeEdit" class="icon-btn">
              <i class="bi bi-x-lg"></i>
            </button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label for="recipe-title">Recipe Title*</label>
              <input type="text" id="recipe-title" v-model="recipeForm.title" required>
            </div>
            <div class="form-group">
              <label for="recipe-description">Description</label>
              <textarea id="recipe-description" v-model="recipeForm.description" rows="2"></textarea>
            </div>
            <div class="form-group">
              <label for="recipe-category">Category*</label>
              <select id="recipe-category" v-model="recipeForm.category">
                <option v-for="category in recipeCategories" :key="category" :value="category">
                  {{ category }}
                </option>
              </select>
            </div>
            <div class="form-group">
              <div class="form-header">
                <label>Ingredients*</label>
                <button @click="addIngredient" class="small-btn">
                  <i class="bi bi-plus"></i> Add
                </button>
              </div>
              <div v-for="(ingredient, index) in recipeForm.ingredients" :key="index" class="ingredient-row">
                <input type="text" v-model="ingredient.amount" placeholder="Amount">
                <input type="text" v-model="ingredient.name" placeholder="Ingredient">
                <select v-model="ingredient.category">
                  <option value="Produce">Produce</option>
                  <option value="Meat & Seafood">Meat & Seafood</option>
                  <option value="Dairy">Dairy</option>
                  <option value="Pantry">Pantry</option>
                  <option value="Frozen">Frozen</option>
                  <option value="Bakery">Bakery</option>
                  <option value="Other">Other</option>
                </select>
                <button @click="removeIngredient(index)" class="icon-btn">
                  <i class="bi bi-trash"></i>
                </button>
              </div>
            </div>
            <div class="form-group">
              <label for="recipe-instructions">Instructions*</label>
              <textarea id="recipe-instructions" v-model="recipeForm.instructions" rows="6" required></textarea>
            </div>
            <div class="form-group checkbox">
              <input type="checkbox" id="recipe-default" v-model="recipeForm.isDefault">
              <label for="recipe-default">Mark as Default (always include in menu)</label>
            </div>
          </div>
          <div class="modal-footer">
            <button @click="cancelRecipeEdit" class="secondary-btn">Cancel</button>
            <button @click="saveRecipe" class="primary-btn">Save</button>
          </div>
        </div>
      </div>

      <!-- Add From URL Modal -->
      <div v-if="showAddFromUrlModal" class="modal-overlay">
        <div class="modal url-modal">
          <div class="modal-header">
            <h2>Add Recipe from URL</h2>
            <button @click="showAddFromUrlModal = false" class="icon-btn">
              <i class="bi bi-x-lg"></i>
            </button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label for="recipe-url">Recipe URL*</label>
              <input type="url" id="recipe-url" v-model="recipeUrl" placeholder="https://..." required>
            </div>
            <p class="note">
              <i class="bi bi-info-circle"></i> 
              Paste a URL from any recipe website. We'll try to automatically extract the recipe details.
            </p>
            <div v-if="isLoading" class="loading-indicator">
              <i class="bi bi-arrow-repeat spinning"></i>
              <span>Importing recipe, please wait...</span>
            </div>
            <div v-if="urlError" class="error-message">
              {{ urlError }}
            </div>
          </div>
          <div class="modal-footer">
            <button @click="showAddFromUrlModal = false" class="secondary-btn">Cancel</button>
            <button @click="fetchRecipeFromUrl" class="primary-btn" :disabled="isLoading">
              <i class="bi bi-cloud-download"></i> Import
            </button>
          </div>
        </div>
      </div>

      <!-- Recipe View Modal -->
      <div v-if="showViewRecipeModal" class="modal-overlay">
        <div class="modal view-recipe-modal">
          <div class="modal-header">
            <h2>{{ selectedRecipe.title }}</h2>
            <button @click="showViewRecipeModal = false" class="icon-btn">
              <i class="bi bi-x-lg"></i>
            </button>
          </div>
          <div class="modal-body">
            <div class="recipe-badges" style="margin-bottom: 1rem;">
              <span class="badge category">{{ selectedRecipe.category || 'Lunch/Dinner' }}</span>
              <span v-if="selectedRecipe.isDefault" class="badge default">Default</span>
            </div>
            
            <p v-if="selectedRecipe.description" class="recipe-description">{{ selectedRecipe.description }}</p>
            
            <h3>Ingredients</h3>
            <ul class="view-ingredients">
              <li v-for="(ingredient, index) in selectedRecipe.ingredients" :key="index">
                <span class="amount">{{ ingredient.amount }}</span> {{ ingredient.name }}
              </li>
            </ul>
            
            <h3>Instructions</h3>
            <div class="preparation-steps">
              {{ selectedRecipe.instructions }}
            </div>
          </div>
          <div class="modal-footer">
            <button @click="showViewRecipeModal = false" class="secondary-btn">Close</button>
            <button @click="editRecipe(selectedRecipe)" class="primary-btn">Edit</button>
          </div>
        </div>
      </div>

      <!-- Recipe Selector Modal -->
      <div v-if="showRecipeSelectorModal" class="modal-overlay">
        <div class="modal recipe-selector-modal">
          <div class="modal-header">
            <h2>Select a Recipe</h2>
            <button @click="showRecipeSelectorModal = false" class="icon-btn">
              <i class="bi bi-x-lg"></i>
            </button>
          </div>
          <div class="modal-body">
            <div class="search-box">
              <i class="bi bi-search"></i>
              <input type="text" v-model="selectorSearchTerm" placeholder="Search recipes...">
            </div>
            
            <div v-if="filteredSelectorFavorites.length === 0" class="empty-state">
              <p>No recipes found. Try a different search or add a new recipe.</p>
            </div>
            
            <div v-else class="selector-recipes">
              <div 
                v-for="recipe in filteredSelectorFavorites" 
                :key="recipe.id" 
                class="selector-recipe-item"
                @click="selectRecipeForMenu(recipe)"
              >
                <h4>{{ recipe.title }}</h4>
                <p v-if="recipe.description">{{ recipe.description }}</p>
                <div style="display: flex; gap: 0.5rem;">
                  <span v-if="recipe.isDefault" class="badge default">Default</span>
                  <span class="badge category">{{ recipe.category || 'Lunch/Dinner' }}</span>
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button @click="showRecipeSelectorModal = false" class="secondary-btn">Cancel</button>
            <button @click="showAddRecipeModal = true; showRecipeSelectorModal = false" class="primary-btn">
              <i class="bi bi-plus-lg"></i> New Recipe
            </button>
          </div>
        </div>
      </div>

      <!-- Add Item Modal -->
      <div v-if="showAddItemModal" class="modal-overlay">
        <div class="modal">
          <div class="modal-header">
            <h2>Add New Item</h2>
            <button @click="showAddItemModal = false" class="icon-btn">
              <i class="bi bi-x-lg"></i>
            </button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label for="item-name">Item Name*</label>
              <input type="text" id="item-name" v-model="newItemName" placeholder="Enter item name" required>
            </div>
            <div class="form-group" v-if="selectedList === 'kitchen'">
              <label for="item-category">Category*</label>
              <select id="item-category" v-model="newItemCategory">
                <option v-for="category in kitchenCategories" :key="category" :value="category">
                  {{ category }}
                </option>
              </select>
            </div>
          </div>
          <div class="modal-footer">
            <button @click="showAddItemModal = false" class="secondary-btn">Cancel</button>
            <button @click="addItemToList" class="primary-btn">Add Item</button>
          </div>
        </div>
      </div>

      <!-- Confirmation Modal -->
      <div v-if="showConfirmModal" class="modal-overlay">
        <div class="modal confirm-modal">
          <div class="modal-header">
            <h2>{{ confirmTitle }}</h2>
          </div>
          <div class="modal-body">
            <p>{{ confirmMessage }}</p>
          </div>
          <div class="modal-footer">
            <button @click="showConfirmModal = false" class="secondary-btn">Cancel</button>
            <button @click="confirmAction" class="primary-btn danger">Confirm</button>
          </div>
        </div>
      </div>

      <!-- Import Data Modal -->
      <div v-if="showImportModal" class="modal-overlay">
        <div class="modal">
          <div class="modal-header">
            <h2>Import Data</h2>
            <button @click="showImportModal = false" class="icon-btn">
              <i class="bi bi-x-lg"></i>
            </button>
          </div>
          <div class="modal-body">
            <div class="import-options">
              <p>Please select a JSON file to import your Meal Planner data.</p>
              <input type="file" id="import-file" accept=".json" ref="fileInput" @change="handleFileSelection" class="file-input">
              
              <div v-if="fileSelected">
                <h3>Import Options</h3>
                <div class="import-option">
                  <input type="radio" id="merge-option" v-model="importOption" value="merge">
                  <label for="merge-option">
                    <strong>Merge with existing data</strong>
                    <span class="option-description">Adds new items while keeping your existing data. Duplicates will be avoided.</span>
                  </label>
                </div>
                <div class="import-option">
                  <input type="radio" id="override-option" v-model="importOption" value="override">
                  <label for="override-option">
                    <strong>Override existing data</strong>
                    <span class="option-description">Replaces all your existing data with the imported data. This cannot be undone.</span>
                  </label>
                </div>
              </div>
              
              <div v-if="importError" class="error-message">
                {{ importError }}
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button @click="showImportModal = false" class="secondary-btn">Cancel</button>
            <button 
              @click="importData" 
              class="primary-btn" 
              :disabled="!fileSelected">
              Import
            </button>
          </div>
        </div>
      </div>
    </div>
  `
};