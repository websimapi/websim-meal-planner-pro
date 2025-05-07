/**
 * Fetches recipe data from a URL using multiple CORS proxies if needed
 * @param {string} url - The recipe URL to fetch from
 * @returns {Promise<Object>} - The parsed recipe object
 */
export async function fetchRecipeFromUrl(url) {
  // List of CORS proxies to try in order
  const corsProxies = [
    'https://cors-anywhere.herokuapp.com/',
    'https://api.allorigins.win/raw?url=',
    'https://thingproxy.freeboard.io/fetch/',
    'https://cors.zenscrape.com/?u=',
    'https://www.codepunker.com/get/cors?url='
  ];
  
  // Remove any existing protocol to avoid double protocol issues
  const cleanUrl = url.replace(/^(https?:\/\/)/, '');
  const targetUrl = `https://${cleanUrl}`;
  
  // Try each proxy until one works
  let html = null;
  let lastError = null;
  
  for (const proxy of corsProxies) {
    try {
      const proxyUrl = proxy + encodeURIComponent(targetUrl);
      const response = await fetch(proxyUrl);
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      html = await response.text();
      
      // If we got HTML, break out of the loop
      if (html && html.length > 0) {
        break;
      }
    } catch (error) {
      lastError = error;
      console.warn(`Proxy ${proxy} failed:`, error);
      // Continue to the next proxy
    }
  }
  
  if (!html) {
    throw new Error(lastError?.message || 'Failed to fetch recipe from URL using any proxy');
  }
  
  // Parse the HTML to extract recipe data
  return parseRecipeFromHtml(html, targetUrl);
}

/**
 * Parse HTML content to extract recipe information
 * @param {string} html - The HTML content to parse
 * @param {string} sourceUrl - The original URL for reference
 * @returns {Object} - The extracted recipe object
 */
function parseRecipeFromHtml(html, sourceUrl) {
  // Create a DOM parser
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  
  // First try to find structured data (JSON-LD)
  const structuredData = extractStructuredData(doc);
  if (structuredData) {
    return structuredData;
  }
  
  // Try to find recipe microdata
  const microdata = extractMicrodata(doc);
  if (microdata) {
    return microdata;
  }
  
  // Try common HTML patterns for recipes
  const commonPatterns = extractFromCommonPatterns(doc, sourceUrl);
  if (commonPatterns) {
    return commonPatterns;
  }
  
  // If all else fails, try to make a best guess
  return makeRecipeGuess(doc, sourceUrl);
}

/**
 * Extract structured data (JSON-LD) recipe information
 * @param {Document} doc - The parsed HTML document
 * @returns {Object|null} - The extracted recipe or null if not found
 */
function extractStructuredData(doc) {
  // Look for JSON-LD script tags
  const jsonLdScripts = doc.querySelectorAll('script[type="application/ld+json"]');
  
  for (const script of jsonLdScripts) {
    try {
      const data = JSON.parse(script.textContent);
      
      // Handle both direct Recipe objects and Graph arrays
      let recipes;
      
      if (Array.isArray(data)) {
        recipes = data.filter(item => item['@type'] === 'Recipe');
      } else if (data['@graph']) {
        recipes = data['@graph'].filter(item => item['@type'] === 'Recipe');
      } else if (data['@type'] === 'Recipe') {
        recipes = [data];
      } else if (data['@type'] && Array.isArray(data['@type']) && data['@type'].includes('Recipe')) {
        recipes = [data];
      }
      
      if (recipes && recipes.length > 0) {
        const recipe = recipes[0];
        
        return {
          title: recipe.name,
          description: recipe.description,
          ingredients: parseIngredients(recipe.recipeIngredient || recipe.ingredients),
          instructions: parseInstructions(recipe.recipeInstructions),
          source: recipe.author?.name || 'Unknown'
        };
      }
    } catch (e) {
      console.warn('Error parsing JSON-LD:', e);
    }
  }
  
  return null;
}

/**
 * Extract recipe microdata
 * @param {Document} doc - The parsed HTML document
 * @returns {Object|null} - The extracted recipe or null if not found
 */
