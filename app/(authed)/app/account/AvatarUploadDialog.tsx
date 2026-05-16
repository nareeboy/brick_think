'use client';

import { useCallback, useEffect, useId, useRef, useState, useTransition } from 'react';
import Cropper, { type Area } from 'react-easy-crop';

import { ModalBackdrop } from '@/components/app/ModalBackdrop';

import { updateAvatarAction } from './actions';

const ACCEPTED_MIME = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_INPUT_BYTES = 5 * 1024 * 1024; // 5 MB pre-crop ceiling.
const OUTPUT_PX = 256;

interface Props {
  open: boolean;
  currentName: string;
  onClose: () => void;
  onUploaded: (url: string) => void;
}

export function AvatarUploadDialog({ open, currentName, onClose, onUploaded }: Props) {
  const titleId = useId();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Revoke the object URL on unmount / reset to avoid leaks.
  useEffect(() => {
    return () => {
      if (imageSrc) URL.revokeObjectURL(imageSrc);
    };
  }, [imageSrc]);

  // Reset all state when the dialog closes so re-opening starts fresh.
  useEffect(() => {
    if (!open) {
      if (imageSrc) URL.revokeObjectURL(imageSrc);
      setImageSrc(null);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedAreaPixels(null);
      setError(null);
    }
  }, [open, imageSrc]);

  const onCropComplete = useCallback((_: Area, areaPixels: Area) => {
    setCroppedAreaPixels(areaPixels);
  }, []);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-picking the same file later
    if (!file) return;
    if (!ACCEPTED_MIME.includes(file.type)) {
      setError('Please choose a PNG, JPG, or WEBP image.');
      return;
    }
    if (file.size > MAX_INPUT_BYTES) {
      setError('Image must be 5 MB or smaller.');
      return;
    }
    if (imageSrc) URL.revokeObjectURL(imageSrc);
    setImageSrc(URL.createObjectURL(file));
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
  }

  function handleChooseDifferent() {
    fileInputRef.current?.click();
  }

  async function handleSave() {
    if (!imageSrc || !croppedAreaPixels) {
      setError('Pick a photo first.');
      return;
    }
    setError(null);

    let blob: Blob;
    try {
      blob = await rasterise(imageSrc, croppedAreaPixels);
    } catch (rasterErr) {
      setError(rasterErr instanceof Error ? rasterErr.message : 'Could not process image.');
      return;
    }

    const fd = new FormData();
    fd.append('avatar', blob, 'avatar.png');

    startTransition(async () => {
      const result = await updateAvatarAction(fd);
      if (result.kind === 'ok') {
        onUploaded(result.url);
        onClose();
      } else {
        setError(reasonToMessage(result.reason));
      }
    });
  }

  if (!open) return null;

  return (
    <ModalBackdrop
      onClose={pending ? () => {} : onClose}
      titleId={titleId}
      panelClassName="w-full max-w-lg"
      dataTestid="avatar-upload-dialog"
    >
      <div className="rounded-2xl bg-white p-6 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.35)]">
        <div className="flex items-start justify-between gap-4">
          <h2 id={titleId} className="text-[18px] font-semibold tracking-tight text-zinc-950">
            Update profile photo
          </h2>
          <button
            type="button"
            aria-label="Close"
            disabled={pending}
            onClick={onClose}
            className="-mr-1 -mt-1 inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-zinc-900/5 hover:text-zinc-900 disabled:opacity-40"
          >
            <CloseIcon />
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_MIME.join(',')}
          onChange={handleFileChange}
          className="hidden"
          data-testid="avatar-file-input"
        />

        {imageSrc === null ? (
          <button
            type="button"
            onClick={handleChooseDifferent}
            className="mt-6 flex h-56 w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-zinc-300 bg-[#FBF7F1] px-6 text-center transition-colors hover:border-[#c0613d]/40 hover:bg-[#c0613d]/5"
            data-testid="avatar-drop-zone"
          >
            <span className="text-[14px] text-zinc-700">
              Drag a photo here, or <span className="font-semibold text-[#c0613d]">choose a file</span>
            </span>
            <span className="text-[12px] text-zinc-500">PNG, JPG, WEBP · up to 5 MB</span>
          </button>
        ) : (
          <div className="mt-6 flex flex-col gap-4">
            <div
              className="relative h-72 w-full overflow-hidden rounded-xl bg-zinc-100"
              aria-label="Drag to reposition photo"
            >
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                minZoom={1}
                maxZoom={3}
                zoomWithScroll
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>
            <div className="flex items-center gap-3">
              <label htmlFor="avatar-zoom" className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                Zoom
              </label>
              <input
                id="avatar-zoom"
                type="range"
                min={1}
                max={3}
                step={0.01}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                aria-label="Zoom"
                className="h-1 flex-1 cursor-pointer accent-[#c0613d]"
              />
            </div>
            <button
              type="button"
              onClick={handleChooseDifferent}
              className="self-start text-[13px] font-medium text-zinc-600 underline-offset-2 hover:underline"
            >
              Choose a different photo
            </button>
          </div>
        )}

        {error ? (
          <div
            role="alert"
            className="mt-4 rounded-lg border border-zinc-900/10 bg-[#FBF7F1] px-3 py-2 text-[13px] text-zinc-800"
            data-testid="avatar-upload-error"
          >
            {error}
          </div>
        ) : null}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="inline-flex h-10 cursor-pointer items-center justify-center rounded-xl px-4 text-[13px] font-medium text-zinc-700 transition-colors hover:bg-zinc-900/5 disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={pending || imageSrc === null}
            data-testid="avatar-upload-save"
            className="inline-flex h-10 cursor-pointer items-center justify-center rounded-xl bg-[#c0613d] px-4 text-[13px] font-semibold text-white transition-colors hover:bg-[#a44f30] disabled:cursor-not-allowed disabled:bg-zinc-300"
          >
            {pending ? 'Saving…' : 'Save'}
          </button>
        </div>

        <p className="sr-only">{currentName}</p>
      </div>
    </ModalBackdrop>
  );
}

function reasonToMessage(reason: string): string {
  if (reason === 'invalid_image') return 'That image could not be used. Please try a different one.';
  if (reason.startsWith('upload_failed:')) return 'Upload failed. Please try again.';
  if (reason.startsWith('profile_update_failed:')) return 'Could not save your photo. Please try again.';
  return 'Something went wrong. Please try again.';
}

async function rasterise(imageSrc: string, area: Area): Promise<Blob> {
  const image = await loadImage(imageSrc);
  const canvas = document.createElement('canvas');
  canvas.width = OUTPUT_PX;
  canvas.height = OUTPUT_PX;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable.');
  ctx.drawImage(
    image,
    area.x,
    area.y,
    area.width,
    area.height,
    0,
    0,
    OUTPUT_PX,
    OUTPUT_PX,
  );
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Could not encode image.'));
    }, 'image/png');
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not load image.'));
    img.src = src;
  });
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
