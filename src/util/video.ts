import { spawn } from "node:child_process";
import path from "node:path";
import { logger } from "./log";
import { Response } from "express";
import axios from "axios";
import fs from "node:fs";

const VIDEO_CACHE_FILE = path.join(__dirname, "..", "video_output", "cache.json");
const VIDEO_CACHE_MAX_ENTRIES = 10;

const conversionsPromises: Map<string, {
  promise: Promise<void>
  outputFile: string
}> = new Map();

let videoCache = new Map<string, {
  filePath: string,
  expireTime: number
}>();

export async function convert(videoId: string, videoName: string, res: Response) {
  res.setHeader("Content-Type", "video/mp4");
  res.setHeader("Cache-Control", "max-age=14400")
  const cached = videoCache.get(videoId);
  if (cached && fs.existsSync(cached.filePath)) {
    logger.debug("Found cached video for with ID", videoId)
    return res.sendFile(cached.filePath);
  }
  const outputFile = path.join(__dirname, "..", "video_output", `${videoId}.mp4`);

  res.setHeader("Transfer-Encoding", "chunked");

  const inProgressConversion = conversionsPromises.get(videoId);
  if (inProgressConversion) {
    try {
      await inProgressConversion.promise;
      res.sendFile(inProgressConversion.outputFile);
    } catch (error) {
      logger.error(`Conversion failed for ${videoId}:`, error);
      res.status(500).send("Video conversion failed")
    }
    return
  }

  const baseUrl = `https://v.redd.it/${videoId}`;
  const videoUrl = `${baseUrl}/${videoName}.mp4`;
  const audioUrl = await getAudioUrl(baseUrl);
  if (!audioUrl) {
    logger.debug(`No audio stream found for video ${videoId}, passing video back directly`);
    return res.redirect(videoUrl);
  }

  const conversionPromise = startVideoConversion(videoId, outputFile, videoUrl, audioUrl);
  conversionsPromises.set(videoId, { promise: conversionPromise, outputFile });

  try {
    await conversionPromise;
    res.sendFile(outputFile);
  } catch (error) {
    logger.error(`Conversion failed for ${videoId}:`, error);
    res.status(500).send("Video conversion failed")
  }
}

export function startVideoConversion(videoId: string, outputFile: string, videoUrl: string, audioUrl: string) {
  const ffmpegArgs = [
    "-i", videoUrl,          // Video input
    "-i", audioUrl,          // Audio input
    "-c", "copy",            // Copy video and audio
    "-f", "mp4",             // Output mp4
    "-progress", "pipe:1",   // Send progress info to stdout
    "-y",                    // Overwrite output file
    outputFile
  ];
  return new Promise<void>(async (resolve, reject) => {
    await fs.promises.mkdir(path.dirname(outputFile), { recursive: true });
    const startTime = performance.now();
    const ffmpegProc = spawn("ffmpeg", ffmpegArgs);
    const ffmpegProgress = {
      initialized: false,
      duration: 0,
    };
    ffmpegProc.stderr.on("data", (data: Buffer) => {
      // console.log("STDERR: ", data.toString())
      if (!ffmpegProgress.initialized) {
        const line = data.toString();
        if (line.includes("Duration:")) {
          const durationMatch = line.match(/Duration: (\d+:\d+:\d+\.\d+)/);
          if (durationMatch && durationMatch[1]) {
            ffmpegProgress.duration = parseDuration(durationMatch[1]!);
            ffmpegProgress.initialized = true;
            logger.debug(`Video duration: ${ffmpegProgress.duration} seconds`);
          }
        }
      }
    });
    ffmpegProc.stdout.on("data", (data: Buffer) => {
      // console.log("STDOUT: ", data.toString())
      const lines = data.toString().split("\n");
      lines.forEach(line => {
        const [key, value] = line.split("=");
        if (!key || !value) return;
        if (key === "out_time_ms" && ffmpegProgress.duration > 0) {
          const outTimeMs = parseInt(value, 10);
          const progress = (outTimeMs / 1000000) / ffmpegProgress.duration * 100;
          process.stdout.write(`Progress: ${progress.toFixed(2)}%\r`);
        }
      });
    });
    ffmpegProc.on("close", async (code) => {
      const endTime = performance.now();
      conversionsPromises.delete(videoId);
      const conversionTime = Math.round(endTime - startTime) / 1000;

      if (code === 0) {
        logger.debug(`Video conversion completed successfully, took ${conversionTime}s`);
        const expireDate = new Date();
        expireDate.setDate(expireDate.getDate() + 1);
        await saveVideoToCache(videoId, outputFile, expireDate.getTime());
        resolve();
      } else {
        fs.promises.unlink(outputFile).catch(() => {});
        logger.error(`Video conversion failed with error code ${code}`);
        logger.debug("FFmpeg args:", ffmpegArgs)
        reject(new Error("FFmpeg failed to convert video"));
      }
    });
  });
}

