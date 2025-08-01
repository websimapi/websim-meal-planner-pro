export const HouseholdSection = {
  template: `
    <section v-if="activeTab === 'household'" class="household-section">
      <div class="section-header">
        <h2>Household Essentials</h2>
        <div class="household-actions">
          <button @click="addItemModal('household')" class="primary-btn">
            <i class="bi bi-plus-lg"></i> Add Item
          </button>
        </div>
      </div>

      <div class="checklist">
        <div v-if="householdEssentials.length === 0" class="empty-state">
          <i class="bi bi-house"></i>
          <p>Your household essentials list is empty. Add items to keep track of what you need.</p>
        </div>
        <div v-else class="checklist-grid">
          <div class="category">
            <h3>Essentials</h3>
            <ul class="item-list">
              <li v-for="item in householdEssentials" :key="item.id" class="checklist-item">
                <label :for="'household-'+item.id">
                  <input type="checkbox" v-model="item.checked" :id="'household-'+item.id" @change="toggleItemCheck(item, 'household')">
                  <span :class="{ 'checked': item.checked }">{{ item.name }}</span>
                </label>
                <div class="item-actions">
                  <button @click="confirmDeleteItem(item, 'household')" class="icon-btn">
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

