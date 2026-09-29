This app is a Speech-to-Text (Voice Recognition) application built with React Native. It demonstrates how to capture audio from the device's microphone and convert spoken words into written text in real time.

It uses whichever microphone is currently active on the device running the app:

1. If running on a Physical Phone or Tablet (iPhone / Android)
Built-in Microphone: By default, it captures audio from the phone's built-in microphone (at the bottom/front of the device).
Bluetooth Headset / Earbuds: If you are wearing AirPods, Galaxy Buds, or any Bluetooth headset, the phone routes input through the headset's mic.
Wired Headphones: If plugged in with an inline mic, it uses that.
2. If running on a Computer Emulator / Simulator
iOS Simulator / Android Emulator: It uses your computer's default audio input device (e.g., your laptop's built-in microphone, a USB podcast mic, or a PC headset).
Permissions Handled

The app requests standard operating system microphone permissions before capturing audio:

iOS: NSMicrophoneUsageDescription (Microphone access) & NSSpeechRecognitionUsageDescription (Speech recognition service).
Android: RECORD_AUDIO permission.

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

errors 

1. Runtime & Speech Behavior (Normal Operation)

Silence Timeout / No Speech (ERROR_NO_MATCH / Code 7 on Android):

What happens: If you tap the mic but don't say anything for 3–5 seconds, the native recognition engine automatically times out.
Fix/Handling: This is normal engine behavior; simply tap the mic again and begin speaking.

Audio Interruption / Speech Cancelled:

What happens: If a phone call comes in, an alarm rings, or you navigate away while recording, the audio session is interrupted and throws an onSpeechError.
2. Device & Permissions
Permission Denied:
What happens: If the user taps "Don't Allow" when the OS prompts for microphone or speech recognition permissions, the app will trigger an error (speech_denied / Code 9).
Fix: Microphone and Speech Recognition must be re-enabled in the phone's OS Settings (Settings -> Apps -> Voice Example -> Permissions).
3. Emulator & Simulator Quirks

Android Emulator (Missing Google Speech Engine):

What happens: The app status badge says "Engine Unavailable", or starting throws ERROR_CLIENT (Code 5).
Why: Android emulators created without Google APIs / Google Play do not include Google's native Speech Recognition service.
Fix: Use an emulator image that has Google Play Store installed, or test on a physical phone.

iOS Simulator (Mic Pass-through):

What happens: The simulator doesn't pick up audio.
Fix: Ensure your Mac's input microphone is permitted under System Settings -> Privacy & Security -> Microphone -> Xcode/Simulator.
4. Network Connectivity
Offline Recognition (ERROR_NETWORK / Code 2 or 3):
Android: By default, some languages stream audio to Google's servers unless offline speech language packs are downloaded in Google Assistant/Voice settings.
iOS: Modern iPhones (A12 chip and newer) support on-device dictation for major languages, but older devices or certain regional dialects require an internet connection to reach Apple servers.
5. Tooling & Environment
Expo Go:
Because this library uses custom native Java and Objective-C modules, it cannot run inside Expo Go. It must be run via standard React Native CLI (yarn android / yarn ios) or an Expo Development Client (expo run:android / expo run:ios).

All of these runtime errors are intercepted by VoiceTest.tsx, which displays the code and explanation in the red ⚠️ Error Card and logs it in the collapsible Debug Event Console.
