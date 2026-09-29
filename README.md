This app is a Speech-to-Text (Voice Recognition) application built with React Native. It demonstrates how to capture audio from the device's microphone and convert spoken words into written text in real time.

Key Features & What It Does:

Real-Time Speech Recognition:

Integrates directly with the native speech recognition engines on your mobile device (Apple's SFSpeechRecognizer on iOS and Google's SpeechRecognizer on Android).
No external third-party paid cloud API required — it uses the phone's built-in speech engine.

Live Partial Transcripts:

As you speak, it displays what you are saying in real time (Live Transcript) before you even pause or finish the sentence.

Ranked Final Results:

Once you finish speaking, it displays the finalized sentence along with alternative interpretations ranked by engine confidence (#1, #2, etc.).

Live Audio Level Meter:

A reactive visual sound bar that bounces in real time according to how loudly you speak into the microphone.

Multi-Language Support:

Allows switching recognition languages on the fly:
🇺🇸 English (en-US)
🇪🇸 Spanish (es-ES)
🇫🇷 French (fr-FR)
🇩🇪 German (de-DE)
🇯🇵 Japanese (ja-JP)
🇨🇳 Mandarin Chinese (zh-CN)

Full Recognition Controls & Debug Console:

Start / Stop: Begin and end voice recognition cleanly.
Cancel: Abort the current speech session without saving.
Reset: Completely re-initialize the native speech engine.
Debug Event Logs: An expandable live console showing the exact native lifecycle events (onSpeechStart, onSpeechRecognized, onSpeechResults, audio levels, and errors) as they trigger under the hood.
