/**
 * questionGenerator.js
 * Handles dynamic question generation via Gemini API.
 * Acts as an in-memory database that clears when the session closes.
 * Fetches questions in batches of 20 and auto-replenishes when 6 or fewer remain.
 */

const QuestionDB = {
    readAloud: [],
    listenRepeat: [],
    sentenceMastery: [],
    situationalQA: [],
    extempore: []
};

const DB_FETCH_SIZE = 20;
const DB_REFILL_THRESHOLD = 6;
let isFetching = {
    readAloud: false,
    listenRepeat: false,
    sentenceMastery: false,
    situationalQA: false,
    extempore: false
};

const PROMPTS = {
    readAloud: `Generate a JSON array of {count} short paragraphs (3 to 4 lines each) of general everyday English text for a "Read Aloud" assessment. 
    Format each object strictly as:
    { "type": "readAloud", "instruction": "Read the following paragraph aloud clearly after the beep.", "expectedText": "[Your 3-4 line paragraph here]", "timeLimit": 30 }`,

    listenRepeat: `Generate a JSON array of {count} everyday conversational English sentences of varying lengths (from short to moderately long) for a "Listen and Repeat" assessment.
    Format each object strictly as:
    { "type": "listenRepeat", "instruction": "Listen carefully to the audio sentence. When the beep sounds, repeat it exactly as heard.", "expectedText": "[Your sentence here]", "timeLimit": 15 }`,

    sentenceMastery: `Generate a JSON array of {count} jumbled/scrambled English sentences for a "Sentence Mastery" assessment. The user must mentally rearrange the chunks to form a grammatically correct sentence.
    Format each object strictly as:
    { "type": "sentenceMastery", "instruction": "Listen to the scrambled sentence. Mentally rearrange the words and speak the correct version out loud.", "promptText": "[Scrambled chunks separated by slashes, e.g., 'the drawer / the keys / are in']", "hint": "[Optional hint if needed]", "expectedText": "[The correct unscrambled sentence, e.g., 'The keys are in the drawer.']", "timeLimit": 15 }`,

    situationalQA: `Generate a JSON array of {count} very basic, everyday general knowledge questions for a "Short Question & Answers" assessment. The question should have a very obvious one-word or two-word answer (e.g., 'What do you use to cut paper?' -> 'Scissors'). DO NOT use technical or corporate questions.
    Format each object strictly as:
    { "type": "situationalQA", "instruction": "Listen to the question. Respond immediately with a direct one- or two-word answer.", "promptText": "[The general knowledge question]", "expectedKeywords": ["[The one or two word expected answer]"], "timeLimit": 10 }`,

    extempore: `Generate a JSON array of {count} simple, conversational, non-technical abstract prompts or personal experience themes for an "Extempore" speech assessment (e.g., 'Your favorite holiday destination', 'City life vs Village life'). DO NOT use technical IT topics.
    Format each object strictly as:
    { "type": "extempore", "instruction": "You have 30 seconds to prepare your thoughts, followed by 60 seconds to speak continuously on the topic.", "promptText": "Topic: [The speech topic]", "points": ["[Idea 1 to talk about]", "[Idea 2]", "[Idea 3]"], "prepTime": 30, "timeLimit": 60 }`
};

async function fetchFromGemini(section, count) {
    if (typeof GEMINI_API_KEY === 'undefined' || GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY_HERE') {
        console.error("Gemini API key is missing. Please add it to env.js");
        return [];
    }

    // Inject randomness so the AI generates fresh content every time
    const topics = [
        "Everyday routines and habits", "Travel and holidays", "Food and cooking", 
        "Childhood memories", "Hobbies and sports", "City vs Country life", 
        "Technology in daily life", "Friendship and social life", "Movies and books", 
        "Shopping and fashion", "Weather and seasons", "Time management"
    ];
    const randomTopic = topics[Math.floor(Math.random() * topics.length)];
    const randomSeed = Math.floor(Math.random() * 1000000);

    let promptText = PROMPTS[section].replace('{count}', count);
    promptText += `\n\nCRITICAL INSTRUCTION: Ensure these questions are completely unique and highly varied. Base them loosely around the theme of "${randomTopic}". Random Seed for entropy: ${randomSeed}`;

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: promptText }] }],
                generationConfig: {
                    response_mime_type: "application/json",
                    temperature: 0.9
                }
            })
        });

        if (!response.ok) {
            console.error("API Error:", await response.text());
            return [];
        }

        const data = await response.json();
        const generatedText = data.candidates[0].content.parts[0].text;

        let newQuestions = [];
        try {
            newQuestions = JSON.parse(generatedText);
        } catch (e) {
            console.error("Failed to parse Gemini JSON output", e, generatedText);
        }

        return newQuestions;
    } catch (error) {
        console.error("Network error fetching from Gemini", error);
        return [];
    }
}

