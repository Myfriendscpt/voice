import { useEffect, useState, useRef, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Image,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Animated,
  Platform,
  Share,
  Alert,
  TextInput,
  Switch,
} from 'react-native';

import Voice, {
  type SpeechRecognizedEvent,
  type SpeechResultsEvent,
  type SpeechErrorEvent,
  type SpeechStartEvent,
  type SpeechEndEvent,
  type SpeechVolumeChangeEvent,
} from '@react-native-voice/voice';

declare var require: any;

interface LocaleOption {
  code: string;
  label: string;
}

const SUPPORTED_LOCALES: LocaleOption[] = [
  { code: 'en-US', label: 'English (US)' },
  { code: 'en-GB', label: 'English (UK)' },
  { code: 'es-ES', label: 'Español' },
  { code: 'fr-FR', label: 'Français' },
  { code: 'de-DE', label: 'Deutsch' },
  { code: 'it-IT', label: 'Italiano' },
  { code: 'pt-BR', label: 'Português' },
  { code: 'ja-JP', label: '日本語' },
  { code: 'zh-CN', label: '中文 (普通话)' },
  { code: 'hi-IN', label: 'हिन्दी' },
  { code: 'ar-SA', label: 'العربية' },
  { code: 'ko-KR', label: '한국어' },
];

interface LogEntry {
  id: string;
  time: string;
  title: string;
  details?: string;
}

interface SavedNote {
  id: string;
  text: string;
  locale: string;
  time: string;
  words: number;
}

