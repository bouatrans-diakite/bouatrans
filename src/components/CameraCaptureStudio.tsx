import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import {
  Camera,
  CheckCircle2,
  Download,
  RefreshCw,
  Square,
  Upload,
  Video,
} from 'lucide-react';
import type { CapturedMediaItem } from '../types/logistics';
import { formatFileSize, triggerFileDownload } from '../utils/logistics';

interface CameraCaptureStudioProps {
  onCaptureSaved: (item: CapturedMediaItem, publishToShowcase: boolean) => void;
  defaultPublishToShowcase?: boolean;
  compact?: boolean;
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60)
    .toString()
    .padStart(2, '0');
  const s = (sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export function CameraCaptureStudio({
  onCaptureSaved,
  defaultPublishToShowcase = true,
  compact = false,
}: CameraCaptureStudioProps) {
  const [cameraActive, setCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [publishPublicly, setPublishPublicly] = useState(defaultPublishToShowcase);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<CapturedMediaItem | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<number | null>(null);

  const stopStream = () => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      try {
        recorderRef.current.stop();
      } catch {
        // Ignore stop errors
      }
    }
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) {
        track.stop();
      }
      streamRef.current = null;
    }
    setIsRecording(false);
    setCameraActive(false);
  };

  useEffect(() => {
    return () => {
      stopStream();
    };
  }, []);

  const startCamera = async (nextFacing = facingMode) => {
    setCameraError(null);
    stopStream();

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError(
        'Caméra temps réel non détectée dans ce navigateur. Utilisez « Photo directe », « Vidéo directe » ou « Importer fichiers » ci-dessous.',
      );
      return;
    }

    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: nextFacing },
          audio: true,
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: nextFacing },
          audio: false,
        });
      }

      streamRef.current = stream;
      setCameraActive(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 60);
    } catch {
      setCameraError(
        'Permission caméra refusée ou appareil photo occupé. Les boutons « Photo directe », « Vidéo directe » et « Importer fichiers » fonctionnent sans blocage.',
      );
    }
  };

  const handleFlipCamera = () => {
    const next = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(next);
    if (cameraActive) {
      void startCamera(next);
    }
  };

  const handleTakePhoto = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    const nowIso = new Date().toISOString();
    const id = `vault-${Date.now().toString(36)}`;
    const fileName = `photo_bouatrans_${Date.now().toString().slice(-6)}.jpg`;

    const item: CapturedMediaItem = {
      id,
      kind: 'photo',
      title: `Photo Caméra · ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`,
      fileName,
      mimeType: 'image/jpeg',
      sizeBytes: Math.round((dataUrl.length * 3) / 4),
      dataUrl,
      source: 'camera_photo',
      publishedToShowcase: publishPublicly,
      createdAt: nowIso,
    };

    onCaptureSaved(item, publishPublicly);
    setLastSaved(item);
  };

  const handleToggleVideoRecording = () => {
    if (!streamRef.current) return;

    if (isRecording && recorderRef.current) {
      recorderRef.current.stop();
      if (timerRef.current !== null) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setIsRecording(false);
      return;
    }

    if (typeof MediaRecorder === 'undefined') {
      setCameraError('Enregistrement vidéo MediaRecorder non supporté sur ce navigateur.');
      return;
    }

    chunksRef.current = [];
    const preferredTypes = ['video/webm;codecs=vp9,opus', 'video/webm', 'video/mp4'];
    const supportedType = preferredTypes.find((t) => MediaRecorder.isTypeSupported(t));
    const recorder = supportedType
      ? new MediaRecorder(streamRef.current, { mimeType: supportedType })
      : new MediaRecorder(streamRef.current);

    recorder.ondataavailable = (ev) => {
      if (ev.data && ev.data.size > 0) {
        chunksRef.current.push(ev.data);
      }
    };

    recorder.onstop = () => {
      const mimeType = recorder.mimeType || 'video/webm';
      const blob = new Blob(chunksRef.current, { type: mimeType });
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result !== 'string') return;
        const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
        const item: CapturedMediaItem = {
          id: `vault-${Date.now().toString(36)}`,
          kind: 'video',
          title: `Vidéo Caméra · ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`,
          fileName: `video_bouatrans_${Date.now().toString().slice(-6)}.${ext}`,
          mimeType,
          sizeBytes: blob.size,
          dataUrl: reader.result,
          source: 'camera_video',
          publishedToShowcase: publishPublicly,
          createdAt: new Date().toISOString(),
        };
        onCaptureSaved(item, publishPublicly);
        setLastSaved(item);
      };
      reader.readAsDataURL(blob);
    };

    recorderRef.current = recorder;
    recorder.start(300);
    setRecordingSeconds(0);
    setIsRecording(true);
    timerRef.current = window.setInterval(() => {
      setRecordingSeconds((s) => s + 1);
    }, 1000);
  };

  const handleFileCaptureInput = (e: ChangeEvent<HTMLInputElement>, sourceOverride?: 'camera_photo' | 'camera_video' | 'upload') => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    for (const file of files) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result !== 'string') return;
        const isVideo = file.type.startsWith('video/') || /\.(mp4|webm|mov|ogg)$/i.test(file.name);
        const isImage = file.type.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(file.name);
        const kind: CapturedMediaItem['kind'] = isVideo ? 'video' : isImage ? 'photo' : 'document';
        const source =
          sourceOverride || (isVideo ? 'camera_video' : isImage ? 'camera_photo' : 'upload');
        const cleanTitle = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ').trim();

        const item: CapturedMediaItem = {
          id: `vault-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
          kind,
          title: cleanTitle || file.name,
          fileName: file.name,
          mimeType: file.type || (isVideo ? 'video/mp4' : isImage ? 'image/jpeg' : 'application/octet-stream'),
          sizeBytes: file.size,
          dataUrl: reader.result,
          source,
          publishedToShowcase: publishPublicly,
          createdAt: new Date().toISOString(),
        };

        onCaptureSaved(item, publishPublicly);
        setLastSaved(item);
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-base font-bold text-[#0B1F3A] dark:text-white flex items-center gap-2">
            <Camera className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            <span>Appareil Photo & Caméra Vidéo BOUA TRANS</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Toutes les photos et vidéos prises ici sont archivées automatiquement dans le Coffre Médias Administrateur.
          </p>
        </div>

        <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-200 cursor-pointer">
          <input
            type="checkbox"
            checked={publishPublicly}
            onChange={(e) => setPublishPublicly(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500"
          />
          <span>Publier aussi sur l’interface publique</span>
        </label>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center gap-2">
        {!cameraActive ? (
          <button
            type="button"
            onClick={() => void startCamera()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#0B1F3A] hover:bg-[#13325C] dark:bg-orange-600 dark:hover:bg-orange-700 text-white px-3.5 py-2 text-xs font-semibold cursor-pointer"
          >
            <Camera className="h-3.5 w-3.5" />
            <span>Activer Caméra Live</span>
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={handleTakePhoto}
              className="inline-flex items-center gap-1.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white px-3.5 py-2 text-xs font-semibold cursor-pointer"
            >
              <Camera className="h-3.5 w-3.5" />
              <span>Prendre Photo</span>
            </button>
            <button
              type="button"
              onClick={handleToggleVideoRecording}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold cursor-pointer ${
                isRecording
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-[#0B1F3A] hover:bg-[#13325C] text-white'
              }`}
            >
              {isRecording ? (
                <>
                  <Square className="h-3.5 w-3.5 fill-current" />
                  <span>Arrêter Vidéo ({formatDuration(recordingSeconds)})</span>
                </>
              ) : (
                <>
                  <Video className="h-3.5 w-3.5" />
                  <span>Enregistrer Vidéo</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleFlipCamera}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Basculer Caméra</span>
            </button>
            <button
              type="button"
              onClick={stopStream}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
            >
              <span>Fermer</span>
            </button>
          </>
        )}

        {/* Native Mobile / Device Capture & File Inputs */}
        <label className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
          <Camera className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400" />
          <span>Photo directe</span>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            onChange={(e) => handleFileCaptureInput(e, 'camera_photo')}
            className="sr-only"
          />
        </label>

        <label className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
          <Video className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400" />
          <span>Vidéo directe</span>
          <input
            type="file"
            accept="video/*"
            capture="environment"
            multiple
            onChange={(e) => handleFileCaptureInput(e, 'camera_video')}
            className="sr-only"
          />
        </label>

        <label className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
          <Upload className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
          <span>Choisir photos / vidéos</span>
          <input
            type="file"
            accept="image/*,video/*"
            multiple
            onChange={(e) => handleFileCaptureInput(e, 'upload')}
            className="sr-only"
          />
        </label>
      </div>

      {cameraError && (
        <p className="text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-lg p-3">
          {cameraError}
        </p>
      )}

      {cameraActive && (
        <div className="relative rounded-xl overflow-hidden border border-slate-300 dark:border-slate-700 bg-black">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full ${compact ? 'h-48' : 'h-64'} object-cover`}
          />
          {isRecording && (
            <div className="absolute top-3 left-3 inline-flex items-center gap-2 rounded-md bg-red-600/90 text-white px-2.5 py-1 text-xs font-mono font-bold">
              <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
              <span>REC · {formatDuration(recordingSeconds)}</span>
            </div>
          )}
        </div>
      )}

      {lastSaved && (
        <div
          role="status"
          className="rounded-lg border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/40 p-3 flex flex-wrap items-center justify-between gap-3 text-xs"
        >
          <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-200">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>
              Stocké dans le Coffre Admin : <strong className="font-mono">{lastSaved.fileName}</strong>{' '}
              ({formatFileSize(lastSaved.sizeBytes)})
              {lastSaved.publishedToShowcase ? ' · Publié sur Vitrine' : ''}
            </span>
          </div>
          <button
            type="button"
            onClick={() => triggerFileDownload(lastSaved.dataUrl, lastSaved.fileName)}
            className="inline-flex items-center gap-1 rounded-md border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-900 px-2.5 py-1 font-semibold text-emerald-800 dark:text-emerald-200 cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Télécharger</span>
          </button>
        </div>
      )}
    </div>
  );
}
