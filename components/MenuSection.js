export const MenuSection = {
  template: `
    <section v-if="activeTab === 'menu'" class="menu-section">
      <div class="section-header">
        <h2>Menu Planner</h2>
        <div class="menu-settings">
          <div class="menu-setting">
            <label for="week-start-day">Week Starts On:</label>
            <select id="week-start-day" v-model="weekStartDay" @change="changeWeekStartDay(weekStartDay)">
              <option v-for="option in getStartDayOptions()" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
          </div>
          <div class="menu-setting">
            <label for="number-of-weeks">Number of Weeks:</label>
            <select id="number-of-weeks" v-model="numberOfWeeks" @change="changeNumberOfWeeks(numberOfWeeks)">
              <option value="1">1 Week</option>
              <option value="2">2 Weeks</option>
              <option value="3">3 Weeks</option>
              <option value="4">4 Weeks</option>
            </select>
          </div>
        </div>
        <div class="menu-actions">
          <button @click="autoFillMenu" class="primary-btn">
            <i class="bi bi-magic"></i> Auto-Fill Menu
          </button>
          <button @click="clearMenu" class="secondary-btn">
            <i class="bi bi-trash"></i> Clear Menu
          </button>
        </div>
      </div>

      <div class="weeks-container">
        <div v-for="(week, weekIndex) in menuWeeks" :key="'week'+weekIndex" class="week">
          <h3>Week {{ weekIndex + 1 }}</h3>
          <div class="days">
            <div v-for="(day, dayIndex) in week" :key="'day'+dayIndex" class="day-card">
              <div class="day-header">
                <h4>{{ getDayName(dayIndex) }}</h4>
                <button @click="clearDay(weekIndex, dayIndex, 'breakfast'); clearDay(weekIndex, dayIndex, 'lunch'); clearDay(weekIndex, dayIndex, 'dinner')" class="icon-btn">
                  <i class="bi bi-x-circle"></i>
                </button>
              </div>
              
              <!-- Breakfast -->
              <div class="meal-container">
                <div class="meal-label">Breakfast:</div>
                <div class="meals">
                  <div v-if="day.breakfast" class="meal-assigned">
                    <div class="recipe-info">
                      <h5>{{ day.breakfast.title }}</h5>
                      <p v-if="day.breakfast.description" class="meal-description">{{ day.breakfast.description }}</p>
                    </div>
                    <div class="meal-actions">
                      <button @click="viewRecipe(day.breakfast)" class="icon-btn">
                        <i class="bi bi-eye"></i>
                      </button>
                      <button @click="clearDay(weekIndex, dayIndex, 'breakfast')" class="icon-btn">
                        <i class="bi bi-x"></i>
                      </button>
                    </div>
                  </div>
                  <div v-else class="add-meal">
                    <button @click="assignRecipe(weekIndex, dayIndex, 'breakfast')" class="small-btn">
                      <i class="bi bi-plus-circle"></i> Add Breakfast
                    </button>
                  </div>
                </div>
              </div>
              
              <!-- Lunch -->
              <div class="meal-container">
                <div class="meal-label">Lunch:</div>
                <div class="meals">
                  <div v-if="day.lunch" class="meal-assigned">
                    <div class="recipe-info">
                      <h5>{{ day.lunch.title }}</h5>
                      <p v-if="day.lunch.description" class="meal-description">{{ day.lunch.description }}</p>
                    </div>
                    <div class="meal-actions">
                      <button @click="viewRecipe(day.lunch)" class="icon-btn">
                        <i class="bi bi-eye"></i>
                      </button>
                      <button @click="clearDay(weekIndex, dayIndex, 'lunch')" class="icon-btn">
                        <i class="bi bi-x"></i>
                      </button>
                    </div>
                  </div>
                  <div v-else class="add-meal">
                    <button @click="assignRecipe(weekIndex, dayIndex, 'lunch')" class="small-btn">
                      <i class="bi bi-plus-circle"></i> Add Lunch
                    </button>
                  </div>
                </div>
              </div>
              
              <!-- Dinner -->
              <div class="meal-container">
                <div class="meal-label">Dinner:</div>
                <div class="meals">
                  <div v-if="day.dinner" class="meal-assigned">
                    <div class="recipe-info">
                      <h5>{{ day.dinner.title }}</h5>
                      <p v-if="day.dinner.description" class="meal-description">{{ day.dinner.description }}</p>
                    </div>
                    <div class="meal-actions">
                      <button @click="viewRecipe(day.dinner)" class="icon-btn">
                        <i class="bi bi-eye"></i>
                      </button>
                      <button @click="clearDay(weekIndex, dayIndex, 'dinner')" class="icon-btn">
                        <i class="bi bi-x"></i>
                      </button>
                    </div>
                  </div>
                  <div v-else class="add-meal">
                    <button @click="assignRecipe(weekIndex, dayIndex, 'dinner')" class="small-btn">
                      <i class="bi bi-plus-circle"></i> Add Dinner
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  `
};