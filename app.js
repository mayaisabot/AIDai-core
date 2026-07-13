import * as webllm from "https://esm.run/@mlc-ai/web-llm";
// IMPORT STEP: This connects app.js to your third knowledge.js file
import { medicalInstructions } from "./knowledge.js";

// Using the Qwen 1.5B model that successfully booted on your hardware
const MODEL_ID = "Qwen2.5-1.5B-Instruct-q4f16_1-MLC";

let engine;
let chatHistory = [];

const progressTrack = document.getElementById("progressTrack");
const userText = document.getElementById("userText");
const sendAction = document.getElementById("sendAction");
const screenOutput = document.getElementById("screenOutput");

async function launchSystemEngine() {
    try {
        // Initialize the WebGPU engine
        engine = await webllm.CreateMLCEngine(MODEL_ID, {
            initProgressCallback: (report) => {
                progressTrack.innerText = report.text;
            }
        });

        // Set live styling once loading finishes
        progressTrack.innerText = "Aid-AI: 100% Locally Active (WebGPU)";
        progressTrack.style.background = "#d4edda";
        progressTrack.style.color = "#155724";
        progressTrack.style.borderColor = "#c3e6cb";
        
        userText.disabled = false;
        sendAction.disabled = false;
        userText.placeholder = "Query Aid-AI locally...";

        // Set the system prompt using your database from knowledge.js
        chatHistory = [
            { 
                role: "system", 
                content: medicalInstructions 
            }
        ];

    } catch (err) {
        progressTrack.innerText = "WebGPU Compilation Failed. Use Chrome/Edge on desktop.";
        console.error(err);
    }
}

async function handleMessageExchange() {
    const rawPrompt = userText.value.trim();
    if (!rawPrompt) return;

    // Render user bubble
    screenOutput.innerHTML += `<div class="bubble user-bubble">${rawPrompt}</div>`;
    userText.value = "";
    
    // Lock inputs while the model is processing
    userText.disabled = true;
    sendAction.disabled = true;

    // Setup streaming placeholder bubble
    const aiBubbleId = "ai-" + Date.now();
    screenOutput.innerHTML += `<div id="${aiBubbleId}" class="bubble ai-bubble">Thinking...</div>`;
    screenOutput.scrollTop = screenOutput.scrollHeight;

    try {
        // Append user question to ongoing conversation tracking
        chatHistory.push({ role: "user", content: rawPrompt });

        // Request prediction streaming from local graphics hardware
        const chunks = await engine.chat.completions.create({
            messages: chatHistory,
            temperature: 0.2, // Strict accuracy setting from your model preferences
            max_tokens: 1024,
            stream: true
        });

        let fullResponse = "";
        const aiBubble = document.getElementById(aiBubbleId);
        aiBubble.innerText = ""; 

        for await (const chunk of chunks) {
            const content = chunk.choices[0]?.delta?.content || "";
            fullResponse += content;
            aiBubble.innerText = fullResponse;
            screenOutput.scrollTop = screenOutput.scrollHeight;
        }

        // Save generated AI response context to conversation ledger
        chatHistory.push({ role: "assistant", content: fullResponse });

    } catch (err) {
        console.error("Inference Error: ", err);
        document.getElementById(aiBubbleId).innerText = "Error generating local response.";
    } finally {
        // Unlock input tools
        userText.disabled = false;
        sendAction.disabled = false;
        userText.focus();
    }
}

// Bind UI event listeners
sendAction.addEventListener("click", handleMessageExchange);
userText.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleMessageExchange();
    }
});

// Run engine load immediately
launchSystemEngine();
