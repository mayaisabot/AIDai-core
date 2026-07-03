import * as webllm from "https://esm.run/@mlc-ai/web-llm";

// Specify the official MLC-compiled DeepSeek 1.5B model ID
const MODEL_ID = "Qwen2.5-1.5B-Instruct-q4f16_1-MLC";

let engine;
let chatHistory = [];

const progressTrack = document.getElementById("progressTrack");
const userText = document.getElementById("userText");
const sendAction = document.getElementById("sendAction");
const screenOutput = document.getElementById("screenOutput");

async function launchSystemEngine() {
    try {
        // Initialize and stream the download directly into local browser cache
        engine = await webllm.CreateMLCEngine(MODEL_ID, {
            initProgressCallback: (report) => {
                progressTrack.innerText = report.text;
            }
        });

        progressTrack.innerText = "DeepSeek-1.5B: 100% Locally Active (WebGPU)";
        userText.disabled = false;
        sendAction.disabled = false;
        userText.placeholder = "Query DeepSeek locally...";

        // Initialize chat history with your custom logic constraints
        chatHistory = [
            { 
                role: "system", 
                content: "You are BandAI, a strict, expert medical first-aid advisor bot. Provide actionable steps." 
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
    
    // Disable inputs while the local AI thinks
    userText.disabled = true;
    sendAction.disabled = true;

    // Create placeholder for AI response
    const aiBubbleId = "ai-" + Date.now();
    screenOutput.innerHTML += `<div id="${aiBubbleId}" class="bubble ai-bubble">Thinking...</div>`;
    screenOutput.scrollTop = screenOutput.scrollHeight;

    try {
        // Append user prompt to ongoing history
        chatHistory.push({ role: "user", content: rawPrompt });

        // Query the local WebGPU engine
        const chunks = await engine.chat.completions.create({
            messages: chatHistory,
            stream: true // Enables smooth, real-time word streaming
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

        // Save AI response to history context
        chatHistory.push({ role: "assistant", content: fullResponse });

    } catch (err) {
        console.error("Inference Error: ", err);
        document.getElementById(aiBubbleId).innerText = "Error generating local response.";
    } finally {
        // Re-enable inputs
        userText.disabled = false;
        sendAction.disabled = false;
        userText.focus();
    }
}

// Event Listeners to bind UI buttons
sendAction.addEventListener("click", handleMessageExchange);
userText.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleMessageExchange();
    }
});

// Auto-trigger engine boot on page load
launchSystemEngine();
