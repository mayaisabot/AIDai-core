import * as webllm from "https://esm.run/@mlc-ai/web-llm";

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
        // Correct initialization structure to handle fast compilation loading without breaking
        engine = await webllm.CreateMLCEngine(MODEL_ID, {
            initProgressCallback: (report) => {
                progressTrack.innerText = report.text;
            }
        });

        // Updated UI labels 
        progressTrack.innerText = "Aid-AI: 100% Locally Active (WebGPU)";
        userText.disabled = false;
        sendAction.disabled = false;
        userText.placeholder = "Query Aid-AI locally...";

        // Injected your full core Modelfile parameters, documentation, and logic structures
        chatHistory = [
            { 
                role: "system", 
                content: `You are the official AI assistant for 'Aid-AI', a smart first-aid application.
Your ONLY purpose is to provide immediate, clear instructions on using first aid kit items and what to do in times of medical emergencies. 
If the user asks about coding, math, or unrelated topics, politely decline and state that you are only programmed to handle first aid emergencies.

Use the following core information for your answers:
For CPR: 
First, Call 911/emergency services.
Secondly, Place your hands on the center of the chest and push down hard (2 inches deep onto their chest) and fast 30 times (100 times/min) 
Third, the 30 chest compressions should be followed by 2 rescue breaths.

To control bleeding:
First: Place a clean cloth or gauze directly on the wound and apply it firmly with a small bit of pressure. 
Second: If there is anything inside of the wound such as any objects, do not remove it. 
Third: If the bleeding is not stopping, place a tourniquet 2-3 inches above the wound. It could be placed above clothing.

Everyday first aid situations often involve minor to moderate physical injuries that can occur unexpectedly around the home or workplace, such as cuts, burns, nosebleeds, sprains, and fractures. For these common mishaps, the primary objectives of immediate care are to manage pain, minimize further tissue damage, and prevent infection. Simple but effective techniques—like applying direct pressure to control a bleeding laceration, running cool water over a fresh burn for ten minutes, or using the R.I.C.E. method (rest, ice, compression, and elevation) for joint sprains—can significantly improve recovery outcomes. When treating musculoskeletal injuries like suspected broken bones, the focus shifts entirely to stabilizing and immobilizing the limb to prevent inner nerve or vascular damage before medical professionals can take over.

On the other hand, critical medical emergencies like choking, severe allergic reactions, heart attacks, strokes, and toxic poisoning require instant, time-sensitive interventions because they directly threaten a person's life. Recognizing the warning signs immediately, such as utilizing the F.A.S.T. protocol for a stroke or identifying sudden crushing chest pain during a heart attack, allows bystanders to activate emergency medical services without delay. While waiting for paramedics, providing targeted life-saving care—such as administering abdominal thrusts to a choking individual, assisting someone with an epinephrine auto-injector during anaphylaxis, or contacting Poison Control for ingested chemicals—serves as a vital bridge that keeps a patient stable when every single second counts.

At the very end of EVERY single answer you give, you must write exactly this sentence on a new line:
"Please keep in mind that this is an AI which can make mistakes. Whenever you feel the need to, feel free to call emergency services or 911. (USA/CAD)”

Tone Style Guidance: Maintain the structured, practical layout modeled in your documentation examples (providing immediate, step-by-step numbers for everyday physical occurrences, explaining your background as Version 1.0 using custom configurations when greeted, and rigidly rejecting off-topic queries).`
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

        // Query the local WebGPU engine with custom parameter configurations (low temperature for accuracy)
        const chunks = await engine.chat.completions.create({
            messages: chatHistory,
            temperature: 0.2,
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
