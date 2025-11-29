"use client";

import { useState, useRef } from "react";
import { apiClient } from "@/lib/api-client";

type VideoUploadFieldProps = {
  value: string;
  onChange: (url: string) => void;
  label: string;
  placeholder?: string;
};

export function VideoUploadField({
  value,
  onChange,
  label,
  placeholder = "https://...",
}: VideoUploadFieldProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Проверка типа файла
    const allowedTypes = [
      "video/mp4",
      "video/webm",
      "video/ogg",
      "video/quicktime",
      "video/x-msvideo",
    ];
    if (!allowedTypes.includes(file.type)) {
      setUploadError("Выберите видео файл (MP4, WebM, OGG, MOV, AVI)");
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      const result = await apiClient.uploadVideo(file);
      onChange(result.url);
    } catch (error) {
      console.error("Failed to upload video", error);
      setUploadError(
        error instanceof Error
          ? error.message
          : "Не удалось загрузить видео",
      );
    } finally {
      setIsUploading(false);
      // Сброс input, чтобы можно было выбрать тот же файл снова
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm text-text-dark">{label}</label>
      
      {/* Превью видео, если есть */}
      {value && (
        <div className="relative w-full max-w-xs overflow-hidden rounded-xl border border-border bg-surface">
          <video
            src={value}
            controls
            className="h-40 w-full object-cover"
            onError={(e) => {
              // Если видео не загрузилось, скрываем
              const target = e.target as HTMLVideoElement;
              target.style.display = "none";
            }}
          />
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute right-2 top-2 rounded-full bg-black/60 p-1.5 text-white transition-colors hover:bg-black/80"
            title="Удалить видео"
          >
            <span className="text-xs">✕</span>
          </button>
        </div>
      )}

      {/* Скрытый input для загрузки файла */}
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      <div className="flex flex-col gap-2 sm:flex-row">
        {/* Поле для ввода URL */}
        <input
          type="url"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="flex-1 rounded-2xl border border-border bg-surface px-4 py-2 text-sm text-text-dark outline-none focus:border-brand-pink"
        />
        
        {/* Кнопка загрузки */}
        <button
          type="button"
          onClick={handleUploadClick}
          disabled={isUploading}
          className="rounded-2xl border border-brand-pink bg-white px-4 py-2 text-sm font-semibold text-brand-pink transition-colors hover:bg-brand-pink hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isUploading ? "Загрузка..." : "Загрузить файл"}
        </button>
      </div>

      {/* Сообщение об ошибке */}
      {uploadError && (
        <p className="text-xs text-brand-orange">{uploadError}</p>
      )}
      
      {/* Подсказка */}
      <p className="text-xs text-text-light">
        Введите URL видео или нажмите "Загрузить файл" для загрузки с компьютера
      </p>
    </div>
  );
}

