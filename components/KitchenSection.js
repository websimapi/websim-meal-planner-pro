export const KitchenSection = {
  template: `
    <section v-if="activeTab === 'kitchen'" class="kitchen-section">
      <div class="section-header">
        <h2>Kitchen Inventory</h2>
        <div class="kitchen-actions">
          <button @click="addItemModal('kitchen')" class="primary-btn">
            <i class="bi bi-plus-lg"></i> Add Item
          </button>
        </div>
      </div>

      <div class="category-filters">
        <button 
          @click="kitchenCategoryFilter = 'All'" 
          :class="{ active: kitchenCategoryFilter === 'All' }">
          All
        </button>
        <button 
          v-for="category in kitchenCategories" 
          :key="category"
          @click="kitchenCategoryFilter = category" 
          :class="{ active: kitchenCategoryFilter === category }">
          {{ category }}
        </button>
      </div>

      <div class="checklist">
        <div v-if="Object.keys(groupedKitchenItems).length === 0" class="empty-state">
          <i class="bi bi-cup-hot"></i>
          <p v-if="kitchenCategoryFilter !== 'All'">No items found in this category</p>
          <p v-else>Your kitchen inventory is empty. Add items to keep track of what you have in stock.</p>
        </div>
        <div v-else class="checklist-grid">
          <div v-for="(items, category) in groupedKitchenItems" :key="category" class="category">
            <h3>{{ category }}</h3>
            <ul class="item-list">
              <li v-for="item in items" :key="item.id" class="checklist-item">
                <label :for="'kitchen-'+item.id">
                  <input type="checkbox" v-model="item.checked" :id="'kitchen-'+item.id" @change="toggleItemCheck(item, 'kitchen')">
                  <span :class="{ 'checked': item.checked }">{{ item.name }}</span>
                </label>
                <div class="item-actions">
                  <button @click="confirmDeleteItem(item, 'kitchen')" class="icon-btn">
                    <i class="bi bi-trash"></i>
                  </button>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  `
};

