/// <reference types="vite/client" />

// Speech Recognition types for browser API
interface Window {
  SpeechRecognition: typeof SpeechRecognition;
  webkitSpeechRecognition: typeof SpeechRecognition;
}
