export function saveToLocalStorage(state) {
  localStorage.setItem('meal-planner-favorites', JSON.stringify(state.favorites.value));
  localStorage.setItem('meal-planner-menu', JSON.stringify(state.menuWeeks.value));
}

export function loadFromLocalStorage(state) {
  const savedFavorites = localStorage.getItem('meal-planner-favorites');
  const savedMenu = localStorage.getItem('meal-planner-menu');
  
  if (savedFavorites) {
    state.favorites.value = JSON.parse(savedFavorites);
  } else {
    // Add some default recipes for first-time users
    state.favorites.value = getSampleRecipes();
  }
  
  if (savedMenu) {
    state.menuWeeks.value = JSON.parse(savedMenu);
  }
}

export function getSampleRecipes() {
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
      instructions: '1. Brown the ground beef in a large pan over medium heat.\n2. Add onions and garlic, cook until softened.\n3. Stir in crushed tomatoes, tomato paste, and herbs.\n4. Simmer for 20 minutes, stirring occasionally.\n5. Meanwhile, cook spaghetti according to package directions.\n6. Drain pasta and serve topped with sauce and grated Parmesan.',
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
      instructions: '1. Cook rice according to package directions.\n2. Heat oil in a wok or large skillet over high heat.\n3. Add chicken and stir fry until cooked through, about 5-6 minutes.\n4. Add vegetables, garlic, and ginger, stir fry for 3-4 minutes.\n5. Mix soy sauce and honey, then add to the pan.\n6. Stir to coat everything evenly and cook for another minute.\n7. Serve over cooked rice.',
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
      instructions: '1. Combine cucumber, tomatoes, and red onion in a large bowl.\n2. Add olives and crumbled feta cheese.\n3. In a small bowl, whisk together olive oil, red wine vinegar, and oregano.\n4. Pour dressing over salad and toss gently to combine.\n5. Serve immediately or refrigerate for up to 1 hour before serving.',
      isDefault: false
    }
  ];
}