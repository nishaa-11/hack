const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Gemini
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.warn('Backend warning: GEMINI_API_KEY is not set in environment.');
}
const genAI = new GoogleGenerativeAI(apiKey || 'uninitialized');
const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const model = genAI.getGenerativeModel({ model: modelName });

/**
 * Classifies an incoming issue title and description into the most applicable domain category
 * @param {string} title 
 * @param {string} description 
 * @param {Array} categories Array of available categories from DB
 * @returns {Promise<{category_id: string, ai_confidence: number}>}
 */
async function classifyIssue(title, description, categories) {
  if (!apiKey) return null;

  try {
    const categoriesJSON = JSON.stringify(
      categories.map(c => ({ id: c.id, name: c.name, default_authority: c.default_authority }))
    );

    const prompt = `You are an AI router for a smart city issue reporting platform. Evaluate the following report and classify it into one of the provided categories.
Your response MUST be a valid JSON object containing exactly two fields:
{
  "category_id": "uuid of chosen category",
  "ai_confidence": a float between 0.0 and 1.0 representing classification confidence
}

Available Categories: ${categoriesJSON}
Report Title: "${title || 'Untitled'}"
Report Description: "${description || 'No description provided.'}"

Return ONLY the raw JSON format string, nothing else.`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    // Clean up if the model wrapped it in markdown code blocks
    let cleanedText = text;
    if (cleanedText.startsWith('\`\`\`json')) {
      cleanedText = cleanedText.substring(7);
      if (cleanedText.endsWith('\`\`\`')) {
        cleanedText = cleanedText.substring(0, cleanedText.length - 3);
      }
    } else if (cleanedText.startsWith('\`\`\`')) {
      cleanedText = cleanedText.substring(3);
      if (cleanedText.endsWith('\`\`\`')) {
        cleanedText = cleanedText.substring(0, cleanedText.length - 3);
      }
    }

    const aiRes = JSON.parse(cleanedText.trim());
    return {
      category_id: aiRes.category_id,
      ai_confidence: aiRes.ai_confidence
    };
  } catch (err) {
    console.error('Gemini Classification Error:', err);
    return null;
  }
}

module.exports = {
  classifyIssue
};
