import { ChatMessageType } from "../store/store";

const apiKey = "sk-#######################"; // Replace with your actual API key
const apiUrl = "https://api.openai.com/v1/chat/completions";

export async function fetchResults(
  messages: ChatMessageType[],
  signal: AbortSignal,
  onData: (data: any) => void,
  onCompletion: () => void
) {
  try {
    const response = await fetch(apiUrl, {
      method: `POST`,
      signal: signal,
      headers: {
        "content-type": `application/json`,
        accept: `text/event-stream`,
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        temperature: 0.7,
        stream: true,
        messages: messages,
      }),
    });

    if (response.status !== 200) {
      throw new Error("Error fetching results");
    }
    const reader: any = response.body?.getReader();
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        onCompletion();
        break;
      }

      let chunk = new TextDecoder("utf-8").decode(value, { stream: true });

      const chunks = chunk.split("\n").filter((x: string) => x !== "");

      chunks.forEach((chunk: string) => {
        if (chunk === "data: [DONE]") {
          return;
        }
        if (!chunk.startsWith("data: ")) return;
        chunk = chunk.replace("data: ", "");
        const data = JSON.parse(chunk);
        if (data.choices[0].finish_reason === "stop") return;
        onData(data.choices[0].delta.content);
      });
    }
  } catch (error) {
    if (error instanceof DOMException || error instanceof Error)
      throw new Error(error.message);
  }
}