const VoiceTest = () => {
  // Theme state
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);

  // Recognition state
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isRecognized, setIsRecognized] = useState<boolean>(false);
  const [pitch, setPitch] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<string[]>([]);
  const [partialResults, setPartialResults] = useState<string[]>([]);
  const [selectedLocale, setSelectedLocale] = useState<string>('en-US');
  const [customLocale, setCustomLocale] = useState<string>('');
  const [showCustomLocaleInput, setShowCustomLocaleInput] = useState<boolean>(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);

  // Continuous Recognition & Options
  const [continuousMode, setContinuousMode] = useState<boolean>(false);
  const isContinuousRef = useRef<boolean>(false);
  const isRecordingRef = useRef<boolean>(false);
  const localeRef = useRef<string>('en-US');

  // Timer state
  const [durationSeconds, setDurationSeconds] = useState<number>(0);
  const timerIntervalRef = useRef<any>(null);

  // Saved Notes History
  const [savedNotes, setSavedNotes] = useState<SavedNote[]>([]);

  // Android Speech Services
  const [speechServices, setSpeechServices] = useState<string[] | null>(null);
  const [showServices, setShowServices] = useState<boolean>(false);

  // Event Logs
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [showLogs, setShowLogs] = useState<boolean>(false);

  // Pulse animation for mic button
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseLoop = useRef<Animated.CompositeAnimation | null>(null);

  // Audio Waveform Equalizer animations (7 dynamic bars)
  const waveBars = useRef([
    new Animated.Value(6),
    new Animated.Value(12),
    new Animated.Value(20),
    new Animated.Value(28),
    new Animated.Value(20),
    new Animated.Value(12),
    new Animated.Value(6),
  ]).current;

  // Keep refs in sync for event callbacks
  isContinuousRef.current = continuousMode;
  isRecordingRef.current = isRecording;
  localeRef.current = selectedLocale;

  const addLog = useCallback((title: string, details?: string) => {
    const timeStr = new Date().toLocaleTimeString();
    setLogs((prev: LogEntry[]) => [
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        time: timeStr,
        title,
        details,
      },
      ...prev.slice(0, 39),
    ]);
  }, []);

  // Duration Timer
  useEffect(() => {
    if (isRecording) {
      setDurationSeconds(0);
      timerIntervalRef.current = setInterval(() => {
        setDurationSeconds((sec) => sec + 1);
      }, 1000);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [isRecording]);

  // Pulse animation while recording
  useEffect(() => {
    if (isRecording) {
      pulseLoop.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 700,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 700,
            useNativeDriver: true,
          }),
        ]),
      );
      pulseLoop.current.start();
    } else {
      pulseLoop.current?.stop();
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [isRecording, pulseAnim]);

  // Dynamic Audio Waveform Equalizer reaction
  useEffect(() => {
    if (isRecording) {
      const p = pitch !== null && pitch > 0 ? pitch : 1.5;
      const heights = [
        Math.min(36, Math.max(8, p * 2.5)),
        Math.min(42, Math.max(12, p * 3.5)),
        Math.min(48, Math.max(16, p * 4.2)),
        Math.min(52, Math.max(22, p * 5.0)),
        Math.min(48, Math.max(16, p * 4.2)),
        Math.min(42, Math.max(12, p * 3.5)),
        Math.min(36, Math.max(8, p * 2.5)),
      ];

      Animated.parallel(
        waveBars.map((bar, index) =>
          Animated.timing(bar, {
            toValue: heights[index] ?? 10,
            duration: 120,
            useNativeDriver: false,
          }),
        ),
      ).start();
    } else {
      Animated.parallel(
        waveBars.map((bar, index) =>
          Animated.timing(bar, {
            toValue: [6, 12, 18, 24, 18, 12, 6][index] ?? 8,
            duration: 250,
            useNativeDriver: false,
          }),
        ),
      ).start();
    }
  }, [isRecording, pitch, waveBars]);

  // Voice Event Listeners setup
  useEffect(() => {
    let isMounted = true;

    Voice.onSpeechStart = (e: SpeechStartEvent) => {
      console.log('onSpeechStart: ', e);
      if (!isMounted) return;
      setIsRecording(true);
      setError(null);
      addLog('onSpeechStart');
    };

    Voice.onSpeechRecognized = (e: SpeechRecognizedEvent) => {
      console.log('onSpeechRecognized: ', e);
      if (!isMounted) return;
      setIsRecognized(true);
      addLog('onSpeechRecognized', e?.isFinal ? 'Final result confirmed' : undefined);
    };

    Voice.onSpeechEnd = (e: SpeechEndEvent) => {
      console.log('onSpeechEnd: ', e);
      if (!isMounted) return;
      addLog('onSpeechEnd');

      // Continuous mode: automatically resume listening after utterance end
      if (isContinuousRef.current && isRecordingRef.current) {
        addLog('Continuous Mode', 'Auto-resuming speech capture...');
        setTimeout(() => {
          if (isMounted && isRecordingRef.current) {
            Voice.start(localeRef.current).catch((err: any) => {
              addLog('Continuous Resume Error', err?.message || String(err));
            });
          }
        }, 350);
      } else {
        setIsRecording(false);
      }
    };

    Voice.onSpeechError = (e: SpeechErrorEvent) => {
      console.log('onSpeechError: ', e);
      if (!isMounted) return;
      const errMsg = e.error?.message || JSON.stringify(e.error);
      setError(errMsg);
      addLog('onSpeechError', errMsg);

      // In continuous mode, if error was no speech timeout (code 7), restart gracefully
      if (isContinuousRef.current && isRecordingRef.current && (errMsg.includes('7') || errMsg.includes('No match'))) {
        setTimeout(() => {
          if (isMounted && isRecordingRef.current) {
            Voice.start(localeRef.current).catch(() => {});
          }
        }, 500);
      } else {
        setIsRecording(false);
      }
    };

    Voice.onSpeechResults = (e: SpeechResultsEvent) => {
      console.log('onSpeechResults: ', e);
      if (!isMounted) return;
      const values = e.value && e.value.length > 0 ? e.value : [];
      setResults(values);
      addLog('onSpeechResults', values.join(' | '));
    };

    Voice.onSpeechPartialResults = (e: SpeechResultsEvent) => {
      console.log('onSpeechPartialResults: ', e);
      if (!isMounted) return;
      const values = e.value && e.value.length > 0 ? e.value : [];
      setPartialResults(values);
      if (values.length > 0 && values[0]) {
        addLog('onSpeechPartialResults', values[0]);
      }
    };

    Voice.onSpeechVolumeChanged = (e: SpeechVolumeChangeEvent) => {
      if (!isMounted) return;
      setPitch(typeof e.value === 'number' ? Math.round(e.value * 10) / 10 : null);
    };

    // Check recognition engine availability
    Voice.isAvailable()
      .then((available: 0 | 1) => {
        if (isMounted) {
          setIsAvailable(Boolean(available));
          addLog('Voice.isAvailable', available ? 'Ready' : 'Not available');
        }
      })
      .catch((err: unknown) => {
        if (isMounted) {
          setIsAvailable(false);
          addLog('Voice.isAvailable (error)', String(err));
        }
      });

    return () => {
      isMounted = false;
      Voice.destroy().then(Voice.removeAllListeners);
    };
  }, [addLog]);

  const handleStart = async () => {
    setError(null);
    setIsRecognized(false);
    setPitch(null);
    setResults([]);
    setPartialResults([]);

    try {
      addLog(`Starting recognition (${selectedLocale})...`);
      setIsRecording(true);
      await Voice.start(selectedLocale);
    } catch (err: any) {
      console.error(err);
      setIsRecording(false);
      setError(err?.message || String(err));
      addLog('start error', String(err));
    }
  };

  const handleStop = async () => {
    try {
      addLog('Stopping recognition...');
      setIsRecording(false);
      await Voice.stop();
    } catch (err: any) {
      console.error(err);
      setError(err?.message || String(err));
    }
  };

  const handleCancel = async () => {
    try {
      addLog('Cancelling recognition...');
      setIsRecording(false);
      setIsRecognized(false);
      await Voice.cancel();
    } catch (err: any) {
      console.error(err);
      setError(err?.message || String(err));
    }
  };

  const handleDestroy = async () => {
    try {
      addLog('Resetting recognizer instance...');
      setIsRecording(false);
      setIsRecognized(false);
      setPitch(null);
      setError(null);
      setResults([]);
      setPartialResults([]);
      await Voice.destroy();
    } catch (err: any) {
      console.error(err);
      setError(err?.message || String(err));
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      handleStop();
    } else {
      handleStart();
    }
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Save current speech results to transcript history
  const handleSaveNote = () => {
    const textToSave = results[0] || partialResults[0];
    if (!textToSave || !textToSave.trim()) {
      Alert.alert('No Text', 'Record speech first before saving a note.');
      return;
    }

    const trimmed = textToSave.trim();
    const wordCount = trimmed.split(/\s+/).filter(Boolean).length;
    const newNote: SavedNote = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      text: trimmed,
      locale: selectedLocale,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      words: wordCount,
    };

    setSavedNotes((prev) => [newNote, ...prev]);
    addLog('Saved Note', `Saved ${wordCount} words`);
    Alert.alert('Note Saved', `Transcript saved to your notes history below!`);
  };

  // Native share transcript
  const handleShare = async (text: string) => {
    try {
      await Share.share({
        message: text,
        title: 'Speech Recognition Transcript',
      });
      addLog('Transcript Shared');
    } catch (err: any) {
      Alert.alert('Share Error', err?.message || String(err));
    }
  };

  // Inspect Android Speech Recognition Services
  const handleQueryServices = async () => {
    if (Platform.OS === 'android') {
      try {
        const services = await Voice.getSpeechRecognitionServices();
        const list = services && services.length > 0 ? services : ['Default Android Speech Engine'];
        setSpeechServices(list);
        setShowServices(true);
        addLog('Speech Services Found', list.join(', '));
      } catch (err: any) {
        Alert.alert('Error', err?.message || 'Could not query speech services.');
      }
    } else {
      Alert.alert(
        'Speech Recognition on iOS',
        'iOS uses Apple’s high-precision on-device and cloud Speech Framework (SFSpeechRecognizer) automatically.',
      );
    }
  };

  // Select custom locale
  const handleApplyCustomLocale = () => {
    if (!customLocale.trim()) return;
    const clean = customLocale.trim();
    setSelectedLocale(clean);
    setShowCustomLocaleInput(false);
    addLog('Custom Locale Selected', clean);
  };

  // Stats calculation
  const currentText = results[0] || partialResults[0] || '';
  const currentWordCount = currentText.trim().split(/\s+/).filter(Boolean).length;
  const currentCharCount = currentText.length;

  const themeStyles = isDarkMode ? darkStyles : lightStyles;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: themeStyles.screenBg }]}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={themeStyles.screenBg}
      />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>

        {/* Top Header & Theme Switcher */}
        <View style={styles.header}>
          <View style={styles.headerTopRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: themeStyles.textPrimary }]}>React Native Voice</Text>
              <Text style={[styles.subtitle, { color: themeStyles.textSecondary }]}>
                Speech Recognition & Dictation Suite
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.themeToggle, { backgroundColor: themeStyles.cardBg, borderColor: themeStyles.cardBorder }]}
              onPress={() => setIsDarkMode(!isDarkMode)}
              activeOpacity={0.7}>
              <Text style={{ fontSize: 16 }}>{isDarkMode ? '☀️ Light' : '🌙 Dark'}</Text>
            </TouchableOpacity>
          </View>

          {/* Engine Status Badge */}
          <View style={styles.badgeContainer}>
            <View
              style={[
                styles.availabilityBadge,
                isAvailable === true
                  ? styles.badgeSuccess
                  : isAvailable === false
                  ? styles.badgeError
                  : styles.badgeNeutral,
              ]}>
              <View
                style={[
                  styles.statusDot,
                  isAvailable === true
                    ? styles.dotSuccess
                    : isAvailable === false
                    ? styles.dotError
                    : styles.dotNeutral,
                ]}
              />
              <Text style={styles.badgeText}>
                {isAvailable === true
                  ? 'Speech Engine Ready'
                  : isAvailable === false
                  ? 'Engine Unavailable'
                  : 'Checking Engine...'}
              </Text>
            </View>
          </View>
        </View>

        {/* Mode & Continuous Recognition Switch */}
        <View style={[styles.card, { backgroundColor: themeStyles.cardBg, borderColor: themeStyles.cardBorder }]}>
          <View style={styles.switchRow}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={[styles.settingTitle, { color: themeStyles.textPrimary }]}>
                Continuous Listening Mode
              </Text>
              <Text style={[styles.settingSubtitle, { color: themeStyles.textSecondary }]}>
                Automatically keeps dictation alive across pauses and speech breaks
              </Text>
            </View>
            <Switch
              value={continuousMode}
              onValueChange={(val: boolean) => {
                setContinuousMode(val);
                addLog('Continuous Mode', val ? 'Enabled' : 'Disabled');
              }}
              trackColor={{ false: '#cbd5e1', true: '#93c5fd' }}
              thumbColor={continuousMode ? '#2563eb' : '#f8fafc'}
            />
          </View>
        </View>

        {/* Language Selection */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionLabel, { color: themeStyles.textSecondary }]}>LANGUAGE & LOCALE</Text>
            <TouchableOpacity
              onPress={() => setShowCustomLocaleInput(!showCustomLocaleInput)}
              activeOpacity={0.7}>
              <Text style={styles.customLocaleLink}>
                {showCustomLocaleInput ? '✕ Close Custom' : '+ Custom Locale'}
              </Text>
            </TouchableOpacity>
          </View>

          {showCustomLocaleInput && (
            <View style={[styles.customLocaleBox, { backgroundColor: themeStyles.cardBg, borderColor: themeStyles.cardBorder }]}>
              <TextInput
                style={[styles.customInput, { color: themeStyles.textPrimary, borderColor: themeStyles.cardBorder }]}
                placeholder="e.g. nl-NL, sv-SE, tr-TR"
                placeholderTextColor={themeStyles.textSecondary}
                value={customLocale}
                onChangeText={setCustomLocale}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                style={styles.applyButton}
                onPress={handleApplyCustomLocale}
                activeOpacity={0.8}>
                <Text style={styles.applyButtonText}>Apply</Text>
              </TouchableOpacity>
            </View>
          )}

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.localeRow}>
            {SUPPORTED_LOCALES.map((locale: LocaleOption) => {
              const active = selectedLocale === locale.code;
              return (
                <TouchableOpacity
                  key={locale.code}
                  disabled={isRecording}
                  style={[
                    styles.localeChip,
                    { backgroundColor: themeStyles.cardBg, borderColor: themeStyles.cardBorder },
                    active && styles.localeChipActive,
                  ]}
                  onPress={() => setSelectedLocale(locale.code)}
                  activeOpacity={0.7}>
                  <Text
                    style={[
                      styles.localeChipText,
                      { color: themeStyles.textPrimary },
                      active && styles.localeChipTextActive,
                    ]}>
                    {locale.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Microphone Hero Section with Animated Equalizer Waveform */}
        <View style={[styles.heroCard, { backgroundColor: themeStyles.cardBg, borderColor: themeStyles.cardBorder }]}>
          {/* Recording Timer Badge */}
          {isRecording && (
            <View style={styles.timerBadge}>
              <View style={styles.recordingRedDot} />
              <Text style={styles.timerText}>{formatTimer(durationSeconds)}</Text>
            </View>
          )}

          <View style={styles.micWrapper}>
            {isRecording && (
              <Animated.View
                style={[
                  styles.pulseRing,
                  {
                    transform: [{ scale: pulseAnim }],
                  },
                ]}
              />
            )}
            <TouchableOpacity
              activeOpacity={0.85}
              style={[
                styles.micButton,
                isRecording ? styles.micButtonActive : styles.micButtonInactive,
              ]}
              onPress={toggleRecording}>
              <Image
                source={require('./button.png')}
                style={[styles.micIcon, isRecording && styles.micIconActive]}
                resizeMode="contain"
              />
            </TouchableOpacity>
          </View>

          <Text style={[styles.micPrompt, { color: themeStyles.textPrimary }]}>
            {isRecording
              ? continuousMode
                ? 'Continuous Listening... Tap to Stop'
                : 'Listening... Tap to Stop'
              : 'Tap Microphone to Speak'}
          </Text>

          {/* Real-time Dynamic 7-Bar Audio Waveform Equalizer */}
          <View style={styles.equalizerContainer}>
            {waveBars.map((barAnim, index) => (
              <Animated.View
                key={`eq-bar-${index}`}
                style={[
                  styles.equalizerBar,
                  {
                    height: barAnim,
                    backgroundColor: isRecording
                      ? '#3b82f6'
                      : isDarkMode
                      ? '#334155'
                      : '#cbd5e1',
                  },
                ]}
              />
            ))}
          </View>

          {/* Audio Input Level & Quick Metrics */}
          {isRecording && (
            <View style={styles.volumeContainer}>
              <Text style={[styles.volumeLabel, { color: themeStyles.textSecondary }]}>
                Audio Level: {pitch !== null ? `${pitch} dB` : 'Sampling...'}
              </Text>
              <View style={[styles.volumeTrack, { backgroundColor: isDarkMode ? '#334155' : '#e2e8f0' }]}>
                <View
                  style={[
                    styles.volumeFill,
                    {
                      width: `${Math.min(Math.max((pitch ?? 0) * 10, 8), 100)}%`,
                    },
                  ]}
                />
              </View>
            </View>
          )}

          {/* State indicators */}
          <View style={styles.statusChipsRow}>
            <View
              style={[
                styles.statusIndicator,
                { backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9' },
                isRecording && styles.statusIndicatorActive,
              ]}>
              <Text
                style={[
                  styles.statusIndicatorText,
                  { color: isRecording ? '#dc2626' : themeStyles.textSecondary },
                ]}>
                {isRecording ? '● Live Recording' : '○ Standby'}
              </Text>
            </View>
            <View
              style={[
                styles.statusIndicator,
                { backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9' },
                isRecognized && styles.statusIndicatorRecognized,
              ]}>
              <Text
                style={[
                  styles.statusIndicatorText,
                  { color: isRecognized ? '#2563eb' : themeStyles.textSecondary },
                ]}>
                {isRecognized ? '✓ Voice Detected' : '— Waiting Speech'}
              </Text>
            </View>
            {continuousMode && (
              <View style={[styles.statusIndicator, styles.continuousBadge]}>
                <Text style={styles.continuousBadgeText}>♾️ Loop</Text>
              </View>
            )}
          </View>
        </View>

        {/* Action Controls Toolbar */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionButton, styles.stopButton]}
            onPress={handleStop}
            activeOpacity={0.7}
            disabled={!isRecording}>
            <Text style={styles.stopButtonText}>Stop</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.cancelButton, { backgroundColor: themeStyles.cardBg, borderColor: themeStyles.cardBorder }]}
            onPress={handleCancel}
            activeOpacity={0.7}>
            <Text style={[styles.cancelButtonText, { color: themeStyles.textPrimary }]}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.destroyButton, { backgroundColor: themeStyles.cardBg, borderColor: themeStyles.cardBorder }]}
            onPress={handleDestroy}
            activeOpacity={0.7}>
            <Text style={[styles.destroyButtonText, { color: themeStyles.textSecondary }]}>Reset</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.saveButton]}
            onPress={handleSaveNote}
            activeOpacity={0.7}
            disabled={results.length === 0 && partialResults.length === 0}>
            <Text style={styles.saveButtonText}>💾 Save Note</Text>
          </TouchableOpacity>
        </View>

        {/* Live Speech Metrics Bar */}
        {(currentWordCount > 0 || currentCharCount > 0) && (
          <View style={[styles.metricsBar, { backgroundColor: themeStyles.cardBg, borderColor: themeStyles.cardBorder }]}>
            <View style={styles.metricItem}>
              <Text style={[styles.metricValue, { color: themeStyles.textPrimary }]}>{currentWordCount}</Text>
              <Text style={[styles.metricLabel, { color: themeStyles.textSecondary }]}>Words</Text>
            </View>
            <View style={[styles.metricDivider, { backgroundColor: themeStyles.cardBorder }]} />
            <View style={styles.metricItem}>
              <Text style={[styles.metricValue, { color: themeStyles.textPrimary }]}>{currentCharCount}</Text>
              <Text style={[styles.metricLabel, { color: themeStyles.textSecondary }]}>Characters</Text>
            </View>
            <View style={[styles.metricDivider, { backgroundColor: themeStyles.cardBorder }]} />
            <View style={styles.metricItem}>
              <Text style={[styles.metricValue, { color: '#2563eb' }]}>{selectedLocale}</Text>
              <Text style={[styles.metricLabel, { color: themeStyles.textSecondary }]}>Language</Text>
            </View>
          </View>
        )}

        {/* Error Notification Card */}
        {error && (
          <View style={styles.errorCard}>
            <Text style={styles.errorHeader}>⚠️ Recognition Error</Text>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Live Streaming Partial Results */}
        {partialResults.length > 0 && (
          <View style={styles.partialCard}>
            <View style={styles.partialHeader}>
              <View style={styles.liveIndicator} />
              <Text style={styles.partialTitle}>STREAMING REAL-TIME TRANSCRIPT</Text>
            </View>
            {partialResults.map((item: string, index: number) => (
              <Text key={`partial-${index}`} style={styles.partialText}>
                "{item}"
              </Text>
            ))}
          </View>
        )}

        {/* Recognized Results Section & Multi-Hypotheses Picker */}
        <View style={[styles.resultsCard, { backgroundColor: themeStyles.cardBg, borderColor: themeStyles.cardBorder }]}>
          <View style={styles.resultsHeader}>
            <Text style={[styles.resultsTitle, { color: themeStyles.textPrimary }]}>Primary Recognized Text</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {results.length > 0 && (
                <>
                  <TouchableOpacity
                    onPress={() => handleShare(results[0] || '')}
                    style={styles.headerActionBtn}
                    activeOpacity={0.6}>
                    <Text style={styles.shareText}>📤 Share</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      setResults([]);
                      setPartialResults([]);
                    }}
                    style={styles.headerActionBtn}
                    activeOpacity={0.6}>
                    <Text style={[styles.clearText, { color: themeStyles.textSecondary }]}>Clear</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>

          {results.length === 0 ? (
            <Text style={[styles.emptyResultsText, { color: themeStyles.textSecondary }]}>
              {isRecording
                ? 'Listening to speech stream... Words will finalize here.'
                : 'No speech results yet. Tap the microphone and begin speaking.'}
            </Text>
          ) : (
            <View>
              {/* Highlighted Top Result */}
              <View style={[styles.primaryResultBox, { backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc', borderColor: themeStyles.cardBorder }]}>
                <Text style={[styles.primaryResultText, { color: themeStyles.textPrimary }]}>
                  {results[0]}
                </Text>
              </View>

              {/* Alternate Candidate Hypotheses if available */}
              {results.length > 1 && (
                <View style={styles.alternatesContainer}>
                  <Text style={[styles.alternatesHeader, { color: themeStyles.textSecondary }]}>
                    ALTERNATIVE INTERPRETATIONS (TAP TO SELECT):
                  </Text>
                  {results.slice(1).map((alt: string, index: number) => (
                    <TouchableOpacity
                      key={`alt-${index}`}
                      style={[styles.altItem, { borderColor: themeStyles.cardBorder }]}
                      activeOpacity={0.7}
                      onPress={() => {
                        // Swap candidate to top
                        const newResults = [alt, ...results.filter((_, i) => i !== index + 1)];
                        setResults(newResults);
                        addLog('Swapped Alternative', alt);
                      }}>
                      <Text style={[styles.altIndex, { color: themeStyles.textSecondary }]}>#{index + 2}</Text>
                      <Text style={[styles.altText, { color: themeStyles.textPrimary }]}>{alt}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          )}
        </View>

        {/* Saved Notes & Transcripts History */}
        {savedNotes.length > 0 && (
          <View style={[styles.card, { backgroundColor: themeStyles.cardBg, borderColor: themeStyles.cardBorder }]}>
            <View style={styles.resultsHeader}>
              <Text style={[styles.resultsTitle, { color: themeStyles.textPrimary }]}>
                Saved Notes ({savedNotes.length})
              </Text>
              <TouchableOpacity
                onPress={() => setSavedNotes([])}
                activeOpacity={0.6}>
                <Text style={[styles.clearText, { color: themeStyles.textSecondary }]}>Clear All</Text>
              </TouchableOpacity>
            </View>

            {savedNotes.map((note) => (
              <View key={note.id} style={[styles.noteCard, { borderColor: themeStyles.cardBorder, backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc' }]}>
                <View style={styles.noteMetaRow}>
                  <View style={styles.noteLocaleBadge}>
                    <Text style={styles.noteLocaleText}>{note.locale}</Text>
                  </View>
                  <Text style={[styles.noteTime, { color: themeStyles.textSecondary }]}>{note.time}</Text>
                  <Text style={[styles.noteWords, { color: themeStyles.textSecondary }]}>• {note.words} words</Text>
                  <View style={{ flex: 1 }} />
                  <TouchableOpacity
                    onPress={() => handleShare(note.text)}
                    style={styles.noteAction}
                    activeOpacity={0.7}>
                    <Text style={styles.noteActionText}>Share</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setSavedNotes((prev) => prev.filter((n) => n.id !== note.id))}
                    style={styles.noteAction}
                    activeOpacity={0.7}>
                    <Text style={[styles.noteActionText, { color: '#ef4444' }]}>Delete</Text>
                  </TouchableOpacity>
                </View>
                <Text style={[styles.noteContent, { color: themeStyles.textPrimary }]}>{note.text}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Platform Diagnostics & Speech Services Inspector */}
        <View style={[styles.card, { backgroundColor: themeStyles.cardBg, borderColor: themeStyles.cardBorder }]}>
          <TouchableOpacity
            style={styles.diagnosticsHeader}
            onPress={handleQueryServices}
            activeOpacity={0.7}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.diagnosticsTitle, { color: themeStyles.textPrimary }]}>
                🔍 Engine & System Diagnostics
              </Text>
              <Text style={[styles.diagnosticsSubtitle, { color: themeStyles.textSecondary }]}>
                Platform: {Platform.OS.toUpperCase()} {Platform.Version} | Tap to inspect services
              </Text>
            </View>
            <Text style={styles.inspectBtnText}>Inspect</Text>
          </TouchableOpacity>

          {showServices && speechServices && (
            <View style={[styles.servicesContent, { borderTopColor: themeStyles.cardBorder }]}>
              <Text style={[styles.servicesTitle, { color: themeStyles.textSecondary }]}>DETECTED RECOGNITION ENGINES:</Text>
              {speechServices.map((service, idx) => (
                <Text key={`srv-${idx}`} style={[styles.serviceItem, { color: themeStyles.textPrimary }]}>
                  • {service}
                </Text>
              ))}
            </View>
          )}
        </View>

        {/* Event Logs Accordion */}
        <View style={[styles.logsCard, { borderColor: themeStyles.cardBorder }]}>
          <TouchableOpacity
            style={[styles.logsHeader, { backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc' }]}
            onPress={() => setShowLogs(!showLogs)}
            activeOpacity={0.7}>
            <Text style={[styles.logsTitle, { color: themeStyles.textPrimary }]}>
              Debug Event Logs ({logs.length})
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {logs.length > 0 && (
                <TouchableOpacity
                  onPress={() => setLogs([])}
                  style={{ marginRight: 12 }}
                  activeOpacity={0.6}>
                  <Text style={{ fontSize: 11, color: '#ef4444', fontWeight: '600' }}>Clear</Text>
                </TouchableOpacity>
              )}
              <Text style={[styles.logsChevron, { color: themeStyles.textSecondary }]}>
                {showLogs ? '▲ Hide' : '▼ Show'}
              </Text>
            </View>
          </TouchableOpacity>

          {showLogs && (
            <View style={styles.logsContent}>
              {logs.length === 0 ? (
                <Text style={styles.emptyLogText}>No events recorded yet</Text>
              ) : (
                logs.map((log: LogEntry) => (
                  <View key={log.id} style={styles.logItem}>
                    <Text style={styles.logTime}>{log.time}</Text>
                    <View style={styles.logBody}>
                      <Text style={styles.logEventName}>{log.title}</Text>
                      {log.details ? (
                        <Text style={styles.logDetails}>{log.details}</Text>
                      ) : null}
                    </View>
                  </View>
                ))
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// Theme configurations
const lightStyles = {
  screenBg: '#f8fafc',
  cardBg: '#ffffff',
  cardBorder: '#e2e8f0',
  textPrimary: '#0f172a',
  textSecondary: '#64748b',
};

const darkStyles = {
  screenBg: '#090d16',
  cardBg: '#131b2e',
  cardBorder: '#23324d',
  textPrimary: '#f8fafc',
  textSecondary: '#94a3b8',
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 16,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    marginTop: 3,
    fontWeight: '500',
  },
  themeToggle: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  badgeContainer: {
    marginTop: 10,
    alignSelf: 'flex-start',
  },
  availabilityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  badgeSuccess: {
    backgroundColor: '#dcfce7',
  },
  badgeError: {
    backgroundColor: '#fee2e2',
  },
  badgeNeutral: {
    backgroundColor: '#f1f5f9',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  dotSuccess: {
    backgroundColor: '#16a34a',
  },
  dotError: {
    backgroundColor: '#dc2626',
  },
  dotNeutral: {
    backgroundColor: '#94a3b8',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  settingSubtitle: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  section: {
    marginBottom: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  customLocaleLink: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563eb',
  },
  customLocaleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    padding: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  customInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    fontSize: 13,
    borderWidth: 1,
    borderRadius: 8,
    marginRight: 8,
  },
  applyButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  applyButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 12,
  },
  localeRow: {
    flexDirection: 'row',
  },
  localeChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 8,
  },
  localeChipActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  localeChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  localeChipTextActive: {
    color: '#ffffff',
  },
  heroCard: {
    borderRadius: 24,
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderWidth: 1,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
    marginBottom: 16,
    position: 'relative',
  },
  timerBadge: {
    position: 'absolute',
    top: 14,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fee2e2',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
  },
  recordingRedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#dc2626',
    marginRight: 6,
  },
  timerText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#b91c1c',
    fontVariant: ['tabular-nums'],
  },
  micWrapper: {
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginTop: 8,
    marginBottom: 14,
  },
  pulseRing: {
    position: 'absolute',
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#ef4444',
    opacity: 0.25,
  },
  micButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  micButtonActive: {
    backgroundColor: '#dc2626',
  },
  micButtonInactive: {
    backgroundColor: '#2563eb',
  },
  micIcon: {
    width: 42,
    height: 42,
    tintColor: '#ffffff',
  },
  micIconActive: {
    tintColor: '#ffffff',
  },
  micPrompt: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 10,
    textAlign: 'center',
  },
  equalizerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    marginBottom: 10,
  },
  equalizerBar: {
    width: 6,
    marginHorizontal: 4,
    borderRadius: 3,
  },
  volumeContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 6,
  },
  volumeLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
  },
  volumeTrack: {
    width: '60%',
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  volumeFill: {
    height: '100%',
    backgroundColor: '#10b981',
    borderRadius: 3,
  },
  statusChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 8,
  },
  statusIndicator: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginHorizontal: 3,
    marginVertical: 2,
  },
  statusIndicatorActive: {
    backgroundColor: '#fee2e2',
  },
  statusIndicatorRecognized: {
    backgroundColor: '#dbeafe',
  },
  statusIndicatorText: {
    fontSize: 11,
    fontWeight: '600',
  },
  continuousBadge: {
    backgroundColor: '#e0e7ff',
  },
  continuousBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4338ca',
  },
  actionRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginHorizontal: 3,
  },
  stopButton: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  stopButtonText: {
    color: '#b91c1c',
    fontWeight: '700',
    fontSize: 12,
  },
  cancelButton: {
    borderWidth: 1,
  },
  cancelButtonText: {
    fontWeight: '700',
    fontSize: 12,
  },
  destroyButton: {
    borderWidth: 1,
  },
  destroyButtonText: {
    fontWeight: '700',
    fontSize: 12,
  },
  saveButton: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  saveButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 12,
  },
  metricsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  metricItem: {
    alignItems: 'center',
    flex: 1,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '800',
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  metricDivider: {
    width: 1,
    height: 24,
  },
  errorCard: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  errorHeader: {
    color: '#991b1b',
    fontWeight: '700',
    fontSize: 13,
    marginBottom: 4,
  },
  errorText: {
    color: '#b91c1c',
    fontSize: 12,
    lineHeight: 16,
  },
  partialCard: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
  },
  partialHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  liveIndicator: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#3b82f6',
    marginRight: 6,
  },
  partialTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#1d4ed8',
    letterSpacing: 0.8,
  },
  partialText: {
    fontSize: 15,
    fontStyle: 'italic',
    color: '#1e40af',
    lineHeight: 20,
  },
  resultsCard: {
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 16,
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  resultsTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  headerActionBtn: {
    marginLeft: 12,
  },
  shareText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563eb',
  },
  clearText: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyResultsText: {
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 18,
  },
  primaryResultBox: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  primaryResultText: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600',
  },
  alternatesContainer: {
    marginTop: 10,
  },
  alternatesHeader: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.7,
    marginBottom: 8,
  },
  altItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  altIndex: {
    fontSize: 11,
    fontWeight: '700',
    width: 24,
  },
  altText: {
    flex: 1,
    fontSize: 13,
  },
  noteCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
  },
  noteMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  noteLocaleBadge: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginRight: 6,
  },
  noteLocaleText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1d4ed8',
  },
  noteTime: {
    fontSize: 11,
    fontWeight: '500',
    marginRight: 4,
  },
  noteWords: {
    fontSize: 11,
  },
  noteAction: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 6,
  },
  noteActionText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563eb',
  },
  noteContent: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  diagnosticsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  diagnosticsTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  diagnosticsSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  inspectBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563eb',
    paddingHorizontal: 8,
  },
  servicesContent: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  servicesTitle: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  serviceItem: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginBottom: 4,
  },
  logsCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  logsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
  },
  logsTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  logsChevron: {
    fontSize: 12,
    fontWeight: '600',
  },
  logsContent: {
    padding: 12,
    backgroundColor: '#0f172a',
  },
  emptyLogText: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    paddingVertical: 8,
  },
  logItem: {
    flexDirection: 'row',
    paddingVertical: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#1e293b',
  },
  logTime: {
    fontSize: 10,
    color: '#64748b',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginRight: 8,
    marginTop: 2,
  },
  logBody: {
    flex: 1,
  },
  logEventName: {
    fontSize: 11,
    fontWeight: '600',
    color: '#38bdf8',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  logDetails: {
    fontSize: 11,
    color: '#94a3b8',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginTop: 1,
  },
});

export default VoiceTest;