function extractMicrodata(doc) {
  // Look for elements with itemtype="http://schema.org/Recipe"
  const recipeElement = doc.querySelector('[itemtype*="schema.org/Recipe"], [itemtype*="schema.org/recipe"]');
  
  if (recipeElement) {
    const title = recipeElement.querySelector('[itemprop="name"]')?.textContent.trim();
    const description = recipeElement.querySelector('[itemprop="description"]')?.textContent.trim();
    
    // Get ingredients
    const ingredientElements = recipeElement.querySelectorAll('[itemprop="recipeIngredient"], [itemprop="ingredients"]');
    const ingredients = Array.from(ingredientElements).map(el => el.textContent.trim());
    
    // Get instructions
    const instructionElements = recipeElement.querySelectorAll('[itemprop="recipeInstructions"]');
    let instructions = '';
    
    instructionElements.forEach(el => {
      if (el.tagName === 'OL' || el.tagName === 'UL') {
        const steps = Array.from(el.querySelectorAll('li')).map(li => li.textContent.trim());
        instructions += steps.join('\n');
      } else {
        instructions += el.textContent.trim() + '\n';
      }
    });
    
    return {
      title: title || 'Untitled Recipe',
      description: description || '',
      ingredients: parseIngredients(ingredients),
      instructions: instructions.trim(),
      source: doc.querySelector('[itemprop="author"]')?.textContent.trim() || 'Unknown'
    };
  }
  
  return null;
}

/**
 * Extract recipe from common HTML patterns
 * @param {Document} doc - The parsed HTML document
 * @param {string} sourceUrl - The original URL for reference
 * @returns {Object|null} - The extracted recipe or null if not found
 */
function extractFromCommonPatterns(doc, sourceUrl) {
  // Common recipe website patterns
  
  // Try to find title - common patterns
  let title = doc.querySelector('h1.recipe-title, h1.entry-title, h1.post-title, .recipe-summary h1')?.textContent.trim();
  if (!title) {
    // Try to find any h1 that might contain the title
    const h1s = doc.querySelectorAll('h1');
    for (const h1 of h1s) {
      if (h1.textContent.trim().length > 0) {
        title = h1.textContent.trim();
        break;
      }
    }
  }
  
  // Try to find description
  let description = doc.querySelector('.recipe-summary, .recipe-description, .entry-content p:first-of-type')?.textContent.trim();
  
  // Try to find ingredients
  let ingredientsList = [];
  
  // Common ingredient containers
  const ingredientSelectors = [
    '.recipe-ingredients li', 
    '.ingredients li', 
    '.ingredient-list li',
    '.recipe-ingred_txt',
    '.ingredient-item',
    '[id*="ingredient"] li',
    '.wprm-recipe-ingredient',
    '.tasty-recipe-ingredients li'
  ];
  
  for (const selector of ingredientSelectors) {
    const elements = doc.querySelectorAll(selector);
    if (elements.length > 0) {
      ingredientsList = Array.from(elements).map(el => el.textContent.trim());
      break;
    }
  }
  
  // Try to find instructions
  let instructions = '';
  
  // Common instruction containers
  const instructionSelectors = [
    '.recipe-directions li', 
    '.recipe-instructions li', 
    '.preparation-steps li',
    '.directions li',
    '.recipe-method li',
    '.wprm-recipe-instruction',
    '.tasty-recipe-instructions li'
  ];
  
  for (const selector of instructionSelectors) {
    const elements = doc.querySelectorAll(selector);
    if (elements.length > 0) {
      instructions = Array.from(elements)
        .map((el, index) => `${index + 1}. ${el.textContent.trim()}`)
        .join('\n');
      break;
    }
  }
  
  if (title && (ingredientsList.length > 0 || instructions)) {
    return {
      title: title,
      description: description || '',
      ingredients: parseIngredients(ingredientsList),
      instructions: instructions,
      source: new URL(sourceUrl).hostname
    };
  }
  
  return null;
}

/**
 * Make a best guess at recipe data when structured data can't be found
 * @param {Document} doc - The parsed HTML document
 * @param {string} sourceUrl - The original URL for reference
 * @returns {Object} - The extracted recipe object
 */
function makeRecipeGuess(doc, sourceUrl) {
  // Get title from the document title or first h1
  const urlObj = new URL(sourceUrl);
  let title = doc.title.replace(/recipe/i, '').trim();
  
  if (!title || title.includes('|') || title.length > 60) {
    // Try to get a cleaner title
    title = doc.querySelector('h1')?.textContent.trim() || 
            urlObj.pathname.split('/').filter(p => p).pop()?.replace(/-/g, ' ') || 
            'Recipe from ' + urlObj.hostname;
  }
  
  // Look for possible ingredient lists (unordered or ordered lists)
  const lists = doc.querySelectorAll('ul, ol');
  let ingredientsList = [];
  
  // Find the list most likely to be ingredients (containing common cooking measurements)
  const measurementTerms = ['cup', 'tablespoon', 'teaspoon', 'tbsp', 'tsp', 'oz', 'ounce', 'pound', 'lb', 'gram', 'g'];
  
  for (const list of lists) {
    const items = Array.from(list.querySelectorAll('li')).map(li => li.textContent.trim());
    const measurementCount = items.filter(item => 
      measurementTerms.some(term => item.toLowerCase().includes(term))
    ).length;
    
    // If at least 25% of items contain measurements, consider it an ingredient list
    if (items.length > 0 && measurementCount / items.length >= 0.25) {
      ingredientsList = items;
      break;
    }
  }
  
  // For instructions, look for ordered lists after the ingredient list
  let instructions = '';
  if (ingredientsList.length > 0) {
    const parentElement = ingredientsList[0]?.parentElement;
    if (parentElement) {
      const nextOL = parentElement.nextElementSibling?.querySelector('ol') || 
                    doc.querySelector('ol');
      
      if (nextOL) {
        instructions = Array.from(nextOL.querySelectorAll('li'))
          .map((el, index) => `${index + 1}. ${el.textContent.trim()}`)
          .join('\n');
      }
    }
  }
  
  return {
    title: title,
    description: 'Recipe imported from ' + urlObj.hostname,
    ingredients: parseIngredients(ingredientsList),
    instructions: instructions || 'Instructions could not be automatically extracted. Please add them manually.',
    source: urlObj.hostname
  };
}

