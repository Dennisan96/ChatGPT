import { get } from "http";
import { ChatMessageType, ModalList, useSettings } from "../store/store";

const apiUrl = "https://api.openai.com/v1/chat/completions";
const IMAGE_GENERATION_API_URL = "https://api.openai.com/v1/images/generations";

const seaOtterURI = "https://travelbuddy.seaotterai.com/chat";
const devSeaOtterURI = "http://localhost:8000/chat";

function getApiKey() {
  let api_key;
  if ((localStorage.getItem("apikey") ?? "")?.length > 3) {
    api_key = localStorage.getItem("apikey");
  } else {
    try {
      api_key = import.meta.env.VITE_OPENAI_API_KEY;
    } catch (error) {
      console.error("No api key found");
    }
  }
  return api_key;
}

export async function fetchResults(
  messages: Omit<ChatMessageType, "id" | "type">[],
  modal: string,
  signal: AbortSignal,
  onData: (data: any) => void,
  onCompletion: () => void
) {

  let api_key = getApiKey();
  try {
    const response = await fetch(seaOtterURI, {
      method: `POST`,
      signal: signal,
      headers: {
        "content-type": `application/json`,
        // accept: `text/event-stream`,
      },
      body: JSON.stringify({
        // Get api key from localStorage or get it from env variable
        api_key: api_key,
        model: useSettings.getState().settings.selectedModal,
        temperature: 0.7,
        stream: true,
        messages: messages,
        search_online: true,
      }),
    });

    if (response.status !== 200) {
      console.log(response);
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

      const chunks = chunk.split('\n\n').filter((c: string) => c.length > 0);
      chunks.forEach((chunk: string) => {
        let data;
        try {
          data = JSON.parse(chunk);
        } catch (error) {
          console.log("Error parsing chunk", error);
          console.log("Chunk", chunk);
          return;
        }

        if (data.choices[0].finish_reason === "stop") return;
        onData(data.choices[0].delta.content);
      });
    }
  } catch (error) {
    if (error instanceof DOMException || error instanceof Error) {
      throw new Error(error.message);
    }
  }
}

export async function fetchModals() {
  try {
    const response = await fetch("https://api.openai.com/v1/models", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("apikey")}`,
      },
    });
    const data = await response.json();
    return data;
  } catch (error) {
    if (error instanceof DOMException || error instanceof Error) {
      throw new Error(error.message);
    }
  }
}

export type ImageSize =
  | "256x256"
  | "512x512"
  | "1024x1024"
  | "1280x720"
  | "1920x1080"
  | "1024x1024"
  | "1792x1024"
  | "1024x1792";

export type IMAGE_RESPONSE = {
  created_at: string;
  data: IMAGE[];
};
export type IMAGE = {
  url: string;
};
export type DallEImageModel = Extract<ModalList, "dall-e-2" | "dall-e-3">;

export async function generateImage(
  prompt: string,
  size: ImageSize,
  numberOfImages: number
) {
  console.log('requested a image');
  const selectedModal = useSettings.getState().settings.selectedModal;
  const apiKey = getApiKey();

  const response = await fetch(IMAGE_GENERATION_API_URL, {
    method: `POST`,
    headers: {
      "content-type": `application/json`,
      accept: `text/event-stream`,
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: selectedModal,
      prompt: prompt,
      n: numberOfImages,
      size: useSettings.getState().settings.dalleImageSize[
        selectedModal as DallEImageModel
      ],
    }),
  });
  const body: IMAGE_RESPONSE = await response.json();
  return body;
}
