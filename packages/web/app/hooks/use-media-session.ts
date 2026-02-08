'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useQueueContext } from '../components/graphql-queue';

/**
 * Hook that integrates with the Media Session API to allow controlling
 * the climb queue from OS-level media controls (iOS Control Center,
 * Android notification shade, lock screen, etc.)
 *
 * Maps media controls to queue actions:
 * - Next Track -> Next climb in queue
 * - Previous Track -> Previous climb in queue
 *
 * Requires a silent audio element to be "playing" to activate the
 * media session on iOS Safari.
 */
export function useMediaSession() {
  const {
    currentClimb,
    getNextClimbQueueItem,
    getPreviousClimbQueueItem,
    setCurrentClimbQueueItem,
    viewOnlyMode,
  } = useQueueContext();

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const blobUrlRef = useRef<string | null>(null);
  const [isActive, setIsActive] = useState(false);

  // Create a silent WAV audio element
  const createSilentAudio = useCallback(() => {
    if (typeof window === 'undefined' || audioRef.current) return;

    // Generate a 1-second silent WAV file (44-byte header + PCM silence)
    const sampleRate = 8000;
    const numSamples = sampleRate;
    const dataSize = numSamples * 2; // 16-bit = 2 bytes per sample
    const fileSize = 44 + dataSize;

    const buffer = new ArrayBuffer(fileSize);
    const view = new DataView(buffer);

    const writeString = (offset: number, str: string) => {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, fileSize - 8, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM format
    view.setUint16(22, 1, true); // Mono
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, dataSize, true);
    // Data bytes are already 0 (silence)

    const blob = new Blob([buffer], { type: 'audio/wav' });
    const url = URL.createObjectURL(blob);
    blobUrlRef.current = url;

    const audio = new Audio(url);
    audio.loop = true;
    audio.volume = 0.01; // Near-silent but nonzero for iOS
    audioRef.current = audio;
  }, []);

  // Activate the media session by playing silent audio.
  // Must be called from a user gesture on iOS.
  const activate = useCallback(() => {
    if (typeof window === 'undefined' || !('mediaSession' in navigator)) return;
    if (isActive) return;

    createSilentAudio();
    const audio = audioRef.current;
    if (!audio) return;

    const playPromise = audio.play();
    if (playPromise) {
      playPromise
        .then(() => {
          setIsActive(true);
        })
        .catch(() => {
          // Autoplay blocked - needs user gesture
        });
    }
  }, [createSilentAudio, isActive]);

  // Deactivate the media session
  const deactivate = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
      audioRef.current = null;
    }
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
    setIsActive(false);
  }, []);

  // Update metadata when the current climb changes
  useEffect(() => {
    if (typeof window === 'undefined' || !('mediaSession' in navigator)) return;
    if (!isActive) return;

    if (currentClimb) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentClimb.name || 'Unknown Climb',
        artist: currentClimb.difficulty
          ? `${currentClimb.difficulty} · ${currentClimb.setter_username}`
          : currentClimb.setter_username,
        album: 'Boardsesh',
        artwork: [
          {
            src: '/favicon.ico',
            sizes: '48x48',
            type: 'image/x-icon',
          },
        ],
      });
    } else {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: 'No climb selected',
        artist: 'Boardsesh',
        album: 'Boardsesh',
      });
    }
  }, [currentClimb, isActive]);

  // Register action handlers when active
  useEffect(() => {
    if (typeof window === 'undefined' || !('mediaSession' in navigator)) return;
    if (!isActive) return;

    const handleNextTrack = () => {
      if (viewOnlyMode) return;
      const nextClimb = getNextClimbQueueItem();
      if (nextClimb) {
        setCurrentClimbQueueItem(nextClimb);
      }
    };

    const handlePreviousTrack = () => {
      if (viewOnlyMode) return;
      const previousClimb = getPreviousClimbQueueItem();
      if (previousClimb) {
        setCurrentClimbQueueItem(previousClimb);
      }
    };

    // Keep playback state as "playing" so the controls stay visible
    const handlePlay = () => {
      audioRef.current?.play().catch(() => {});
      navigator.mediaSession.playbackState = 'playing';
    };

    const handlePause = () => {
      // Don't actually pause - keep the session alive so controls remain visible
      navigator.mediaSession.playbackState = 'playing';
      if (audioRef.current?.paused) {
        audioRef.current.play().catch(() => {});
      }
    };

    try {
      navigator.mediaSession.setActionHandler('nexttrack', handleNextTrack);
      navigator.mediaSession.setActionHandler('previoustrack', handlePreviousTrack);
      navigator.mediaSession.setActionHandler('play', handlePlay);
      navigator.mediaSession.setActionHandler('pause', handlePause);
      navigator.mediaSession.playbackState = 'playing';
    } catch {
      // Some handlers may not be supported on all browsers
    }

    return () => {
      try {
        navigator.mediaSession.setActionHandler('nexttrack', null);
        navigator.mediaSession.setActionHandler('previoustrack', null);
        navigator.mediaSession.setActionHandler('play', null);
        navigator.mediaSession.setActionHandler('pause', null);
      } catch {
        // Cleanup errors can be ignored
      }
    };
  }, [isActive, getNextClimbQueueItem, getPreviousClimbQueueItem, setCurrentClimbQueueItem, viewOnlyMode]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.removeAttribute('src');
        audioRef.current.load();
        audioRef.current = null;
      }
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, []);

  return {
    /** Call from a user gesture to activate media session controls */
    activate,
    /** Deactivate media session controls */
    deactivate,
    /** Whether the media session is currently active */
    isActive,
  };
}