/**
 * Parse an array of ingredient strings into structured ingredient objects
 * @param {string[]} ingredients - Array of ingredient strings
 * @returns {Object[]} - Array of structured ingredient objects
 */
function parseIngredients(ingredients) {
  if (!ingredients || ingredients.length === 0) {
    return [];
  }
  
  return ingredients.map(ingredient => {
    if (typeof ingredient !== 'string') {
      return { amount: '', name: JSON.stringify(ingredient), category: 'Other' };
    }
    
    ingredient = ingredient.trim();
    
    // Try to extract amount and ingredient name
    const amountMatch = ingredient.match(/^([\d¼½¾⅓⅔⅛⅜⅝⅞\/\.\s-]+)(?:\s+)(.*)/);
    
    if (amountMatch) {
      const amount = amountMatch[1].trim();
      const name = amountMatch[2].trim();
      
      // Try to determine category
      const category = determineCategory(name);
      
      return { amount, name, category };
    } else {
      return { amount: '', name: ingredient, category: determineCategory(ingredient) };
    }
  });
}

/**
 * Determine the ingredient category based on the ingredient name
 * @param {string} ingredient - The ingredient name
 * @returns {string} - The category name
 */
function determineCategory(ingredient) {
  ingredient = ingredient.toLowerCase();
  
  const categories = {
    'Produce': ['vegetable', 'fruit', 'onion', 'garlic', 'potato', 'tomato', 'carrot', 'lettuce', 'spinach', 'apple', 'banana', 'berry', 'lemon', 'lime', 'herb', 'cilantro', 'parsley', 'basil'],
    'Meat & Seafood': ['meat', 'beef', 'chicken', 'pork', 'lamb', 'steak', 'fish', 'seafood', 'shrimp', 'salmon', 'tuna', 'bacon', 'sausage', 'ground'],
    'Dairy': ['milk', 'cheese', 'butter', 'cream', 'yogurt', 'sour cream', 'cottage cheese', 'mozzarella', 'cheddar', 'parmesan', 'egg'],
    'Pantry': ['salt', 'pepper', 'oil', 'vinegar', 'spice', 'sugar', 'flour', 'rice', 'pasta', 'sauce', 'canned', 'broth', 'stock', 'honey', 'syrup', 'soy sauce', 'condiment'],
    'Frozen': ['frozen', 'ice cream'],
    'Bakery': ['bread', 'roll', 'bun', 'bagel', 'cake', 'cookie', 'pastry', 'pie']
  };
  
  for (const [category, keywords] of Object.entries(categories)) {
    if (keywords.some(keyword => ingredient.includes(keyword))) {
      return category;
    }
  }
  
  return 'Other';
}

/**
 * Parse instructions from various formats into a string
 * @param {Array|Object|string} instructions - The instructions from structured data
 * @returns {string} - Formatted instructions as a string
 */
function parseInstructions(instructions) {
  if (!instructions) {
    return '';
  }
  
  // Handle string
  if (typeof instructions === 'string') {
    return instructions;
  }
  
  // Handle array of strings
  if (Array.isArray(instructions) && typeof instructions[0] === 'string') {
    return instructions.map((step, i) => `${i + 1}. ${step}`).join('\n');
  }
  
  // Handle array of objects (HowToStep)
  if (Array.isArray(instructions) && typeof instructions[0] === 'object') {
    return instructions
      .map((step, i) => `${i + 1}. ${step.text || step.itemListElement?.text || step.name || ''}`)
      .filter(step => step.length > 3) // Filter out empty steps
      .join('\n');
  }
  
  // If we can't determine the format, stringify it
  return JSON.stringify(instructions);
}