const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Gemini
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.warn('Backend warning: GEMINI_API_KEY is not set in environment.');
}
const genAI = new GoogleGenerativeAI(apiKey || 'uninitialized');
const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const model = genAI.getGenerativeModel({ model: modelName });

const civicImageSystemPrompt = `You are an advanced civic infrastructure and municipal maintenance analysis agent. Your sole responsibility is to analyze user-submitted images and determine if a civic or municipal issue is present.

CRITICAL INSTRUCTION: You must output your response strictly as a single, valid JSON object. Do not wrap the output in markdown formatting blocks (such as
\`\`\`json ... \`\`\`), do not output any introductory or explanatory text, and do not append conversational greetings. Your response must begin with '{' and end with '}'.

Analysis Rules:
1. If the image accurately displays a municipal issue (e.g., a pothole, broken streetlamp, overflowing garbage, or burst water pipe), flag it as a valid civic issue and determine the best matching municipal department category.
2. If the image is unrelated to public civic infrastructure (e.g., a picture of food, a dessert plate, an indoor selfie, animals, or general household objects), you must still return valid JSON, but set "is_valid_civic_issue" to false and set the category to "Invalid".

JSON Output Schema:
{
  "is_valid_civic_issue": true/false,
  "category": "Pothole" | "Streetlight Fault" | "Garbage Dumping" | "Sewage Overflow" | "Water Leakage" | "Invalid",
  "confidence_score": 0.0 to 1.0,
  "analysis_summary": "A clear, concise description of what is visible in the photo and why it was classified this way."
}`;

function cleanJsonText(text) {
  let cleanedText = text.trim();

  if (cleanedText.startsWith('```json')) {
    cleanedText = cleanedText.substring(7);
  } else if (cleanedText.startsWith('```')) {
    cleanedText = cleanedText.substring(3);
  }

  if (cleanedText.endsWith('```')) {
    cleanedText = cleanedText.substring(0, cleanedText.length - 3);
  }

  return cleanedText.trim();
}

/**
 * Classifies an incoming issue title and description into the most applicable domain category
 * @param {string} title 
 * @param {string} description 
 * @param {Array} categories Array of available categories from DB
 * @returns {Promise<{category_id: string, ai_confidence: number, priority: string}>}
 */
async function classifyIssue(title, description, categories) {
  if (!apiKey) return null;

  try {
    const categoriesJSON = JSON.stringify(
      categories.map(c => ({ id: c.id, name: c.name, default_authority: c.default_authority }))
    );

    const prompt = `You are an AI router for a smart city issue reporting platform. Evaluate the following report and classify it.
Your response MUST be a valid JSON object containing exactly three fields:
{
  "category_id": "uuid of chosen category",
  "ai_confidence": a float between 0.0 and 1.0 representing classification confidence,
  "priority": one of "low", "medium", or "high" based on importance and urgency
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
      ai_confidence: aiRes.ai_confidence,
      priority: aiRes.priority || 'medium'
    };
  } catch (err) {
    console.error('Gemini Classification Error:', err);
    return null;
  }
}

/**
 * Classifies a civic issue image into the requested JSON schema.
 * @param {string} base64
 * @param {string} mimeType
 * @returns {Promise<{is_valid_civic_issue: boolean, category: string, confidence_score: number, analysis_summary: string} | {error: string}>}
 */
async function classifyCivicImage(base64, mimeType) {
  if (!apiKey) {
    return { error: 'GEMINI_API_KEY is not set in environment.' };
  }

  try {
    const imageModel = genAI.getGenerativeModel({
      model: modelName,
      systemInstruction: civicImageSystemPrompt,
    });

    const result = await imageModel.generateContent({
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType: mimeType || 'image/jpeg',
                data: base64,
              },
            },
            {
              text: 'Analyze this image and return only the JSON object described in the system instructions.',
            },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.2,
        topP: 0.95,
      },
    });

    const text = cleanJsonText(result.response.text());
    const parsed = JSON.parse(text);

    return {
      is_valid_civic_issue: Boolean(parsed.is_valid_civic_issue),
      category: parsed.category || 'Invalid',
      confidence_score: typeof parsed.confidence_score === 'number' ? parsed.confidence_score : 0,
      analysis_summary: parsed.analysis_summary || 'No analysis summary returned.',
    };
  } catch (err) {
    console.error('Gemini Civic Image Classification Error:', err);
    return { error: 'Gemini image classification failed' };
  }
}

module.exports = {
  classifyIssue,
  classifyCivicImage
};