async function ensureQuestionsLoaded(section) {
    if (QuestionDB[section].length <= DB_REFILL_THRESHOLD && !isFetching[section]) {
        isFetching[section] = true;
        console.log(`Fetching ${DB_FETCH_SIZE} new questions for ${section}...`);
        const newQs = await fetchFromGemini(section, DB_FETCH_SIZE);

        // Append unique items based on expectedText/promptText to avoid exact duplicates
        newQs.forEach(q => {
            q.id = section + '_' + Math.random().toString(36).substr(2, 9);
            q.section = formatSectionName(section);
            QuestionDB[section].push(q);
        });

        console.log(`Successfully added ${newQs.length} questions to ${section}. Total: ${QuestionDB[section].length}`);
        isFetching[section] = false;
    }
}

async function getNextQuestion(section) {
    // If empty, block and wait for fetch
    if (QuestionDB[section].length === 0) {
        await ensureQuestionsLoaded(section);
    } else {
        // Trigger background fetch if running low
        ensureQuestionsLoaded(section);
    }

    if (QuestionDB[section].length > 0) {
        return QuestionDB[section].shift(); // Remove and return the first item (queue behavior)
    }
    return null;
}

function formatSectionName(key) {
    const map = {
        readAloud: 'Section 1: Read Aloud',
        listenRepeat: 'Section 2: Listen & Repeat',
        sentenceMastery: 'Section 3: Sentence Mastery',
        situationalQA: 'Section 4: Situational Q&A',
        extempore: 'Section 5: Extempore Speech'
    };
    return map[key] || key;
}

// Pre-load initial questions for all categories in parallel on startup
async function initDatabase() {
    console.log("Initializing In-Memory DB via Gemini...");
    const sections = Object.keys(PROMPTS);
    await Promise.all(sections.map(sec => ensureQuestionsLoaded(sec)));
    console.log("Initial database load complete.", QuestionDB);
}


// ============================================================================
// AI COACH EVALUATOR LOGIC
// ============================================================================

async function evaluateSessionWithCoach(history) {
    if (typeof GEMINI_API_KEY === 'undefined' || GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY_HERE') {
        console.error("Gemini API key is missing.");
        return null;
    }

    const promptText = `You are an expert English Communication Coach grading an SVAR/Versant-style spoken English test.
I am going to provide you with the exact unedited transcripts of what the user spoke in response to several questions.
Your job is to provide a highly pinpointed, specific, and actionable evaluation. DO NOT give generic advice. Point out exactly which words they fumbled, what grammar they messed up, or where they failed to follow instructions.

Here is the test session data:
${JSON.stringify(history, null, 2)}

Analyze the user's responses against the questions. 
Return your evaluation STRICTLY as a JSON object with the following structure:
{
    "overallScore": 75, // A realistic score out of 100 based on their actual answers
    "strengths": ["Pinpointed strength 1", "Pinpointed strength 2"],
    "weaknesses": ["Pinpointed weakness 1 (quote their exact mistake)", "Pinpointed weakness 2"],
    "detailedFeedback": [
        {
            "question": "The text of the question they were asked",
            "userSpoken": "What they actually said",
            "coachCorrection": "Point out the exact error and what they SHOULD have said",
            "actionableTip": "A 1-sentence pro-tip to fix this specific issue"
        }
    ],
    "finalCoachMessage": "A short, encouraging but strict closing remark summarizing their performance."
}
Return ONLY valid JSON. Do not include markdown formatting or backticks around the output.`;

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: promptText }] }],
                generationConfig: { 
                    response_mime_type: "application/json",
                    temperature: 0.2 // Low temperature for analytical consistency
                }
            })
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }

        const data = await response.json();
        let generatedText = data.candidates[0].content.parts[0].text;
        
        // Clean markdown block if it exists
        generatedText = generatedText.replace(/^```json/g, '').replace(/```$/g, '').trim();
        
        return JSON.parse(generatedText);
    } catch (error) {
        console.error("Coach Evaluation Error:", error);
        return null;
    }
}