export async function getAudioUrl(baseUrl: string) {
  const possibleAudioUrls = [
    `${baseUrl}/DASH_AUDIO_128.mp4?source=fallback`,
    `${baseUrl}/DASH_AUDIO_64.mp4?source=fallback`,
    `${baseUrl}/DASH_audio.mp4?source=fallback`,
  ];

  const results = await Promise.allSettled(
      possibleAudioUrls.map((url) => axios.head(url, { timeout: 5000 }))
  );
  for (let i = 0; i < results.length; i++) {
    const res = results[i];
    if (res?.status === "fulfilled" && res.value.status >= 200 && res.value.status < 300) return possibleAudioUrls[i]!;
  }

  return null;
}

function parseDuration(durationStr: string): number {
  const parts = durationStr.split(':').map(part => parseFloat(part));
  if (parts.length === 3) {
    return parts[0]! * 3600 + parts[1]! * 60 + parts[2]!;
  } else if (parts.length === 2) {
    return parts[0]! * 60 + parts[1]!;
  } else if (parts.length === 1) {
    return parts[0]!;
  }
  return 0;
}


async function loadCache() {
  try {
    const data = await fs.promises.readFile(VIDEO_CACHE_FILE, "utf-8");
    videoCache = new Map(Object.entries(JSON.parse(data)));
    logger.info("Video cache loaded with", videoCache.size, "entries");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      logger.info("No video cache found, starting with empty cache");
      videoCache = new Map();
    } else {
      logger.error("Error loading video cache:", error);
    }
  }
  cleanUpCache();
}

async function saveCache() {
  cleanUpCache();
  try {
    await fs.promises.mkdir(path.dirname(VIDEO_CACHE_FILE), { recursive: true });
    await fs.promises.writeFile(VIDEO_CACHE_FILE, JSON.stringify(Object.fromEntries(videoCache)), "utf-8");
    logger.info("Video cache saved with", videoCache.size, "entries");
  } catch (error) {
    logger.error("Error saving video cache:", error);
  }
}

async function saveVideoToCache(videoId: string, filePath: string, expireTime: number) {
  videoCache.set(videoId, { filePath, expireTime });
  if (videoCache.size > VIDEO_CACHE_MAX_ENTRIES) {
    // Remove oldest entry (first inserted)
    const firstKey = videoCache.keys().next().value;
    if (firstKey) {
      const firstVal = videoCache.get(firstKey)!;
      fs.promises.unlink(firstVal.filePath);
      videoCache.delete(firstKey);
    }
  }
  await saveCache();
}

async function cleanUpCache() {
  try {
    for (const video of videoCache) {
      if (Date.now() > video[1].expireTime) {
        logger.debug(`Video ${video[0]} cache expired, deleting file`);
        await fs.promises.unlink(video[1].filePath);
        videoCache.delete(video[0]);
        saveCache();
      }
    }
  } catch (error) {
    logger.error("Error cleaning up video cache:", error)
  }
}

loadCache();