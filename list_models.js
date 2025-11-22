// list_models.js
const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function run() {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        console.log("Attempting to access gemini-pro...");
        // There isn't a direct "list models" method exposed easily in the high-level SDK 
        // without using the lower level googleapis, but we can try a simple generation 
        // to see if the key works at all, or catch the specific error details.

        const result = await model.generateContent("Hello");
        console.log("Success! Model found and working.");
        console.log("Response:", result.response.text());
    } catch (error) {
        console.error("Error details:");
        console.error(error);
    }
}

run();
