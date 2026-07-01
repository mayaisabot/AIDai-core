import * as webllm from "https://esm.run/@mlc-ai/web-llm";

// Specify the official MLC-compiled DeepSeek 1.5B model ID
const MODEL_ID = "DeepSeek-R1-Distill-Qwen-1.5B-q4f16_1-MLC";

let engine;
const progressTrack = document.getElementById("progressTrack");
const userText = document.getElementById("userText");
const sendAction = document.getElementById("sendAction");
const screenOutput = document.getElementById("screenOutput");

async function launchSystemEngine() {
    try {
        engine = new webllm.CreateGenericEngine();
        
        // Track download chunks into the visitor's local temp storage
        engine.setInitProgressCallback((report) => {
            progressTrack.innerText = report.text;
        });

        // Initialize the neural layers right inside their graphic card processing cores
        await engine.reload(MODEL_ID, {
            system_prompt: "You are BandAI, a strict, expert medical first-aid advisor bot. Provide actionable, clear steps. Keep it direct."
        });

        progressTrack.innerText = "DeepSeek-1.5B: 100% Locally Active (WebGPU)";
        userText.disabled = false;
        sendAction.disabled = false;
        userText.placeholder = "Query DeepSeek locally...";
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
    screenOutput.scrollTop = screenOutput.scrollHeight;

    // Setup empty streaming frame
    const aiResponseFrame = document.createElement("div");
    aiResponseFrame.className = "bubble ai-bubble";
    aiResponseFrame.innerText = "Analyzing parameters...";
    screenOutput.appendChild(aiResponseFrame);

    try {
        const conversationLog = [{ role: "user", content: rawPrompt }];
        
        // Target client-side hardware for token computation
        const executionPipeline = await engine.chat.completions.create({ 
            messages: conversationLog,
            stream: true 
        });
        
        aiResponseFrame.innerText = "";
        for await (const chunk of executionPipeline) {
            const letter = chunk.choices[0]?.delta?.content || "";
            aiResponseFrame.innerText += letter;
            screenOutput.scrollTop = screenOutput.scrollHeight;
        }
    } catch (error) {
        aiResponseFrame.innerText = "Hardware execution error.";
    }
}

sendAction.onclick = handleMessageExchange;
userText.onkeypress = (e) => { if (e.key === "Enter") handleMessageExchange(); };

window.onload = launchSystemEngine;