import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, RotateCcw, RotateCw } from 'lucide-react';

interface CustomVideoPlayerProps {
  src: string;
  trackingNumber?: string;
  timestamp?: string;
  fallbackDurationSeconds?: number;
  onError?: () => void;
  autoPlay?: boolean;
}

export const CustomVideoPlayer: React.FC<CustomVideoPlayerProps> = ({
  src,
  trackingNumber,
  timestamp,
  fallbackDurationSeconds = 30,
  onError,
  autoPlay = true,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(fallbackDurationSeconds);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isControlsVisible, setIsControlsVisible] = useState(true);

  // Initialize and sync src changes
  useEffect(() => {
    setCurrentTime(0);
    setIsPlaying(false);
    if (fallbackDurationSeconds > 0) {
      setDuration(fallbackDurationSeconds);
    }
  }, [src, fallbackDurationSeconds]);

  const handleLoadedMetadata = () => {
    const v = videoRef.current;
    if (!v) return;

    if (isFinite(v.duration) && !isNaN(v.duration) && v.duration > 0) {
      setDuration(v.duration);
    } else if (fallbackDurationSeconds > 0) {
      setDuration(fallbackDurationSeconds);
    }

    if (autoPlay) {
      v.play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    }
  };

  const handleTimeUpdate = () => {
    const v = videoRef.current;
    if (!v) return;

    setCurrentTime(v.currentTime);

    if (isFinite(v.duration) && !isNaN(v.duration) && v.duration > 0) {
      setDuration(v.duration);
    }
  };

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;

    if (v.paused) {
      v.play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    } else {
      v.pause();
      setIsPlaying(false);
    }
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const changePlaybackRate = () => {
    const v = videoRef.current;
    if (!v) return;

    const rates = [1, 1.25, 1.5, 2];
    const currentIndex = rates.indexOf(playbackRate);
    const nextRate = rates[(currentIndex + 1) % rates.length];

    v.playbackRate = nextRate;
    setPlaybackRate(nextRate);
  };

  const toggleFullscreen = () => {
    const v = videoRef.current;
    if (!v) return;

    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      v.requestFullscreen().catch(() => {});
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const bar = progressBarRef.current;
    const v = videoRef.current;
    if (!bar || !v) return;

    const rect = bar.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    if (width <= 0) return;

    const ratio = Math.max(0, Math.min(1, clickX / width));
    const targetDuration = (isFinite(v.duration) && v.duration > 0) ? v.duration : (duration || fallbackDurationSeconds || 30);
    const targetTime = ratio * targetDuration;

    try {
      v.currentTime = targetTime;
      setCurrentTime(targetTime);
    } catch (err) {
      console.warn('Seeking notice:', err);
    }
  };

  const skipTime = (seconds: number) => {
    const v = videoRef.current;
    if (!v) return;

    const targetDuration = (isFinite(v.duration) && v.duration > 0) ? v.duration : (duration || fallbackDurationSeconds || 30);
    const nextTime = Math.max(0, Math.min(targetDuration, v.currentTime + seconds));

    try {
      v.currentTime = nextTime;
      setCurrentTime(nextTime);
    } catch (e) {}
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const effectiveDuration = (isFinite(duration) && duration > 0) ? duration : (fallbackDurationSeconds || 30);
  const progressPercent = Math.max(0, Math.min(100, (currentTime / effectiveDuration) * 100));

  return (
    <div 
      className="relative w-full h-full bg-slate-950 rounded-xl overflow-hidden group select-none flex flex-col justify-center"
      onMouseEnter={() => setIsControlsVisible(true)}
      onMouseLeave={() => setIsControlsVisible(isPlaying ? false : true)}
    >
      <video
        ref={videoRef}
        src={src}
        className="w-full h-full object-contain cursor-pointer"
        onClick={togglePlay}
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        onEnded={() => setIsPlaying(false)}
        onError={onError}
        playsInline
      />

      {/* Dynamic Tracking Overlay (Top Right) */}
      {trackingNumber && (
        <div className="absolute top-3 right-3 pointer-events-none z-10 bg-slate-950/85 backdrop-blur-md px-2.5 py-1 rounded-lg border border-slate-750 text-[11px] font-mono text-emerald-400 flex items-center space-x-1.5 shadow-md">
          <span>RESI: {trackingNumber}</span>
        </div>
      )}

      {/* Dynamic Timestamp Overlay (Bottom Left) */}
      {timestamp && (
        <div className="absolute bottom-16 left-3 pointer-events-none z-10 bg-slate-950/85 backdrop-blur-md px-3 py-1 rounded-lg border border-slate-700 text-[11px] font-mono font-bold text-amber-400 flex items-center space-x-1.5 shadow-md">
          <span>{timestamp}</span>
        </div>
      )}

      {/* Custom Bottom Controls Bar */}
      <div 
        className={`absolute bottom-0 inset-x-0 bg-gradient-to-t from-slate-950/95 via-slate-950/80 to-transparent p-3 pt-6 flex flex-col space-y-2 transition-opacity duration-200 z-20 ${
          isControlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Interactive Seek Bar */}
        <div
          ref={progressBarRef}
          onClick={handleSeek}
          className="relative w-full h-2.5 bg-slate-800/90 hover:h-3.5 rounded-full cursor-pointer transition-all flex items-center group/bar"
          title="Geser posisi durasi video"
        >
          {/* Progress Bar Fill */}
          <div
            className="h-full bg-amber-400 rounded-full transition-all relative flex items-center justify-end"
            style={{ width: `${progressPercent}%` }}
          >
            {/* Knob Handler */}
            <div className="w-3.5 h-3.5 bg-white border-2 border-amber-500 rounded-full shadow-md transform translate-x-1.5 scale-0 group-hover/bar:scale-100 transition-transform" />
          </div>
        </div>

        {/* Buttons and Time Display Row */}
        <div className="flex items-center justify-between text-white text-xs">
          <div className="flex items-center space-x-3">
            {/* Play / Pause Button */}
            <button
              type="button"
              onClick={togglePlay}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-amber-400 hover:text-amber-300 transition-colors"
              title={isPlaying ? 'Jeda' : 'Putar'}
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-amber-400" />}
            </button>

            {/* Skip 5s Back / Forward */}
            <button
              type="button"
              onClick={() => skipTime(-5)}
              className="p-1 text-slate-300 hover:text-white transition-colors"
              title="Mundur 5 Detik"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => skipTime(5)}
              className="p-1 text-slate-300 hover:text-white transition-colors"
              title="Maju 5 Detik"
            >
              <RotateCw className="w-4 h-4" />
            </button>

            {/* Current Time / Duration Display */}
            <span className="font-mono text-xs font-bold text-slate-200 ml-1">
              {formatTime(currentTime)} / {formatTime(effectiveDuration)}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            {/* Playback Speed Switcher */}
            <button
              type="button"
              onClick={changePlaybackRate}
              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 font-mono text-[11px] font-bold text-amber-400 border border-slate-700 transition-colors"
              title="Kecepatan Putar Video"
            >
              {playbackRate}x
            </button>

            {/* Mute / Unmute Button */}
            <button
              type="button"
              onClick={toggleMute}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
              title={isMuted ? 'Buka Suara' : 'Mute Suara'}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
            </button>

            {/* Fullscreen Button */}
            <button
              type="button"
              onClick={toggleFullscreen}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
              title="Layar Penuh"
            >
              <Maximize className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
