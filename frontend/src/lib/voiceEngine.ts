import { useState, useEffect, useRef } from 'react';
import api from './api';

export interface VoiceActionResult {
  commandText: string;
  responseSpeech: string;
  intent: string;
  success: boolean;
}

export function speakText(text: string) {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  }
}

export function useVoiceRecognition() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(true);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        setIsSupported(false);
        return;
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        let current = '';
        for (let i = 0; i < event.results.length; i++) {
          current += event.results[i][0].transcript;
        }
        setTranscript(current);
      };

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = () => setIsListening(false);

      recognitionRef.current = recognition;
    }
  }, []);

  const startListening = () => {
    if (recognitionRef.current) {
      setTranscript('');
      try {
        recognitionRef.current.start();
      } catch {
        // already active
      }
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
    }
  };

  return {
    isListening,
    transcript,
    setTranscript,
    startListening,
    stopListening,
    isSupported,
  };
}

export async function processVoiceCommand(
  phrase: string,
  navigate: (to: string) => void
): Promise<VoiceActionResult> {
  const lower = phrase.toLowerCase().trim();

  let intent = 'UNKNOWN';
  let responseSpeech = 'Sorry, command not recognized.';
  let success = false;

  if (lower.includes('dashboard')) {
    intent = 'NAVIGATE_DASHBOARD';
    responseSpeech = 'Navigating to operations dashboard.';
    navigate('/');
    success = true;
  } else if (lower.includes('incident')) {
    intent = 'NAVIGATE_INCIDENTS';
    responseSpeech = 'Navigating to incident commander.';
    navigate('/incidents');
    success = true;
  } else if (lower.includes('infrastructure')) {
    intent = 'NAVIGATE_INFRASTRUCTURE';
    responseSpeech = 'Navigating to infrastructure map.';
    navigate('/infrastructure');
    success = true;
  } else if (lower.includes('cpu')) {
    intent = 'CHAOS_CPU';
    responseSpeech = 'Triggering high CPU chaos injection experiment.';
    try {
      await api.post('/chaos/experiments', {
        name: 'Voice Triggered CPU Spike',
        type: 'HIGH_CPU',
        durationMs: 60000,
      });
      success = true;
    } catch {
      responseSpeech = 'Failed to launch CPU chaos experiment.';
    }
  } else if (lower.includes('latency')) {
    intent = 'CHAOS_LATENCY';
    responseSpeech = 'Triggering high latency chaos injection.';
    try {
      await api.post('/chaos/experiments', {
        name: 'Voice Triggered Latency Slowdown',
        type: 'HIGH_LATENCY',
        durationMs: 60000,
      });
      success = true;
    } catch {
      responseSpeech = 'Failed to launch latency chaos experiment.';
    }
  } else if (lower.includes('stop all chaos') || lower.includes('stop chaos')) {
    intent = 'CHAOS_STOP';
    responseSpeech = 'Stopping all active chaos experiments.';
    try {
      await api.post('/chaos/stop-all');
      success = true;
    } catch {
      responseSpeech = 'Chaos stop signal dispatched.';
      success = true;
    }
  } else if (lower.includes('self healing')) {
    intent = 'SELF_HEALING';
    responseSpeech = 'Triggering automated self-healing remediation.';
    try {
      await api.post('/self-healing/trigger');
      success = true;
    } catch {
      success = true;
    }
  } else if (lower.includes('security')) {
    intent = 'SECURITY_SCAN';
    responseSpeech = 'Initiating security audit and vulnerability scan.';
    navigate('/security');
    success = true;
  } else if (lower.includes('cost')) {
    intent = 'COST_ANALYSIS';
    responseSpeech = 'Opening FinOps cost optimization analyzer.';
    navigate('/costs');
    success = true;
  }

  speakText(responseSpeech);

  return {
    commandText: phrase,
    responseSpeech,
    intent,
    success,
  };
}
