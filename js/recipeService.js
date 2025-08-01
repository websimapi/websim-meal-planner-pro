/**
 * Fetches recipe data from a URL using multiple CORS proxies if needed
 * @param {string} url - The recipe URL to fetch from
 * @returns {Promise<Object>} - The parsed recipe object
 */
export async function fetchRecipeFromUrl(url) {
  // Check if local bridge is available first
  const localBridgeUrls = [
    'http://localhost:3001/proxy?url=',
    'http://127.0.0.1:3001/proxy?url=',
    'http://192.168.1.100:3001/proxy?url=', // Common local IP - user can modify
    'http://192.168.0.100:3001/proxy?url='  // Common local IP - user can modify
  ];

  // Test local bridge availability first
  let workingLocalBridge = null;
  console.log('🔍 Checking for local Desktop Bridge...');
  
  for (const bridgeUrl of localBridgeUrls) {
    try {
      const healthCheck = bridgeUrl.replace('/proxy?url=', '/health');
      const controller = new AbortController();
      setTimeout(() => controller.abort(), 1000); // Quick health check
      
      const response = await fetch(healthCheck, {
        signal: controller.signal,
        method: 'GET'
      });
      
      if (response.ok) {
        const health = await response.json();
        if (health.status === 'ok') {
          workingLocalBridge = bridgeUrl;
          console.log('✅ Local Desktop Bridge detected and ready:', bridgeUrl);
          break;
        }
      }
    } catch (error) {
      // Bridge not available at this URL, continue checking
    }
  }
  
  if (!workingLocalBridge) {
    console.log('⚠️ No local Desktop Bridge found, will use external proxies');
  }

  // List of external CORS proxies to try as fallback
  const corsProxies = [
    'https://cors-anywhere.herokuapp.com/',
    'https://api.allorigins.win/raw?url=',
    'https://thingproxy.freeboard.io/fetch/',
    'https://cors.zenscrape.com/?u=',
    'https://www.codepunker.com/get/cors?url='
  ];

  // Prioritize local bridge if available
  const allProxies = workingLocalBridge 
    ? [workingLocalBridge, ...corsProxies]
    : [...localBridgeUrls, ...corsProxies];
  
  // Remove any existing protocol to avoid double protocol issues
  const cleanUrl = url.replace(/^(https?:\/\/)/, '');
  const targetUrl = `https://${cleanUrl}`;
  
  // Try each proxy until one works
  let html = null;
  let lastError = null;
  let usedLocalBridge = false;
  
  for (const proxy of allProxies) {
    try {
      const proxyUrl = proxy + encodeURIComponent(targetUrl);
      
      // Set shorter timeout for local bridge attempts
      const isLocalBridge = proxy.includes('localhost') || proxy.includes('127.0.0.1') || proxy.includes('192.168.');
      const timeout = isLocalBridge ? 5000 : 10000; // 5s for local, 10s for external
      
      console.log(`🌐 Attempting to fetch via ${isLocalBridge ? 'local bridge' : 'external proxy'}:`, proxy);
      
      const controller = new AbortController();
      setTimeout(() => controller.abort(), timeout);
      
      const response = await fetch(proxyUrl, {
        signal: controller.signal,
        headers: isLocalBridge ? {} : {
          'X-Requested-With': 'XMLHttpRequest'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      html = await response.text();
      
      // If we got HTML, break out of the loop
      if (html && html.length > 0) {
        if (isLocalBridge) {
          usedLocalBridge = true;
          console.log('✅ Successfully fetched recipe using local Desktop Bridge');
        } else {
          console.log('✅ Successfully fetched recipe using external proxy:', proxy);
        }
        break;
      }
    } catch (error) {
      lastError = error;
      const isLocalBridge = proxy.includes('localhost') || proxy.includes('127.0.0.1') || proxy.includes('192.168.');
      if (isLocalBridge) {
        console.log('❌ Local bridge failed:', error.message);
      } else {
        console.warn(`❌ External proxy ${proxy} failed:`, error.message);
      }
      // Continue to the next proxy
    }
  }
  
  if (!html) {
    const bridgeMessage = workingLocalBridge 
      ? '\n\nThe local Desktop Bridge was detected but failed to fetch the recipe. Please check the bridge logs.'
      : '\n\nTip: For faster and more reliable recipe imports, consider downloading and running the Desktop Bridge from the settings menu.';
    throw new Error((lastError?.message || 'Failed to fetch recipe from URL using any proxy') + bridgeMessage);
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
async function parseRecipeFromHtml(html, sourceUrl) {
  // First try to use LLM for parsing - most accurate method
  try {
    const llmParsedRecipe = await parseUsingLLM(html, sourceUrl);
    if (llmParsedRecipe) {
      return llmParsedRecipe;
    }
  } catch (error) {
    console.warn('LLM parsing failed:', error);
    // Continue with traditional parsing methods
  }
  
  // Create a DOM parser for traditional methods
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  
  // Try to find structured data (JSON-LD)
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
 * Use LLM to parse recipe from HTML
 * @param {string} html - The HTML content to parse
 * @param {string} sourceUrl - The original URL for reference
 * @returns {Object} - The parsed recipe object
 */
async function parseUsingLLM(html, sourceUrl) {
  try {
    // Limit HTML size to avoid overloading the LLM
    const truncatedHtml = html.length > 50000 ? html.substring(0, 50000) + '...' : html;
    
    // Create domain context from the URL
    const domain = new URL(sourceUrl).hostname;
    
    const completion = await websim.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `You are a specialized recipe extraction AI. Your task is to analyze HTML content from ${domain} and extract a complete recipe in a structured format. 
          
Respond directly with JSON, following this JSON schema, and no other text:
{
  "title": "Recipe title",
  "description": "Brief description of the recipe",
  "ingredients": [
    {
      "amount": "Quantity with units",
      "name": "Ingredient name",
      "category": "One of: Produce, Meat & Seafood, Dairy, Pantry, Frozen, Bakery, Other"
    }
  ],
  "instructions": "Full preparation steps, formatted with line breaks and numbers if available"
}

If you cannot find a complete recipe, provide as much information as you can extract, using empty strings for missing fields. Make an educated guess about ingredient categories based on food type.`
        },
        {
          role: "user",
          content: [
            { 
              type: "text", 
              text: `Extract the complete recipe from this HTML content from ${domain}:\n\n${truncatedHtml}`
            }
          ],
        }
      ],
      json: true
    });

    // Parse the JSON response
    let recipeData;
    try {
      recipeData = JSON.parse(completion.content);
    } catch (error) {
      console.error('Failed to parse LLM JSON response:', error);
      throw new Error('Failed to parse recipe format');
    }

    // Validate and transform the response
    if (!recipeData.title) {
      throw new Error('LLM failed to extract a valid recipe title');
    }

    // Make sure ingredients is an array with proper structure
    const ingredients = Array.isArray(recipeData.ingredients) 
      ? recipeData.ingredients.map(ing => ({
          amount: ing.amount || '',
          name: ing.name || 'Unknown ingredient',
          category: isValidCategory(ing.category) ? ing.category : determineCategory(ing.name)
        }))
      : [];

    return {
      title: recipeData.title,
      description: recipeData.description || `Recipe from ${domain}`,
      ingredients: ingredients,
      instructions: recipeData.instructions || '',
      source: domain
    };
  } catch (error) {
    console.error('LLM parsing error:', error);
    throw error;
  }
}

/**
 * Check if a category string is one of our valid categories
 * @param {string} category - The category to check
 * @returns {boolean} - Whether it's a valid category
 */
function isValidCategory(category) {
  const validCategories = [
    'Produce', 'Meat & Seafood', 'Dairy & Cold Food', 'Pantry', 'Frozen', 'Bakery', 'Other'
  ];
  return validCategories.includes(category);
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
    '.tasty-recipe-instructions li',
    '.instructions li',
    '.steps li',
    '.method li'
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
  
  // Also look for paragraphs that might contain instructions
  if (!instructions) {
    const instructionSections = doc.querySelectorAll('section, div');
    for (const section of instructionSections) {
      const heading = section.querySelector('h2, h3, h4');
      if (heading && /instructions|directions|method|preparation|steps/i.test(heading.textContent)) {
        const paragraphs = section.querySelectorAll('p');
        if (paragraphs.length > 0) {
          instructions = Array.from(paragraphs)
            .map((p, index) => `${index + 1}. ${p.textContent.trim()}`)
            .join('\n');
          break;
        }
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
    'Dairy & Cold Food': ['milk', 'cheese', 'butter', 'cream', 'yogurt', 'sour cream', 'cottage cheese', 'mozzarella', 'cheddar', 'parmesan', 'egg'],
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