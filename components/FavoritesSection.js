export const FavoritesSection = {
  template: `
    <section v-if="activeTab === 'favorites'" class="favorites-section">
      <div class="section-header">
        <h2>Favorite Recipes</h2>
        <div class="favorites-actions">
          <button @click="showAddRecipeModal = true" class="primary-btn">
            <i class="bi bi-plus-lg"></i> Add Recipe
          </button>
          <button @click="showAddFromUrlModal = true" class="secondary-btn">
            <i class="bi bi-link-45deg"></i> Add from URL
          </button>
        </div>
      </div>

      <div class="category-filters">
        <button 
          @click="categoryFilter = 'All'" 
          :class="{ active: categoryFilter === 'All' }">
          All
        </button>
        <button 
          @click="defaultFilter = !defaultFilter" 
          :class="{ active: defaultFilter }">
          Default
        </button>
        <button 
          v-for="category in recipeCategories" 
          :key="category"
          @click="categoryFilter = category" 
          :class="{ active: categoryFilter === category }">
          {{ category }}
        </button>
      </div>

      <div class="search-container">
        <div class="search-box">
          <i class="bi bi-search"></i>
          <input type="text" v-model="searchTerm" placeholder="Search recipes...">
          <button v-if="searchTerm" @click="searchTerm = ''" class="icon-btn">
            <i class="bi bi-x"></i>
          </button>
        </div>
      </div>

      <div v-if="filteredFavorites.length === 0" class="empty-state">
        <i class="bi bi-heart"></i>
        <p v-if="searchTerm || categoryFilter !== 'All'">No recipes found matching your criteria</p>
        <p v-else>No favorite recipes yet. Add some recipes to get started!</p>
      </div>

      <div v-else class="favorites-grid">
        <div v-for="recipe in filteredFavorites" :key="recipe.id" class="recipe-card">
          <div class="recipe-header">
            <h3>{{ recipe.title }}</h3>
            <div class="recipe-badges">
              <span v-if="recipe.isDefault" class="badge default">Default</span>
              <span class="badge category">{{ recipe.category || 'Lunch/Dinner' }}</span>
            </div>
          </div>
          <p class="recipe-description">{{ recipe.description }}</p>
          <div class="recipe-actions">
            <button @click="viewRecipe(recipe)" class="secondary-btn">
              <i class="bi bi-eye"></i> View
            </button>
            <button @click="editRecipe(recipe)" class="secondary-btn">
              <i class="bi bi-pencil"></i> Edit
            </button>
            <button @click="toggleDefault(recipe)" class="icon-btn" :class="{ 'active': recipe.isDefault }">
              <i class="bi bi-star" v-if="!recipe.isDefault"></i>
              <i class="bi bi-star-fill" v-else></i>
            </button>
            <button @click="confirmDeleteRecipe(recipe)" class="icon-btn">
              <i class="bi bi-trash"></i>
            </button>
          </div>
        </div>
      </div>
    </section>
  `
};

