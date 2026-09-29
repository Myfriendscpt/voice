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
  { code: 'es-ES', label: 'Español' },
  { code: 'fr-FR', label: 'Français' },
  { code: 'de-DE', label: 'Deutsch' },
  { code: 'ja-JP', label: '日本語' },
  { code: 'zh-CN', label: '中文' },
];

interface LogEntry {
  id: string;
  time: string;
  title: string;
  details?: string;
}

const VoiceTest = () => {
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isRecognized, setIsRecognized] = useState<boolean>(false);
  const [pitch, setPitch] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<string[]>([]);
  const [partialResults, setPartialResults] = useState<string[]>([]);
  const [selectedLocale, setSelectedLocale] = useState<string>('en-US');
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [showLogs, setShowLogs] = useState<boolean>(false);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseLoop = useRef<Animated.CompositeAnimation | null>(null);

  const addLog = useCallback((title: string, details?: string) => {
    const timeStr = new Date().toLocaleTimeString();
    setLogs((prev: LogEntry[]) => [
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        time: timeStr,
        title,
        details,
      },
      ...prev.slice(0, 24),
    ]);
  }, []);

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
      addLog('onSpeechRecognized', e?.isFinal ? 'Final' : undefined);
    };

    Voice.onSpeechEnd = (e: SpeechEndEvent) => {
      console.log('onSpeechEnd: ', e);
      if (!isMounted) return;
      setIsRecording(false);
      addLog('onSpeechEnd');
    };

    Voice.onSpeechError = (e: SpeechErrorEvent) => {
      console.log('onSpeechError: ', e);
      if (!isMounted) return;
      setIsRecording(false);
      const errMsg = e.error?.message || JSON.stringify(e.error);
      setError(errMsg);
      addLog('onSpeechError', errMsg);
    };

    Voice.onSpeechResults = (e: SpeechResultsEvent) => {
      console.log('onSpeechResults: ', e);
      if (!isMounted) return;
      const values = e.value && e.value.length > 0 ? e.value : [];
      setResults(values);
      addLog('onSpeechResults', values.join(', '));
    };

    Voice.onSpeechPartialResults = (e: SpeechResultsEvent) => {
      console.log('onSpeechPartialResults: ', e);
      if (!isMounted) return;
      const values = e.value && e.value.length > 0 ? e.value : [];
      setPartialResults(values);
      if (values.length > 0) {
        addLog('onSpeechPartialResults', values[0]);
      }
    };

    Voice.onSpeechVolumeChanged = (e: SpeechVolumeChangeEvent) => {
      if (!isMounted) return;
      setPitch(typeof e.value === 'number' ? Math.round(e.value * 10) / 10 : null);
    };

    // Check recognition availability
    Voice.isAvailable()
      .then((available: 0 | 1) => {
        if (isMounted) {
          setIsAvailable(Boolean(available));
          addLog('Voice.isAvailable', available ? 'true' : 'false');
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
      await Voice.start(selectedLocale);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || String(err));
      addLog('start error', String(err));
    }
  };

  const handleStop = async () => {
    try {
      addLog('Stopping recognition...');
      await Voice.stop();
      setIsRecording(false);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || String(err));
    }
  };

  const handleCancel = async () => {
    try {
      addLog('Cancelling recognition...');
      await Voice.cancel();
      setIsRecording(false);
      setIsRecognized(false);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || String(err));
    }
  };

  const handleDestroy = async () => {
    try {
      addLog('Destroying instance...');
      await Voice.destroy();
      setIsRecording(false);
      setIsRecognized(false);
      setPitch(null);
      setError(null);
      setResults([]);
      setPartialResults([]);
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>React Native Voice</Text>
          <Text style={styles.subtitle}>Speech Recognition Demo</Text>
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

        {/* Language Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>LANGUAGE</Text>
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
                  style={[styles.localeChip, active && styles.localeChipActive]}
                  onPress={() => setSelectedLocale(locale.code)}
                  activeOpacity={0.7}>
                  <Text
                    style={[
                      styles.localeChipText,
                      active && styles.localeChipTextActive,
                    ]}>
                    {locale.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Microphone Hero Section */}
        <View style={styles.heroCard}>
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

          <Text style={styles.micPrompt}>
            {isRecording ? 'Listening... Tap to Stop' : 'Tap to Start Speaking'}
          </Text>

          {/* Volume Indicator */}
          {isRecording && (
            <View style={styles.volumeContainer}>
              <Text style={styles.volumeLabel}>
                Input Level: {pitch !== null ? `${pitch}` : '—'}
              </Text>
              <View style={styles.volumeTrack}>
                <View
                  style={[
                    styles.volumeFill,
                    {
                      width: `${Math.min(Math.max((pitch ?? 0) * 10, 5), 100)}%`,
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
                isRecording && styles.statusIndicatorActive,
              ]}>
              <Text style={styles.statusIndicatorText}>
                {isRecording ? '● Recording' : '○ Idle'}
              </Text>
            </View>
            <View
              style={[
                styles.statusIndicator,
                isRecognized && styles.statusIndicatorRecognized,
              ]}>
              <Text style={styles.statusIndicatorText}>
                {isRecognized ? '✓ Recognized' : '— Pending'}
              </Text>
            </View>
          </View>
        </View>

        {/* Controls Toolbar */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionButton, styles.stopButton]}
            onPress={handleStop}
            activeOpacity={0.7}
            disabled={!isRecording}>
            <Text style={styles.stopButtonText}>Stop</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.cancelButton]}
            onPress={handleCancel}
            activeOpacity={0.7}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.destroyButton]}
            onPress={handleDestroy}
            activeOpacity={0.7}>
            <Text style={styles.destroyButtonText}>Reset</Text>
          </TouchableOpacity>
        </View>

        {/* Error Card */}
        {error && (
          <View style={styles.errorCard}>
            <Text style={styles.errorHeader}>⚠️ Error</Text>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Live Partial Results */}
        {partialResults.length > 0 && (
          <View style={styles.partialCard}>
            <View style={styles.partialHeader}>
              <View style={styles.liveIndicator} />
              <Text style={styles.partialTitle}>LIVE TRANSCRIPT</Text>
            </View>
            {partialResults.map((item: string, index: number) => (
              <Text key={`partial-${index}`} style={styles.partialText}>
                "{item}"
              </Text>
            ))}
          </View>
        )}

        {/* Final Results */}
        <View style={styles.resultsCard}>
          <View style={styles.resultsHeader}>
            <Text style={styles.resultsTitle}>Recognized Results</Text>
            {results.length > 0 && (
              <TouchableOpacity
                onPress={() => setResults([])}
                activeOpacity={0.6}>
                <Text style={styles.clearText}>Clear</Text>
              </TouchableOpacity>
            )}
          </View>

          {results.length === 0 ? (
            <Text style={styles.emptyResultsText}>
              No speech results yet. Speak clearly into the microphone.
            </Text>
          ) : (
            results.map((result: string, index: number) => (
              <View key={`result-${index}`} style={styles.resultItem}>
                <View style={styles.resultIndexBadge}>
                  <Text style={styles.resultIndexText}>#{index + 1}</Text>
                </View>
                <Text style={styles.resultItemText}>{result}</Text>
              </View>
            ))
          )}
        </View>

        {/* Event Logs Accordion */}
        <View style={styles.logsCard}>
          <TouchableOpacity
            style={styles.logsHeader}
            onPress={() => setShowLogs(!showLogs)}
            activeOpacity={0.7}>
            <Text style={styles.logsTitle}>
              Debug Event Logs ({logs.length})
            </Text>
            <Text style={styles.logsChevron}>{showLogs ? '▲ Hide' : '▼ Show'}</Text>
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

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
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
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
    fontWeight: '500',
  },
  badgeContainer: {
    marginTop: 10,
  },
  availabilityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#e2e8f0',
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
  section: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
    letterSpacing: 1,
    marginBottom: 8,
  },
  localeRow: {
    flexDirection: 'row',
  },
  localeChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginRight: 8,
  },
  localeChipActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  localeChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  localeChipTextActive: {
    color: '#ffffff',
  },
  heroCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
    marginBottom: 16,
  },
  micWrapper: {
    width: 110,
    height: 110,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginBottom: 16,
  },
  pulseRing: {
    position: 'absolute',
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: '#ef4444',
    opacity: 0.25,
  },
  micButton: {
    width: 84,
    height: 84,
    borderRadius: 42,
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
    width: 44,
    height: 44,
    tintColor: '#ffffff',
  },
  micIconActive: {
    tintColor: '#ffffff',
  },
  micPrompt: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8,
  },
  volumeContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 6,
  },
  volumeLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 4,
  },
  volumeTrack: {
    width: '60%',
    height: 6,
    backgroundColor: '#e2e8f0',
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
    marginTop: 12,
  },
  statusIndicator: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    marginHorizontal: 4,
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
    color: '#475569',
  },
  actionRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginHorizontal: 4,
  },
  stopButton: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  stopButtonText: {
    color: '#b91c1c',
    fontWeight: '700',
    fontSize: 13,
  },
  cancelButton: {
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
  },
  cancelButtonText: {
    color: '#475569',
    fontWeight: '700',
    fontSize: 13,
  },
  destroyButton: {
    backgroundColor: '#f8fafc',
    borderColor: '#cbd5e1',
  },
  destroyButtonText: {
    color: '#64748b',
    fontWeight: '700',
    fontSize: 13,
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
    fontSize: 11,
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
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
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
    color: '#0f172a',
  },
  clearText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '600',
  },
  emptyResultsText: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
    paddingVertical: 18,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f1f5f9',
  },
  resultIndexBadge: {
    backgroundColor: '#f1f5f9',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginRight: 10,
    marginTop: 2,
  },
  resultIndexText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  resultItemText: {
    flex: 1,
    fontSize: 14,
    color: '#1e293b',
    lineHeight: 20,
    fontWeight: '500',
  },
  logsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  logsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#f8fafc',
  },
  logsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  logsChevron: {
    fontSize: 12,
    color: '#64748b',
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

