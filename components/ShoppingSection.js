export const ShoppingSection = {
  template: `
    <section v-if="activeTab === 'shopping'" class="shopping-section">
      <div class="section-header">
        <h2>Shopping List</h2>
        <div class="shopping-actions">
          <button @click="generateShoppingList" class="primary-btn">
            <i class="bi bi-arrow-clockwise"></i> Refresh List
          </button>
          <button @click="printShoppingList" class="secondary-btn">
            <i class="bi bi-printer"></i> Print
          </button>
          <button @click="emailShoppingList" class="secondary-btn">
            <i class="bi bi-envelope"></i> Email
          </button>
        </div>
      </div>

      <div class="shopping-list">
        <div v-if="shoppingItems.length === 0" class="empty-state">
          <i class="bi bi-cart"></i>
          <p>Your shopping list is empty. Add meals to your menu to generate a shopping list.</p>
        </div>
        <div v-else class="ingredient-categories">
          <div v-for="(items, category) in groupedShoppingItems" :key="category" class="category">
            <h3>{{ category }}</h3>
            <ul class="ingredient-list">
              <li v-for="item in items" :key="item.id" class="ingredient-item">
                <label :for="'item-'+item.id">
                  <input type="checkbox" v-model="item.checked" :id="'item-'+item.id">
                  <span :class="{ 'checked': item.checked, 'kitchen-highlight': item.inKitchen }" 
                        :data-matched="item.inKitchen ? 'Found in kitchen: ' + item.matchedKeyword : ''">
                    {{ item.name }} - {{ item.amount }}
                  </span>
                </label>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  `
};

